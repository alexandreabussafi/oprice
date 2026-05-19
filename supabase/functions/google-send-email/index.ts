import {
  assertAttachmentAuditDelivered,
  assertProposalPdfAttachment,
  createAttachmentAudit,
  normalizeEmailAttachments
} from '../_shared/emailAttachments.ts';
import {
  corsHeaders,
  createMimeMessage,
  describeCaughtError,
  fetchGoogleJson,
  getAuthedContext,
  getGoogleAccount,
  getHeader,
  jsonResponse,
  parseEmailList,
  refreshGoogleAccessToken,
  taskPayload,
  toNullableUuid,
  toPlainSnippet
} from '../_shared/google.ts';

const collectAttachmentNames = (payload: any): string[] => {
  if (!payload) return [];
  const current = payload.filename ? [String(payload.filename)] : [];
  const children = Array.isArray(payload.parts)
    ? payload.parts.flatMap((part: any) => collectAttachmentNames(part))
    : [];
  return [...current, ...children];
};

const normalizeEmailHeader = (value?: string) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeMessageId = (value?: string) => {
  const compact = normalizeEmailHeader(value);
  if (!compact) return '';
  const stripped = compact.replace(/^<+/, '').replace(/>+$/, '');
  return stripped ? `<${stripped}>` : '';
};

const appendReference = (references?: string, messageId?: string) => {
  const normalizedReferences = normalizeEmailHeader(references);
  const normalizedMessageId = normalizeMessageId(messageId);
  if (!normalizedMessageId) return normalizedReferences;
  const tokens = normalizedReferences.split(/\s+/).filter(Boolean);
  if (!tokens.includes(normalizedMessageId)) tokens.push(normalizedMessageId);
  return tokens.join(' ');
};

const extractEmail = (value: string) => {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).split(',')[0].trim().toLowerCase();
};

const fetchThreadReplyHeaders = async (input: {
  accessToken: string;
  threadId: string;
  accountEmail: string;
}) => {
  const thread = await fetchGoogleJson(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${input.threadId}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References&metadataHeaders=In-Reply-To&metadataHeaders=From`,
    { headers: { Authorization: `Bearer ${input.accessToken}` } }
  );
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  const reversed = [...messages].reverse();
  const target = reversed.find((message: any) => (
    normalizeMessageId(getHeader(message, 'Message-ID')) &&
    extractEmail(getHeader(message, 'From')) !== input.accountEmail.toLowerCase()
  )) || reversed.find((message: any) => normalizeMessageId(getHeader(message, 'Message-ID')));
  const messageId = normalizeMessageId(getHeader(target, 'Message-ID'));
  if (!messageId) throw new Error('Nao foi possivel recuperar o Message-ID da conversa no Gmail.');
  return {
    inReplyTo: messageId,
    references: appendReference(getHeader(target, 'References'), messageId)
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let emailSent = false;
  let crmRegistered = false;
  try {
    const input = await req.json();
    const context = await getAuthedContext(req, input.tenantId);
    const account = await getGoogleAccount(context.serviceClient, context.tenantId, context.user.id);
    const accessToken = await refreshGoogleAccessToken(context.serviceClient, account);
    const to = parseEmailList(input.to);
    const cc = parseEmailList(input.cc);
    const attachments = normalizeEmailAttachments(input.attachments);
    assertProposalPdfAttachment(Boolean(input.markProposalSent), attachments);
    if (to.length === 0) throw new Error('Informe pelo menos um destinatario.');
    if (!input.subject?.trim()) throw new Error('Informe o assunto do e-mail.');
    const requestedThreadId = input.gmailThreadId ? String(input.gmailThreadId) : '';
    let replyHeaders = {
      inReplyTo: normalizeMessageId(input.inReplyTo || input.emailInReplyTo),
      references: appendReference(input.references || input.emailReferences, input.inReplyTo || input.emailInReplyTo)
    };
    if (requestedThreadId && !replyHeaders.inReplyTo) {
      replyHeaders = await fetchThreadReplyHeaders({
        accessToken,
        threadId: requestedThreadId,
        accountEmail: account.google_email
      });
    }

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
          inReplyTo: replyHeaders.inReplyTo,
          references: replyHeaders.references,
          attachments
        }),
        threadId: requestedThreadId || undefined
      })
    });
    emailSent = true;

    const sentDetails = await fetchGoogleJson(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${sent.id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const sentInternetMessageId = normalizeMessageId(getHeader(sentDetails, 'Message-ID'));
    const sentInReplyTo = normalizeMessageId(getHeader(sentDetails, 'In-Reply-To')) || replyHeaders.inReplyTo;
    const sentReferences = normalizeEmailHeader(getHeader(sentDetails, 'References')) || replyHeaders.references;
    const threadWarning = requestedThreadId && sent.threadId && sent.threadId !== requestedThreadId
      ? `Gmail enviou o e-mail, mas abriu outra conversa (${sent.threadId}) em vez da thread esperada (${requestedThreadId}).`
      : null;
    const attachmentAudit = createAttachmentAudit(attachments, collectAttachmentNames(sentDetails?.payload));
    assertAttachmentAuditDelivered(Boolean(input.markProposalSent), attachmentAudit);

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
        client_id: toNullableUuid(input.clientId),
        contact_id: toNullableUuid(input.contactId),
        proposal_id: toNullableUuid(input.proposalId),
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
        client_id: toNullableUuid(input.clientId),
        contact_id: toNullableUuid(input.contactId),
        proposal_id: toNullableUuid(input.proposalId),
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
        gmail_message_id: sent.id || null,
        gmail_thread_id: sent.threadId || null,
        gmail_history_id: sent.historyId ? String(sent.historyId) : null,
        gmail_internet_message_id: sentInternetMessageId || null,
        email_in_reply_to: sentInReplyTo || null,
        email_references: sentReferences || null,
        external_url: sent.threadId ? `https://mail.google.com/mail/u/0/#inbox/${sent.threadId}` : null,
        sent_at: new Date().toISOString()
      })
      .select('*')
      .single();
    if (communicationError) throw communicationError;
    crmRegistered = true;

    return jsonResponse({ task: savedTask, communication, attachmentAudit, threadWarning });
  } catch (error) {
    const detail = describeCaughtError(error, 'Erro ao enviar e-mail.');
    const publicMessage = emailSent
      ? crmRegistered
        ? detail
        : `E-mail enviado, mas nao registrado no CRM: ${detail}`
      : detail;
    console.error('google-send-email failed', { emailSent, crmRegistered, error: detail });
    return jsonResponse({ error: publicMessage, emailSent, crmRegistered }, 400);
  }
});
