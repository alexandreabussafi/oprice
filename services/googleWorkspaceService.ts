import { AttachmentAudit, GoogleConnectionStatus, GoogleEmailDraft, GoogleMeetingDraft } from '../types';
import { supabase } from '../lib/supabase';
import { fromCommunicationRow, fromExternalEventRow, fromTaskRow } from './crmRepository';
import { ensureProposalPdfAttachment, ensureProviderAttachmentAudit } from './emailAttachmentValidation';
import { getPersistenceErrorMessage, runSupabaseRequest } from './supabaseRequest';

const readFunctionError = async (error: any) => {
  const fallbackMessage = getPersistenceErrorMessage(error, 'Erro na funcao Google.');
  const response = error?.context;
  if (!response) return { message: fallbackMessage };

  try {
    const body = typeof response.clone === 'function'
      ? await response.clone().json()
      : typeof response.json === 'function'
        ? await response.json()
        : null;
    return {
      message: body?.error || fallbackMessage,
      emailSent: Boolean(body?.emailSent),
      crmRegistered: Boolean(body?.crmRegistered)
    };
  } catch (_) {
    return { message: fallbackMessage };
  }
};

const invokeGoogleFunction = async <T>(name: string, body: Record<string, any>): Promise<T> => {
  const { data, error } = await runSupabaseRequest(
    signal => supabase.functions.invoke(name, { body, signal } as any),
    { label: `Google ${name}`, resource: `functions/${name}`, tenantId: body.tenantId, timeoutMs: 15000 }
  );
  if (error) {
    const details = await readFunctionError(error);
    const enhanced = new Error(details.message);
    (enhanced as any).emailSent = details.emailSent;
    (enhanced as any).crmRegistered = details.crmRegistered;
    throw enhanced;
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
};

export const googleWorkspaceService = {
  async getConnectionStatus(tenantId: string): Promise<GoogleConnectionStatus> {
    return invokeGoogleFunction<GoogleConnectionStatus>('google-connection-status', { tenantId });
  },

  async startOAuth(tenantId: string): Promise<string> {
    const redirectTo = window.location.href.split('?')[0];
    const result = await invokeGoogleFunction<{ authUrl: string }>('google-oauth-start', { tenantId, redirectTo });
    return result.authUrl;
  },

  async disconnect(tenantId: string): Promise<void> {
    await invokeGoogleFunction('google-disconnect', { tenantId });
  },

  async syncGmail(tenantId: string): Promise<{ imported: number }> {
    return invokeGoogleFunction<{ imported: number }>('google-sync-gmail', { tenantId });
  },

  async sendEmail(draft: GoogleEmailDraft) {
    ensureProposalPdfAttachment(draft);
    const result = await invokeGoogleFunction<any>('google-send-email', draft);
    const attachmentAudit = result.attachmentAudit as AttachmentAudit | undefined;
    ensureProviderAttachmentAudit(draft, attachmentAudit);
    return {
      task: fromTaskRow(result.task),
      communication: fromCommunicationRow(result.communication),
      attachmentAudit,
      threadWarning: result.threadWarning as string | null | undefined
    };
  },

  async createCalendarEvent(draft: GoogleMeetingDraft) {
    const result = await invokeGoogleFunction<any>('google-create-calendar-event', draft);
    return {
      task: fromTaskRow(result.task),
      externalEvent: fromExternalEventRow(result.externalEvent)
    };
  }
};
