import {
  assertAttachmentAuditDelivered,
  assertProposalPdfAttachment,
  createAttachmentAudit,
  normalizeEmailAttachments
} from '../_shared/emailAttachments.ts';
import {
  corsHeaders,
  describeCaughtError,
  fetchMicrosoftJson,
  getAuthedContext,
  getMicrosoftAccount,
  jsonResponse,
  parseEmailList,
  refreshMicrosoftAccessToken,
  taskPayload,
  toNullableUuid,
  toPlainSnippet
} from '../_shared/microsoft.ts';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const addDaysDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const findRecentSentMessage = async (accessToken: string, subject: string, sentAfter?: string) => {
  const url = 'https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?$top=10&$orderby=sentDateTime desc&$select=id,conversationId,internetMessageId,sentDateTime,subject,webLink,hasAttachments';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const sentMessage = await fetchMicrosoftJson(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const message = (sentMessage?.value || []).find((item: any) => {
        if (item.subject !== subject) return false;
        if (!sentAfter || !item.sentDateTime) return true;
        return new Date(item.sentDateTime).getTime() >= new Date(sentAfter).getTime();
      }) || null;
      if (message?.conversationId || message?.id) return message;
    } catch (_) {
      // Sent Items indexing may lag immediately after /sendMail.
    }
    await wait(450);
  }
  return null;
};

const createMicrosoftDraftMessage = async (
  accessToken: string,
  input: any,
  to: string[],
  cc: string[]
) => fetchMicrosoftJson('https://graph.microsoft.com/v1.0/me/messages', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subject: input.subject,
    body: {
      contentType: 'Text',
      content: input.bodyText || ''
    },
    toRecipients: to.map(email => ({ emailAddress: { address: email } })),
    ccRecipients: cc.map(email => ({ emailAddress: { address: email } }))
  })
});

const addMicrosoftDraftAttachment = async (
  accessToken: string,
  messageId: string,
  attachment: { fileName: string; contentType: string; base64Content: string }
) => fetchMicrosoftJson(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/attachments`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    '@odata.type': '#microsoft.graph.fileAttachment',
    name: attachment.fileName,
    contentType: attachment.contentType || 'application/octet-stream',
    contentBytes: attachment.base64Content
  })
});

const listMicrosoftDraftAttachmentNames = async (accessToken: string, messageId: string) => {
  const result = await fetchMicrosoftJson(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/attachments?$select=id,name`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return (result?.value || []).map((attachment: any) => String(attachment.name || '')).filter(Boolean);
};

const sendMicrosoftDraftMessage = async (accessToken: string, messageId: string) => fetchMicrosoftJson(
  `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/send`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  }
);

