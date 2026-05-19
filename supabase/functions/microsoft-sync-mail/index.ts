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
const MESSAGE_SELECT = 'id,conversationId,internetMessageId,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,webLink';

type SyncMailbox = {
  key: string;
  email: string;
  label: string;
  kind: 'personal' | 'shared';
  intakeMode?: 'filtered';
  intakeStartAt?: string | null;
  filters?: InboxFilterConfig;
};

type InboxFilterConfig = {
  ignoreNoReply?: boolean;
  ignoreAutoReplies?: boolean;
  ignoreNewsletters?: boolean;
  ignoredDomains?: string[];
  ignoredSenders?: string[];
  subjectExcludes?: string[];
  allowedDomains?: string[];
};

const DEFAULT_INBOX_FILTERS: InboxFilterConfig = {
  ignoreNoReply: true,
  ignoreAutoReplies: true,
  ignoreNewsletters: true,
  ignoredDomains: [],
  ignoredSenders: [],
  subjectExcludes: [],
  allowedDomains: []
};

const mailboxBaseUrl = (mailbox: SyncMailbox) =>
  mailbox.kind === 'personal' ? `${GRAPH_BASE}/me` : `${GRAPH_BASE}/users/${encodeURIComponent(mailbox.email)}`;

const initialDeltaUrl = (folder: 'inbox' | 'sentitems', mailbox: SyncMailbox) =>
  `${mailboxBaseUrl(mailbox)}/mailFolders/${folder}/messages/delta?$select=${MESSAGE_SELECT}`;

const hasScope = (account: any, scope: string) =>
  (account.scopes || []).some((item: string) => item.toLowerCase() === scope.toLowerCase());

const normalizeStringList = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map(item => String(item || '').trim())
    .filter(Boolean);

const normalizeInboxFilters = (filters: any): InboxFilterConfig => ({
  ...DEFAULT_INBOX_FILTERS,
  ...(filters || {}),
  ignoredDomains: normalizeStringList(filters?.ignoredDomains).map(item => item.toLowerCase()),
  ignoredSenders: normalizeStringList(filters?.ignoredSenders).map(item => item.toLowerCase()),
  subjectExcludes: normalizeStringList(filters?.subjectExcludes),
  allowedDomains: normalizeStringList(filters?.allowedDomains).map(item => item.toLowerCase())
});

const getTenantMicrosoftWorkspace = async (serviceClient: any, tenantId: string): Promise<{
  personalInboxIntake: { enabled: boolean; intakeStartAt?: string | null; filters: InboxFilterConfig };
  sharedMailboxes: SyncMailbox[];
}> => {
  const { data, error } = await serviceClient
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw error;

  const workspace = data?.settings?.microsoftWorkspace || {};
  const configured = workspace.sharedMailboxes || [];
  const seen = new Set<string>();
  const sharedMailboxes = (Array.isArray(configured) ? configured : [])
    .map((item: any) => ({
      email: String(item?.email || '').trim().toLowerCase(),
      label: String(item?.label || item?.email || 'Mailbox compartilhada').trim(),
      enabled: item?.enabled !== false,
      intakeMode: 'filtered' as const,
      intakeStartAt: item?.intakeStartAt || null,
      filters: normalizeInboxFilters(item?.filters)
    }))
    .filter((item: any) => item.enabled && item.email && item.email.includes('@'))
    .filter((item: any) => {
      if (seen.has(item.email)) return false;
      seen.add(item.email);
      return true;
    })
    .map((item: any) => ({
      key: `shared:${item.email}`,
      email: item.email,
      label: item.label,
      kind: 'shared' as const,
      intakeMode: item.intakeMode,
      intakeStartAt: item.intakeStartAt,
      filters: item.filters
    }));
  return {
    personalInboxIntake: {
      enabled: workspace.personalInboxIntake?.enabled === true,
      intakeStartAt: workspace.personalInboxIntake?.intakeStartAt || null,
      filters: normalizeInboxFilters(workspace.personalInboxIntake?.filters)
    },
    sharedMailboxes
  };
};

const isExpiredDeltaError = (error: unknown) =>
  describeCaughtError(error, '').toLowerCase().match(/syncstatenotfound|invaliddeltatoken|delta.*expired|resync/);

