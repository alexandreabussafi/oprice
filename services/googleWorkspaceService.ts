import { GoogleConnectionStatus, GoogleEmailDraft, GoogleMeetingDraft } from '../types';
import { supabase } from '../lib/supabase';
import { fromCommunicationRow, fromExternalEventRow, fromTaskRow } from './crmRepository';

const invokeGoogleFunction = async <T>(name: string, body: Record<string, any>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
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
    const result = await invokeGoogleFunction<any>('google-send-email', draft);
    return {
      task: fromTaskRow(result.task),
      communication: fromCommunicationRow(result.communication)
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
