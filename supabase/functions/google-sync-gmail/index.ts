import {
  corsHeaders,
  fetchGoogleJson,
  getAuthedContext,
  getHeader,
  getServiceClient,
  jsonResponse,
  refreshGoogleAccessToken,
  toPlainSnippet
} from '../_shared/google.ts';

const extractEmail = (value: string) => {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).split(',')[0].trim().toLowerCase();
};

const syncAccount = async (serviceClient: ReturnType<typeof getServiceClient>, account: any) => {
  const accessToken = await refreshGoogleAccessToken(serviceClient, account);
  const { data: threadRows, error: threadError } = await serviceClient
    .from('crm_communications')
    .select('tenant_id, client_id, contact_id, proposal_id, task_id, gmail_thread_id')
    .eq('tenant_id', account.tenant_id)
    .not('gmail_thread_id', 'is', null);
  if (threadError) throw threadError;

  const uniqueThreads = Array.from(new Set((threadRows || []).map((row: any) => row.gmail_thread_id).filter(Boolean)));
  let imported = 0;

  for (const threadId of uniqueThreads) {
    const anchor = threadRows.find((row: any) => row.gmail_thread_id === threadId);
    const thread = await fetchGoogleJson(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    for (const message of thread.messages || []) {
      const fromEmail = extractEmail(getHeader(message, 'From'));
      if (!message.id || fromEmail === account.google_email.toLowerCase()) continue;

      const { data: existing, error: existingError } = await serviceClient
        .from('crm_communications')
        .select('id')
        .eq('tenant_id', account.tenant_id)
        .eq('gmail_message_id', message.id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) continue;

      const toHeader = getHeader(message, 'To');
      const ccHeader = getHeader(message, 'Cc');
      const receivedAt = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString();
      const { error: insertError } = await serviceClient
        .from('crm_communications')
        .insert({
          tenant_id: account.tenant_id,
          client_id: anchor?.client_id || null,
          contact_id: anchor?.contact_id || null,
          proposal_id: anchor?.proposal_id || null,
          task_id: anchor?.task_id || null,
          user_id: account.user_id,
          provider: 'google',
          channel: 'email',
          direction: 'inbound',
          subject: getHeader(message, 'Subject') || '(sem assunto)',
          body_preview: toPlainSnippet(message.snippet),
          from_email: fromEmail,
          to_emails: toHeader ? [toHeader] : [],
          cc_emails: ccHeader ? [ccHeader] : [],
          gmail_message_id: message.id,
          gmail_thread_id: message.threadId,
          gmail_history_id: message.historyId,
          external_url: message.threadId ? `https://mail.google.com/mail/u/0/#inbox/${message.threadId}` : null,
          received_at: receivedAt
        });
      if (insertError) throw insertError;
      imported += 1;
    }
  }

  await serviceClient
    .from('crm_google_accounts')
    .update({ last_synced_at: new Date().toISOString(), error_message: null, status: 'CONNECTED', updated_at: new Date().toISOString() })
    .eq('id', account.id);

  return imported;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const serviceClient = getServiceClient();
    let accounts: any[] = [];
    const cronSecret = Deno.env.get('GOOGLE_SYNC_CRON_SECRET');
    const isCron = Boolean(cronSecret && req.headers.get('x-cron-secret') === cronSecret);

    if (isCron) {
      const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
      let query = serviceClient.from('crm_google_accounts').select('*').eq('status', 'CONNECTED').eq('sync_enabled', true);
      if (body.tenantId) query = query.eq('tenant_id', body.tenantId);
      const { data, error } = await query;
      if (error) throw error;
      accounts = data || [];
    } else {
      const body = await req.json();
      const context = await getAuthedContext(req, body.tenantId);
      const { data, error } = await serviceClient
        .from('crm_google_accounts')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .eq('user_id', context.user.id)
        .eq('status', 'CONNECTED');
      if (error) throw error;
      accounts = data || [];
    }

    let imported = 0;
    for (const account of accounts) {
      try {
        imported += await syncAccount(serviceClient, account);
      } catch (error) {
        await serviceClient
          .from('crm_google_accounts')
          .update({
            status: 'ERROR',
            error_message: error instanceof Error ? error.message : 'Erro ao sincronizar Gmail.',
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);
      }
    }

    return jsonResponse({ ok: true, accounts: accounts.length, imported });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao sincronizar Gmail.' }, 400);
  }
});