const createMicrosoftTodoFollowUp = async (input: {
  accessToken: string;
  serviceClient: any;
  tenantId: string;
  userId: string;
  userEmail?: string;
  clientId?: string;
  contactId?: string;
  proposalId?: string;
  title: string;
  description: string;
  dueDate: string;
}) => {
  const taskId = crypto.randomUUID();
  const task = taskPayload({
    id: taskId,
    tenantId: input.tenantId,
    clientId: input.clientId,
    contactId: input.contactId,
    proposalId: input.proposalId,
    assignee: input.userEmail,
    title: input.title,
    description: toPlainSnippet(input.description),
    type: 'Follow-up',
    status: 'To Do',
    dueDate: input.dueDate
  });

  const { data: savedTask, error: taskError } = await input.serviceClient
    .from('crm_tasks')
    .insert({
      id: taskId,
      tenant_id: input.tenantId,
      client_id: toNullableUuid(input.clientId),
      contact_id: toNullableUuid(input.contactId),
      proposal_id: toNullableUuid(input.proposalId),
      payload: task,
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single();
  if (taskError) throw taskError;

  try {
    const lists = await fetchMicrosoftJson('https://graph.microsoft.com/v1.0/me/todo/lists', {
      headers: { Authorization: `Bearer ${input.accessToken}` }
    });
    const list = lists.value?.find((item: any) => item.wellknownListName === 'defaultList') || lists.value?.[0];
    if (!list?.id) throw new Error('Nao foi possivel localizar uma lista do Microsoft To Do.');

    const todoTask = await fetchMicrosoftJson(`https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: input.title,
        body: {
          content: input.description,
          contentType: 'text'
        },
        dueDateTime: {
          dateTime: `${input.dueDate}T17:00:00`,
          timeZone: 'UTC'
        }
      })
    });

    const { data: externalTask, error: externalTaskError } = await input.serviceClient
      .from('crm_external_tasks')
      .insert({
        tenant_id: input.tenantId,
        task_id: taskId,
        user_id: input.userId,
        provider: 'microsoft',
        external_task_id: todoTask.id,
        external_task_list_id: list.id,
        title: input.title,
        due_date: input.dueDate,
        sync_status: 'CREATED'
      })
      .select('*')
      .single();
    if (externalTaskError) throw externalTaskError;

    return { todoTask: savedTask, externalTask };
  } catch (todoError) {
    const detail = describeCaughtError(todoError, 'Erro ao criar tarefa no Microsoft To Do.');
    console.error('microsoft-send-email todo sync failed', { taskId, error: detail });
    return {
      todoTask: savedTask,
      externalTask: null,
      todoError: `Atividade de follow-up criada no CRM, mas nao sincronizada com Microsoft To Do: ${detail}`
    };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let emailSent = false;
  let crmRegistered = false;
  try {
    const input = await req.json();
    const context = await getAuthedContext(req, input.tenantId);
    const account = await getMicrosoftAccount(context.serviceClient, context.tenantId, context.user.id);
    const accessToken = await refreshMicrosoftAccessToken(context.serviceClient, account);
    const to = parseEmailList(input.to);
    const cc = parseEmailList(input.cc);
    const attachments = normalizeEmailAttachments(input.attachments);
    assertProposalPdfAttachment(Boolean(input.markProposalSent), attachments);
    if (to.length === 0) throw new Error('Informe pelo menos um destinatario.');
    if (!input.subject?.trim()) throw new Error('Informe o assunto do e-mail.');

    let attachmentAudit = createAttachmentAudit(attachments);
    const sentAfter = new Date(Date.now() - 2000).toISOString();
    if (attachments.length > 0) {
      const draftMessage = await createMicrosoftDraftMessage(accessToken, input, to, cc);
      if (!draftMessage?.id) throw new Error('Nao foi possivel criar o rascunho do e-mail no Outlook.');
      for (const attachment of attachments) {
        await addMicrosoftDraftAttachment(accessToken, draftMessage.id, attachment);
      }
      attachmentAudit = createAttachmentAudit(
        attachments,
        await listMicrosoftDraftAttachmentNames(accessToken, draftMessage.id)
      );
      assertAttachmentAuditDelivered(Boolean(input.markProposalSent), attachmentAudit);
      await sendMicrosoftDraftMessage(accessToken, draftMessage.id);
    } else {
      await fetchMicrosoftJson('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            subject: input.subject,
            body: {
              contentType: 'Text',
              content: input.bodyText || ''
            },
            toRecipients: to.map(email => ({ emailAddress: { address: email } })),
            ccRecipients: cc.map(email => ({ emailAddress: { address: email } }))
          },
          saveToSentItems: true
        })
      });
    }
    emailSent = true;

    const message = await findRecentSentMessage(accessToken, input.subject, sentAfter);
    if (attachments.length > 0 && message?.hasAttachments === false) {
      throw new Error('O Outlook enviou a mensagem, mas o item enviado nao confirma anexos.');
    }

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
        provider: 'microsoft',
        channel: 'email',
        direction: 'outbound',
        subject: input.subject,
        body_preview: toPlainSnippet(input.bodyText),
        from_email: account.microsoft_email,
        to_emails: to,
        cc_emails: cc,
        microsoft_message_id: message?.id || null,
        microsoft_conversation_id: message?.conversationId || input.microsoftConversationId || null,
        microsoft_internet_message_id: message?.internetMessageId || null,
        external_url: message?.webLink || null,
        source_mailbox_email: account.microsoft_email,
        source_mailbox_label: account.microsoft_email,
        source_mailbox_kind: 'personal',
        sent_at: message?.sentDateTime || new Date().toISOString()
      })
      .select('*')
      .single();
    if (communicationError) throw communicationError;
    crmRegistered = true;

    let todoResult: { todoTask: any; externalTask: any; todoError?: string } | null = null;
    if (input.createMicrosoftTodo) {
      const toEmails = to.join(', ');
      const dueDate = input.todoDueDate || addDaysDate(2);
      todoResult = await createMicrosoftTodoFollowUp({
        accessToken,
        serviceClient: context.serviceClient,
        tenantId: context.tenantId,
        userId: context.user.id,
        userEmail: context.user.email,
        clientId: input.clientId,
        contactId: input.contactId,
        proposalId: input.proposalId,
        title: input.todoTitle || `Acompanhar retorno: ${input.subject}`,
        description: input.todoDescription || `Follow-up do e-mail enviado pelo Outlook.\n\nAssunto: ${input.subject}\nPara: ${toEmails}\n\n${toPlainSnippet(input.bodyText)}`,
        dueDate
      });
    }

    return jsonResponse({ task: savedTask, communication, attachmentAudit, ...(todoResult || {}) });
  } catch (error) {
    const detail = describeCaughtError(error, 'Erro ao enviar e-mail Microsoft.');
    const publicMessage = emailSent
      ? crmRegistered
        ? `E-mail registrado, mas nao foi possivel criar a tarefa no Microsoft To Do: ${detail}`
        : `E-mail enviado, mas nao registrado no CRM: ${detail}`
      : detail;
    console.error('microsoft-send-email failed', { emailSent, crmRegistered, error: detail });
    return jsonResponse({ error: publicMessage, emailSent, crmRegistered }, 400);
  }
});
