import { AttachmentAudit, MicrosoftConnectionStatus, MicrosoftEmailDraft, MicrosoftMeetingDraft, MicrosoftTodoDraft } from '../types';
import { supabase } from '../lib/supabase';
import { fromCommunicationRow, fromExternalEventRow, fromTaskRow } from './crmRepository';
import { ensureProposalPdfAttachment, ensureProviderAttachmentAudit } from './emailAttachmentValidation';
import { runSupabaseRequest } from './supabaseRequest';

const readFunctionError = async (error: any) => {
  const fallbackMessage = error?.message || 'Erro na funcao Microsoft.';
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

const invokeMicrosoftFunction = async <T>(name: string, body: Record<string, any>): Promise<T> => {
  const { data, error } = await runSupabaseRequest(
    signal => supabase.functions.invoke(name, { body, signal } as any),
    { label: `Microsoft ${name}`, resource: `functions/${name}`, tenantId: body.tenantId, timeoutMs: 15000 }
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

export const microsoftWorkspaceService = {
  async getConnectionStatus(tenantId: string): Promise<MicrosoftConnectionStatus> {
    return invokeMicrosoftFunction<MicrosoftConnectionStatus>('microsoft-connection-status', { tenantId });
  },

  async startOAuth(tenantId: string): Promise<string> {
    const redirectTo = window.location.href.split('?')[0];
    const result = await invokeMicrosoftFunction<{ authUrl: string }>('microsoft-oauth-start', { tenantId, redirectTo });
    return result.authUrl;
  },

  async disconnect(tenantId: string): Promise<void> {
    await invokeMicrosoftFunction('microsoft-disconnect', { tenantId });
  },

  async syncMail(tenantId: string): Promise<{ imported: number; tasksUpdated: number; taskErrors?: number; conversationWarnings?: number; mailboxWarnings?: number }> {
    return invokeMicrosoftFunction<{ imported: number; tasksUpdated: number; taskErrors?: number; conversationWarnings?: number; mailboxWarnings?: number }>('microsoft-sync-mail', { tenantId });
  },

  async sendEmail(draft: MicrosoftEmailDraft) {
    ensureProposalPdfAttachment(draft);
    const result = await invokeMicrosoftFunction<any>('microsoft-send-email', draft);
    const attachmentAudit = result.attachmentAudit as AttachmentAudit | undefined;
    ensureProviderAttachmentAudit(draft, attachmentAudit);
    return {
      task: fromTaskRow(result.task),
      communication: fromCommunicationRow(result.communication),
      todoTask: result.todoTask ? fromTaskRow(result.todoTask) : undefined,
      externalTask: result.externalTask,
      todoError: result.todoError,
      attachmentAudit
    };
  },

  async createCalendarEvent(draft: MicrosoftMeetingDraft) {
    const result = await invokeMicrosoftFunction<any>('microsoft-create-calendar-event', draft);
    return {
      task: fromTaskRow(result.task),
      externalEvent: fromExternalEventRow(result.externalEvent)
    };
  },

  async createTodoTask(draft: MicrosoftTodoDraft) {
    const result = await invokeMicrosoftFunction<any>('microsoft-create-todo-task', draft);
    return {
      task: fromTaskRow(result.task),
      externalTask: result.externalTask,
      todoError: result.todoError
    };
  }
};