const odataString = (value: string) => value.replace(/'/g, "''");

const normalizeEmail = (value?: string) => String(value || '').trim().toLowerCase();
const getEmailDomain = (value?: string) => normalizeEmail(value).split('@')[1] || '';

const isMessageOutboundFromMailbox = (message: any, mailbox: SyncMailbox, accountEmail: string) => {
  const fromEmail = normalizeEmail(message.from?.emailAddress?.address);
  return Boolean(fromEmail && (fromEmail === normalizeEmail(accountEmail) || fromEmail === normalizeEmail(mailbox.email)));
};

const shouldImportInboxMessage = (message: any, mailbox: SyncMailbox, accountEmail: string) => {
  if (isMessageOutboundFromMailbox(message, mailbox, accountEmail)) return false;
  const filters = normalizeInboxFilters(mailbox.filters);
  const fromEmail = normalizeEmail(message.from?.emailAddress?.address);
  const fromDomain = getEmailDomain(fromEmail);
  const fromLocal = fromEmail.split('@')[0] || '';
  const subject = String(message.subject || '').trim().toLowerCase();
  const preview = String(message.bodyPreview || '').trim().toLowerCase();

  if ((filters.allowedDomains || []).length > 0 && !filters.allowedDomains?.includes(fromDomain)) return false;
  if (filters.ignoredDomains?.includes(fromDomain)) return false;
  if (filters.ignoredSenders?.includes(fromEmail)) return false;
  if (filters.ignoreNoReply !== false && /(no-?reply|do-?not-?reply|noreply|nao-?responda)/i.test(fromLocal)) return false;
  if (filters.ignoreAutoReplies !== false && /(automatic reply|out of office|resposta autom[aá]tica|fora do escrit[oó]rio)/i.test(`${subject} ${preview}`)) return false;
  if (filters.ignoreNewsletters !== false && /(newsletter|unsubscribe|descadastrar|descadastre|mailing)/i.test(`${fromLocal} ${subject} ${preview}`)) return false;
  if ((filters.subjectExcludes || []).some(term => term && subject.includes(term.toLowerCase()))) return false;
  return true;
};

const toValidIsoOr = (value: unknown, fallback: string) => {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

const buildMessageRow = (input: {
  message: any;
  linked?: any;
  accountEmail: string;
  tenantId: string;
  userId: string;
  mailbox: SyncMailbox;
  triageStatus?: 'NEW' | 'LINKED';
}) => {
  const fromEmail = input.message.from?.emailAddress?.address || '';
  const direction = isMessageOutboundFromMailbox(input.message, input.mailbox, input.accountEmail) ? 'outbound' : 'inbound';
  const toEmails = (input.message.toRecipients || [])
    .map((recipient: any) => recipient.emailAddress?.address)
    .filter(Boolean);
  const ccEmails = (input.message.ccRecipients || [])
    .map((recipient: any) => recipient.emailAddress?.address)
    .filter(Boolean);

  return {
    tenant_id: input.tenantId,
    client_id: toNullableUuid(input.linked?.client_id),
    contact_id: toNullableUuid(input.linked?.contact_id),
    proposal_id: toNullableUuid(input.linked?.proposal_id),
    task_id: toNullableUuid(input.linked?.task_id),
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
    source_mailbox_email: input.mailbox.email,
    source_mailbox_label: input.mailbox.label,
    source_mailbox_kind: input.mailbox.kind,
    triage_status: input.triageStatus || (input.linked ? 'LINKED' : 'NEW'),
    sent_at: input.message.sentDateTime || null,
    received_at: input.message.receivedDateTime || null
  };
};

const insertMessageCommunication = async (input: {
  message: any;
  accountEmail: string;
  tenantId: string;
  userId: string;
  mailbox: SyncMailbox;
  allowUnlinkedInbound?: boolean;
  serviceClient: any;
  linksByConversation: Map<string, any>;
}) => {
  if (!input.message.id || !input.message.conversationId) return 0;
  const linked = input.linksByConversation.get(input.message.conversationId);
  const direction = isMessageOutboundFromMailbox(input.message, input.mailbox, input.accountEmail) ? 'outbound' : 'inbound';
  if (!linked && (direction !== 'inbound' || !input.allowUnlinkedInbound)) return 0;
  if (!linked && !shouldImportInboxMessage(input.message, input.mailbox, input.accountEmail)) return 0;

  const { error } = await input.serviceClient
    .from('crm_communications')
    .insert(buildMessageRow({
      message: input.message,
      linked,
      accountEmail: input.accountEmail,
      tenantId: input.tenantId,
      userId: input.userId,
      mailbox: input.mailbox,
      triageStatus: linked ? 'LINKED' : 'NEW'
    }));

  if (!error) return 1;
  if (error.code === '23505') return 0;
  throw error;
};

const syncFolder = async (input: {
  folder: 'inbox' | 'sentitems';
  deltaLink?: string | null;
  accessToken: string;
  mailbox: SyncMailbox;
  knownConversations: Set<string>;
  accountEmail: string;
  tenantId: string;
  userId: string;
  serviceClient: any;
  linksByConversation: Map<string, any>;
}) => {
  let url = input.deltaLink || initialDeltaUrl(input.folder, input.mailbox);
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
        url = initialDeltaUrl(input.folder, input.mailbox);
        page = -1;
        continue;
      }
      throw new Error(`Falha ao sincronizar ${input.mailbox.label} (${input.folder}): ${describeCaughtError(error, 'Erro na API Microsoft.')}`);
    }

    for (const message of data.value || []) {
      if (!message.id || !message.conversationId) continue;
      if (input.folder === 'sentitems' && !input.knownConversations.has(message.conversationId)) continue;
      imported += await insertMessageCommunication({
        message,
        accountEmail: input.accountEmail,
        tenantId: input.tenantId,
        userId: input.userId,
        mailbox: input.mailbox,
        allowUnlinkedInbound: false,
        serviceClient: input.serviceClient,
        linksByConversation: input.linksByConversation
      });
    }
    deltaLink = data['@odata.deltaLink'] || deltaLink;
    url = data['@odata.nextLink'] || null;
  }

  return { imported, deltaLink };
};

