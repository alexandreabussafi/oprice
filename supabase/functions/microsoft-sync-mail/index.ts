import {
  corsHeaders,
  describeCaughtError,
  fetchMicrosoftJson,
  getAuthedContext,
  getMicrosoftAccount,
  jsonResponse,
  refreshMicrosoftAccessToken,
  toNullableUuid,
  toPlainSnippet
} from '../_shared/microsoft.ts';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const initialDeltaUrl = (folder: 'inbox' | 'sentitems') =>
  `${GRAPH_BASE}/me/mailFolders/${folder}/messages/delta?$select=id,conversationId,internetMessageId,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,webLink`;

const isExpiredDeltaError = (error: unknown) =>
  describeCaughtError(error, '').toLowerCase().match(/syncstatenotfound|invaliddeltatoken|delta.*expired|resync/);

const odataString = (value: string) => value.replace(/'/g, "''");

const buildMessageRow = (input: {
  message: any;
  linked: any;
  accountEmail: string;
  tenantId: string;
  userId: string;
}) => {
  const fromEmail = input.message.from?.emailAddress?.address || '';
  const direction = fromEmail.toLowerCase() === input.accountEmail.toLowerCase() ? 'outbound' : 'inbound';
  const toEmails = (input.message.toRecipients || [])
    .map((recipient: any) => recipient.emailAddress?.address)
    .filter(Boolean);
  const ccEmails = (input.message.ccRecipients || [])
    .map((recipient: any) => recipient.emailAddress?.address)
    .filter(Boolean);

  return {
    tenant_id: input.tenantId,
    client_id: toNullableUuid(input.linked.client_id),
    contact_id: toNullableUuid(input.linked.contact_id),
    proposal_id: toNullableUuid(input.linked.proposal_id),
    task_id: toNullableUuid(input.linked.task_id),
    user_id: input.userId,
    provider: 'microsoft',
    channel: 'email',
    direction,
    subject: input.message.subject || null,
    body_preview: toPlainSnippet(input.message.bodyPreview),
    from_email: fromEmail || null,
    to_emails: toEmails,
    cc_emails: ccEmails,
    microsoft_message_id: input.message.id,
    microsoft_conversation_id: input.message.conversationId,
    microsoft_internet_message_id: input.message.internetMessageId || null,
    external_url: input.message.webLink || null,
    sent_at: input.message.sentDateTime || null,
    received_at: input.message.receivedDateTime || null
  };
};

const insertMessageCommunication = async (input: {
  message: any;
  accountEmail: string;
  tenantId: string;
  userId: string;
  serviceClient: any;
  linksByConversation: Map<string, any>;
}) => {
  if (!input.message.id || !input.message.conversationId) return 0;
  const linked = input.linksByConversation.get(input.message.conversationId);
  if (!linked) return 0;

  const { error } = await input.serviceClient
    .from('crm_communications')
    .insert(buildMessageRow({
      message: input.message,
      linked,
      accountEmail: input.accountEmail,
      tenantId: input.tenantId,
      userId: input.userId
    }));

  if (!error) return 1;
  if (error.code === '23505') return 0;
  throw error;
};

const syncFolder = async (input: {
  folder: 'inbox' | 'sentitems';
  deltaLink?: string | null;
  accessToken: string;
  knownConversations: Set<string>;
  accountEmail: string;
  tenantId: string;
  userId: string;
  serviceClient: any;
  linksByConversation: Map<string, any>;
}) => {
  let url = input.deltaLink || initialDeltaUrl(input.folder);
  let imported = 0;
  let deltaLink = input.deltaLink || null;
  let resetDelta = false;

  for (let page = 0; page < 10 && url; page += 1) {
    let data: any;
    try {
      data = await fetchMicrosoftJson(url, {
        headers: { Authorization: `Bearer ${input.accessToken}` }
      });
    } catch (error) {
      if (input.deltaLink && !resetDelta && isExpiredDeltaError(error)) {
        resetDelta = true;
        deltaLink = null;
        url = initialDeltaUrl(input.folder);
        page = -1;
        continue;
      }
      throw new Error(`Falha ao sincronizar ${input.folder}: ${describeCaughtError(error, 'Erro na API Microsoft.')}`);
    }

    for (const message of data.value || []) {
      if (!message.id || !message.conversationId || !input.knownConversations.has(message.conversationId)) continue;
      imported += await insertMessageCommunication({
        message,
        accountEmail: input.accountEmail,
        tenantId: input.tenantId,
        userId: input.userId,
        serviceClient: input.serviceClient,
        linksByConversation: input.linksByConversation
      });
    }
    deltaLink = data['@odata.deltaLink'] || deltaLink;
    url = data['@odata.nextLink'] || null;
  }

  return { imported, deltaLink };
};

const syncKnownConversationMessages = async (input: {
  accessToken: string;
  knownConversations: Set<string>;
  accountEmail: string;
  tenantId: string;
  userId: string;
  serviceClient: any;
  linksByConversation: Map<string, any>;
}) => {
  let imported = 0;
  let warnings = 0;

  for (const conversationId of input.knownConversations) {
    const params = new URLSearchParams({
      '$top': '25',
      '$select': 'id,conversationId,internetMessageId,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,webLink',
      '$filter': `conversationId eq '${odataString(conversationId)}'`
    });
    let url: string | null = `${GRAPH_BASE}/me/messages?${params.toString()}`;

    for (let page = 0; page < 3 && url; page += 1) {
      try {
        const data = await fetchMicrosoftJson(url, {
          headers: { Authorization: `Bearer ${input.accessToken}` }
        });
        for (const message of data.value || []) {
          imported += await insertMessageCommunication({
            message,
            accountEmail: input.accountEmail,
            tenantId: input.tenantId,
            userId: input.userId,
            serviceClient: input.serviceClient,
            linksByConversation: input.linksByConversation
          });
        }
        url = data['@odata.nextLink'] || null;
      } catch (error) {
        warnings += 1;
        console.error('microsoft-sync-mail conversation fetch failed', {
          conversationId,
          error: describeCaughtError(error, 'Erro ao buscar conversa no Outlook.')
        });
        break;
      }
    }
  }

  return { imported, warnings };
};

const syncMicrosoftTodoTasks = async (input: {
  accessToken: string;
  tenantId: string;
  userId: string;
  serviceClient: any;
}) => {
  const { data: externalTasks, error } = await input.serviceClient
    .from('crm_external_tasks')
    .select('id, task_id, external_task_id, external_task_list_id, sync_status')
    .eq('tenant_id', input.tenantId)
    .eq('provider', 'microsoft')
    .eq('user_id', input.userId)
    .neq('sync_status', 'CANCELLED')
    .limit(100);
  if (error) throw error;

  let tasksUpdated = 0;
  let taskErrors = 0;

  for (const externalTask of externalTasks || []) {
    if (!externalTask.task_id || !externalTask.external_task_id || !externalTask.external_task_list_id) continue;

    try {
      const todoTask = await fetchMicrosoftJson(
        `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(externalTask.external_task_list_id)}/tasks/${encodeURIComponent(externalTask.external_task_id)}?$select=id,status,title,lastModifiedDateTime,completedDateTime`,
        { headers: { Authorization: `Bearer ${input.accessToken}` } }
      );

      if (todoTask.status === 'completed') {
        const { data: crmTask, error: taskError } = await input.serviceClient
          .from('crm_tasks')
          .select('id, payload')
          .eq('tenant_id', input.tenantId)
          .eq('id', externalTask.task_id)
          .maybeSingle();
        if (taskError) throw taskError;
        if (!crmTask) throw new Error('Tarefa local vinculada ao Microsoft To Do nao foi encontrada.');

        if (crmTask.payload?.status !== 'Done') {
          const payload = { ...(crmTask.payload || {}), status: 'Done' };
          const { error: updateTaskError } = await input.serviceClient
            .from('crm_tasks')
            .update({ payload, updated_at: new Date().toISOString() })
            .eq('tenant_id', input.tenantId)
            .eq('id', externalTask.task_id);
          if (updateTaskError) throw updateTaskError;
          tasksUpdated += 1;
        }
      }

      await input.serviceClient
        .from('crm_external_tasks')
        .update({ sync_status: 'SYNCED', error_message: null, updated_at: new Date().toISOString() })
        .eq('tenant_id', input.tenantId)
        .eq('id', externalTask.id);
    } catch (error) {
      taskErrors += 1;
      const detail = describeCaughtError(error, 'Erro ao sincronizar tarefa Microsoft To Do.');
      console.error('microsoft-sync-mail todo sync failed', { externalTaskId: externalTask.id, error: detail });
      await input.serviceClient
        .from('crm_external_tasks')
        .update({ sync_status: 'ERROR', error_message: detail, updated_at: new Date().toISOString() })
        .eq('tenant_id', input.tenantId)
        .eq('id', externalTask.id);
    }
  }

  return { tasksUpdated, taskErrors };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { tenantId } = await req.json();
    const context = await getAuthedContext(req, tenantId);
    const account = await getMicrosoftAccount(context.serviceClient, context.tenantId, context.user.id);
    const accessToken = await refreshMicrosoftAccessToken(context.serviceClient, account);

    const { data: conversations, error: conversationsError } = await context.serviceClient
      .from('crm_communications')
      .select('microsoft_conversation_id, client_id, contact_id, proposal_id, task_id')
      .eq('tenant_id', context.tenantId)
      .eq('provider', 'microsoft')
      .not('microsoft_conversation_id', 'is', null);
    if (conversationsError) throw conversationsError;

    const linksByConversation = new Map<string, any>();
    for (const row of conversations || []) {
      if (row.microsoft_conversation_id && !linksByConversation.has(row.microsoft_conversation_id)) {
        linksByConversation.set(row.microsoft_conversation_id, row);
      }
    }
    const knownConversations = new Set(linksByConversation.keys());
    if (knownConversations.size === 0) {
      const todo = await syncMicrosoftTodoTasks({
        accessToken,
        tenantId: context.tenantId,
        userId: context.user.id,
        serviceClient: context.serviceClient
      });
      await context.serviceClient
        .from('crm_microsoft_accounts')
        .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', account.id);
      return jsonResponse({ imported: 0, tasksUpdated: todo.tasksUpdated, taskErrors: todo.taskErrors, conversationWarnings: 0 });
    }

    const direct = await syncKnownConversationMessages({
      accessToken,
      knownConversations,
      accountEmail: account.microsoft_email,
      tenantId: context.tenantId,
      userId: context.user.id,
      serviceClient: context.serviceClient,
      linksByConversation
    });

    const inbox = await syncFolder({
      folder: 'inbox',
      deltaLink: account.inbox_delta_link,
      accessToken,
      knownConversations,
      accountEmail: account.microsoft_email,
      tenantId: context.tenantId,
      userId: context.user.id,
      serviceClient: context.serviceClient,
      linksByConversation
    });
    const sent = await syncFolder({
      folder: 'sentitems',
      deltaLink: account.sent_delta_link,
      accessToken,
      knownConversations,
      accountEmail: account.microsoft_email,
      tenantId: context.tenantId,
      userId: context.user.id,
      serviceClient: context.serviceClient,
      linksByConversation
    });

    const todo = await syncMicrosoftTodoTasks({
      accessToken,
      tenantId: context.tenantId,
      userId: context.user.id,
      serviceClient: context.serviceClient
    });

    await context.serviceClient
      .from('crm_microsoft_accounts')
      .update({
        inbox_delta_link: inbox.deltaLink,
        sent_delta_link: sent.deltaLink,
        last_synced_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    return jsonResponse({
      imported: direct.imported + inbox.imported + sent.imported,
      tasksUpdated: todo.tasksUpdated,
      taskErrors: todo.taskErrors,
      conversationWarnings: direct.warnings
    });
  } catch (error) {
    const detail = describeCaughtError(error, 'Erro ao sincronizar Outlook.');
    console.error('microsoft-sync-mail failed', { error: detail });
    return jsonResponse({ error: detail }, 400);
  }
});
