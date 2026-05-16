import {
  corsHeaders,
  createMimeMessage,
  fetchGoogleJson,
  getAuthedContext,
  getGoogleAccount,
  jsonResponse,
  parseEmailList,
  refreshGoogleAccessToken,
  taskPayload,
  toPlainSnippet
} from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const input = await req.json();
    const context = await getAuthedContext(req, input.tenantId);
    const account = await getGoogleAccount(context.serviceClient, context.tenantId, context.user.id);
    const accessToken = await refreshGoogleAccessToken(context.serviceClient, account);
    const to = parseEmailList(input.to);
    const cc = parseEmailList(input.cc);
    if (to.length === 0) throw new Error('Informe pelo menos um destinatario.');
    if (!input.subject?.trim()) throw new Error('Informe o assunto do e-mail.');

    const sent = await fetchGoogleJson('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: createMimeMessage({
          from: account.google_email,
          to,
          cc,
          subject: input.subject,
          bodyText: input.bodyText || '',
          inReplyTo: input.inReplyTo,
          attachments: Array.isArray(input.attachments) ? input.attachments : []
        }),
        threadId: input.gmailThreadId || undefined
      })
    });

    const taskId = crypto.randomUUID();
    const dueDate = new Date().toISOString().slice(0, 10);
    const task = taskPayload({
      id: taskId,
      tenantId: context.tenantId,
      clientId: input.clientId,
      contactId: input.contactId,
      proposalId: input.proposalId,
      assignee: context.user.email,
      title: `E-mail enviado: ${input.subject}`,
      description: toPlainSnippet(input.bodyText),
      type: 'Email',
      status: 'Done',
      dueDate
    });

    const { data: savedTask, error: taskError } = await context.serviceClient
      .from('crm_tasks')
      .insert({
        id: taskId,
        tenant_id: context.tenantId,
        client_id: input.clientId || null,
        contact_id: input.contactId || null,
        proposal_id: input.proposalId || null,
        payload: task,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
    if (taskError) throw taskError;

    const { data: communication, error: communicationError } = await context.serviceClient
      .from('crm_communications')
      .insert({
        tenant_id: context.tenantId,
        client_id: input.clientId || null,
        contact_id: input.contactId || null,
        proposal_id: input.proposalId || null,
        task_id: taskId,
        user_id: context.user.id,
        provider: 'google',
        channel: 'email',
        direction: 'outbound',
        subject: input.subject,
        body_preview: toPlainSnippet(input.bodyText),
        from_email: account.google_email,
        to_emails: to,
        cc_emails: cc,
        gmail_message_id: sent.id,
        gmail_thread_id: sent.threadId,
        gmail_history_id: sent.historyId,
        external_url: sent.threadId ? `https://mail.google.com/mail/u/0/#inbox/${sent.threadId}` : null,
        sent_at: new Date().toISOString()
      })
      .select('*')
      .single();
    if (communicationError) throw communicationError;

    return jsonResponse({ task: savedTask, communication });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao enviar e-mail.' }, 400);
  }
});