const syncInboxWindow = async (input: {
  fromIso: string;
  accessToken: string;
  mailbox: SyncMailbox;
  accountEmail: string;
  tenantId: string;
  userId: string;
  serviceClient: any;
  linksByConversation: Map<string, any>;
}) => {
  const params = new URLSearchParams({
    '$top': '50',
    '$select': MESSAGE_SELECT,
    '$filter': `receivedDateTime ge ${input.fromIso}`,
    '$orderby': 'receivedDateTime desc'
  });
  let url: string | null = `${mailboxBaseUrl(input.mailbox)}/mailFolders/inbox/messages?${params.toString()}`;
  let imported = 0;

  for (let page = 0; page < 5 && url; page += 1) {
    const data = await fetchMicrosoftJson(url, {
      headers: { Authorization: `Bearer ${input.accessToken}` }
    });
    for (const message of data.value || []) {
      if (!message.id || !message.conversationId) continue;
      imported += await insertMessageCommunication({
        message,
        accountEmail: input.accountEmail,
        tenantId: input.tenantId,
        userId: input.userId,
        mailbox: input.mailbox,
        allowUnlinkedInbound: true,
        serviceClient: input.serviceClient,
        linksByConversation: input.linksByConversation
      });
    }
    url = data['@odata.nextLink'] || null;
  }

  return { imported };
};

const syncKnownConversationMessages = async (input: {
  accessToken: string;
  mailbox: SyncMailbox;
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
      '$select': MESSAGE_SELECT,
      '$filter': `conversationId eq '${odataString(conversationId)}'`
    });
    let url: string | null = `${mailboxBaseUrl(input.mailbox)}/messages?${params.toString()}`;

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
            mailbox: input.mailbox,
            allowUnlinkedInbound: false,
            serviceClient: input.serviceClient,
            linksByConversation: input.linksByConversation
          });
        }
        url = data['@odata.nextLink'] || null;
      } catch (error) {
        warnings += 1;
        console.error('microsoft-sync-mail conversation fetch failed', {
          conversationId,
          mailbox: input.mailbox.email,
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
      const hasCrmLink = row.client_id || row.contact_id || row.proposal_id || row.task_id;
      if (row.microsoft_conversation_id && hasCrmLink && !linksByConversation.has(row.microsoft_conversation_id)) {
        linksByConversation.set(row.microsoft_conversation_id, row);
      }
    }
    const knownConversations = new Set(linksByConversation.keys());

    const workspace = await getTenantMicrosoftWorkspace(context.serviceClient, context.tenantId);
    const personalMailbox: SyncMailbox = {
      key: 'personal',
      email: account.microsoft_email,
      label: account.microsoft_email,
      kind: 'personal',
      intakeMode: 'filtered',
      intakeStartAt: workspace.personalInboxIntake.intakeStartAt,
      filters: workspace.personalInboxIntake.filters
    };
    const canReadSharedMailboxes = hasScope(account, 'Mail.Read.Shared');
    const mailboxes = [
      personalMailbox,
      ...workspace.sharedMailboxes.filter(mailbox => mailbox.email !== account.microsoft_email.toLowerCase())
    ];
    const previousMailboxDeltaLinks = account.mailbox_delta_links && typeof account.mailbox_delta_links === 'object'
      ? account.mailbox_delta_links
      : {};
    const nextMailboxDeltaLinks = { ...previousMailboxDeltaLinks };

    let imported = 0;
    let conversationWarnings = 0;
    let mailboxWarnings = 0;
    let personalInboxDeltaLink = account.inbox_delta_link;
    let personalSentDeltaLink = account.sent_delta_link;
    const pollingStartedAt = new Date().toISOString();

    for (const mailbox of mailboxes) {
      if (mailbox.kind === 'shared' && !canReadSharedMailboxes) {
        mailboxWarnings += 1;
        console.warn('microsoft-sync-mail shared mailbox skipped: missing Mail.Read.Shared scope', { mailbox: mailbox.email });
        continue;
      }

      try {
        const mailboxDelta = previousMailboxDeltaLinks[mailbox.key] || {};
        const direct = await syncKnownConversationMessages({
          accessToken,
          mailbox,
          knownConversations,
          accountEmail: account.microsoft_email,
          tenantId: context.tenantId,
          userId: context.user.id,
          serviceClient: context.serviceClient,
          linksByConversation
        });
        let inboxImported = 0;
        let nextInboxPolledAt = mailboxDelta.inboxPolledAt || null;
        const shouldPollInboxWindow = mailbox.kind === 'shared' || (mailbox.kind === 'personal' && workspace.personalInboxIntake.enabled);
        if (shouldPollInboxWindow) {
          const fromIso = toValidIsoOr(mailboxDelta.inboxPolledAt || mailbox.intakeStartAt, pollingStartedAt);
          const inbox = await syncInboxWindow({
            fromIso,
            accessToken,
            mailbox,
            accountEmail: account.microsoft_email,
            tenantId: context.tenantId,
            userId: context.user.id,
            serviceClient: context.serviceClient,
            linksByConversation
          });
          inboxImported = inbox.imported;
          nextInboxPolledAt = pollingStartedAt;
        }
        const sent = await syncFolder({
          folder: 'sentitems',
          deltaLink: mailbox.kind === 'personal' ? account.sent_delta_link : mailboxDelta.sent,
          accessToken,
          mailbox,
          knownConversations,
          accountEmail: account.microsoft_email,
          tenantId: context.tenantId,
          userId: context.user.id,
          serviceClient: context.serviceClient,
          linksByConversation
        });

        imported += direct.imported + inboxImported + sent.imported;
        conversationWarnings += direct.warnings;

        if (mailbox.kind === 'personal') {
          personalSentDeltaLink = sent.deltaLink;
        } else {
          nextMailboxDeltaLinks[mailbox.key] = {
            email: mailbox.email,
            label: mailbox.label,
            inboxPolledAt: nextInboxPolledAt,
            sent: sent.deltaLink
          };
        }
      } catch (error) {
        if (mailbox.kind === 'personal') throw error;
        mailboxWarnings += 1;
        console.error('microsoft-sync-mail shared mailbox failed', {
          mailbox: mailbox.email,
          error: describeCaughtError(error, 'Erro ao sincronizar mailbox compartilhada.')
        });
      }
    }

    const todo = await syncMicrosoftTodoTasks({
      accessToken,
      tenantId: context.tenantId,
      userId: context.user.id,
      serviceClient: context.serviceClient
    });

    await context.serviceClient
      .from('crm_microsoft_accounts')
      .update({
        inbox_delta_link: personalInboxDeltaLink,
        sent_delta_link: personalSentDeltaLink,
        mailbox_delta_links: nextMailboxDeltaLinks,
        last_synced_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    return jsonResponse({
      imported,
      tasksUpdated: todo.tasksUpdated,
      taskErrors: todo.taskErrors,
      conversationWarnings,
      mailboxWarnings
    });
  } catch (error) {
    const detail = describeCaughtError(error, 'Erro ao sincronizar Outlook.');
    console.error('microsoft-sync-mail failed', { error: detail });
    return jsonResponse({ error: detail }, 400);
  }
});
