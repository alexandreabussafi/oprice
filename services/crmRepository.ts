import { Client, Contact, CRMCommunication, CRMExternalEvent, CRMTask, ProposalData, TaskAttachment } from '../types';
import { supabase } from '../lib/supabase';
import { runOptionalSupabaseResponse, runSupabaseRequest, runSupabaseResponse, SupabaseRequestOptions, withAbortSignal } from './supabaseRequest';

export const isUuid = (value?: string) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const TASK_ATTACHMENTS_BUCKET = 'crm-task-attachments';
const SIGNED_URL_EXPIRES_IN = 60 * 5;

type CrmRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

const requestOptions = (
  label: string,
  resource: string,
  tenantId?: string,
  options: CrmRequestOptions = {}
): SupabaseRequestOptions => ({
  label,
  resource,
  tenantId,
  signal: options.signal,
  timeoutMs: options.timeoutMs
});

const ALLOWED_TASK_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/webp'
]);

const TASK_ATTACHMENT_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
};

const nowIso = () => new Date().toISOString();

const isSchemaCompatibilityError = (error: any) => {
  const message = String(error?.message || error?.details || '');
  return error?.code === 'PGRST204'
    || /schema cache/i.test(message)
    || /column .* does not exist/i.test(message)
    || /could not find .* column/i.test(message);
};

const isMissingTableError = (error: any, tableName: string) => {
  const message = String(error?.message || error?.details || '');
  return error?.code === 'PGRST205'
    || new RegExp(`table .*${tableName}`, 'i').test(message)
    || /could not find the table/i.test(message);
};

const isMissingPayloadColumn = (error: any) => {
  const message = String(error?.message || error?.details || '');
  return /column .*payload.* does not exist/i.test(message)
    || /payload.*column/i.test(message);
};

const getConstraintName = (error: any) => {
  const source = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return error?.constraint
    || source.match(/constraint "([^"]+)"/i)?.[1]
    || source.match(/violates unique constraint "([^"]+)"/i)?.[1]
    || '';
};

const normalizeProposalPersistenceError = (error: any) => {
  if (error?.code !== '23505') return error;
  const constraint = getConstraintName(error);
  const normalized = new Error(
    constraint === 'proposals_human_id_key'
      ? 'Constraint legada proposals_human_id_key esta bloqueando o versionamento. Remova a unicidade de human_id no Supabase.'
      : constraint === 'proposals_tenant_proposal_number_version_key'
        ? 'Ja existe uma proposta com este numero e versao neste tenant.'
        : error?.message || 'Registro duplicado no Supabase.'
  ) as any;
  normalized.code = error.code;
  normalized.constraint = constraint;
  normalized.details = error.details;
  normalized.hint = error.hint;
  return normalized;
};

const toClientRow = (client: Client, tenantId: string) => {
  const row: any = {
    tenant_id: tenantId,
    name: client.name || 'Novo Cliente',
    legal_name: client.legalName || null,
    trade_name: client.tradeName || null,
    cnpj: client.cnpj || null,
    industry: client.industry || null,
    status: client.status || 'Active',
    classification: client.classification || null,
    segment: client.segment || null,
    sub_segment: client.subSegment || null,
    corporate_group: client.corporateGroup || null,
    cep: client.cep || null,
    address: client.address || null,
    address_number: client.addressNumber || null,
    neighborhood: client.neighborhood || null,
    city: client.city || null,
    state: client.state || null,
    registration_status: client.registrationStatus || null,
    state_registration: client.stateRegistration || null,
    business_unit: client.businessUnit || null,
    is_product_client: client.isProductClient || false,
    is_service_client: client.isServiceClient || false,
    updated_at: nowIso()
  };
  if (isUuid(client.id)) row.id = client.id;
  return row;
};

const toClientFallbackRow = (client: Client, tenantId: string) => {
  const row: any = {
    tenant_id: tenantId,
    payload: { ...client, tenantId },
    updated_at: nowIso()
  };
  if (isUuid(client.id)) row.id = client.id;
  return row;
};

const fromClientRow = (row: any): Client => {
  const payload = row.payload || {};
  return ({
  ...payload,
  id: row.id,
  tenantId: row.tenant_id,
  name: row.name || payload.name || 'Cliente',
  legalName: row.legal_name || payload.legalName || undefined,
  tradeName: row.trade_name || payload.tradeName || undefined,
  cnpj: row.cnpj || payload.cnpj || undefined,
  industry: row.industry || payload.industry || undefined,
  status: row.status || payload.status || 'Active',
  classification: row.classification || payload.classification || undefined,
  segment: row.segment || payload.segment || undefined,
  subSegment: row.sub_segment || payload.subSegment || undefined,
  corporateGroup: row.corporate_group || payload.corporateGroup || undefined,
  cep: row.cep || payload.cep || undefined,
  address: row.address || payload.address || undefined,
  addressNumber: row.address_number || payload.addressNumber || undefined,
  neighborhood: row.neighborhood || payload.neighborhood || undefined,
  city: row.city || payload.city || undefined,
  state: row.state || payload.state || undefined,
  registrationStatus: row.registration_status || payload.registrationStatus || undefined,
  stateRegistration: row.state_registration || payload.stateRegistration || undefined,
  businessUnit: row.business_unit || payload.businessUnit || undefined,
  isProductClient: row.is_product_client ?? payload.isProductClient ?? false,
  isServiceClient: row.is_service_client ?? payload.isServiceClient ?? false
});
};

const toContactRow = (contact: Contact, tenantId: string) => {
  const row: any = {
    tenant_id: tenantId,
    client_id: isUuid(contact.clientId) ? contact.clientId : null,
    name: contact.name || 'Novo Contato',
    email: contact.email || null,
    phone: contact.phone || null,
    role: contact.role || null,
    influence_level: contact.influenceLevel || null,
    linkedin: contact.linkedin || null,
    updated_at: nowIso()
  };
  if (isUuid(contact.id)) row.id = contact.id;
  return row;
};

const toContactFallbackRow = (contact: Contact, tenantId: string) => {
  const row: any = {
    tenant_id: tenantId,
    client_id: isUuid(contact.clientId) ? contact.clientId : null,
    payload: { ...contact, tenantId },
    updated_at: nowIso()
  };
  if (isUuid(contact.id)) row.id = contact.id;
  return row;
};

const fromContactRow = (row: any): Contact => {
  const payload = row.payload || {};
  return ({
  ...payload,
  id: row.id,
  tenantId: row.tenant_id,
  clientId: row.client_id || payload.clientId || '',
  name: row.name || payload.name || 'Contato',
  email: row.email || payload.email || '',
  phone: row.phone || payload.phone || '',
  role: row.role || payload.role || '',
  influenceLevel: row.influence_level || payload.influenceLevel || 'Influencer',
  linkedin: row.linkedin || payload.linkedin || undefined
});
};

const toTaskRow = (task: CRMTask, tenantId: string) => {
  const payload = { ...task, tenantId };
  const row: any = {
    tenant_id: tenantId,
    client_id: isUuid(task.clientId) ? task.clientId : null,
    contact_id: isUuid(task.contactId) ? task.contactId : null,
    proposal_id: isUuid(task.proposalId) ? task.proposalId : null,
    payload,
    updated_at: nowIso()
  };
  if (isUuid(task.id)) row.id = task.id;
  return row;
};

export const fromTaskRow = (row: any): CRMTask => ({
  ...row.payload,
  id: row.id,
  tenantId: row.tenant_id,
  clientId: row.client_id || row.payload?.clientId,
  contactId: row.contact_id || row.payload?.contactId,
  proposalId: row.proposal_id || row.payload?.proposalId,
  createdAt: row.payload?.createdAt || row.created_at || nowIso()
});

const toTaskAttachment = (row: any): TaskAttachment => ({
  id: row.id,
  tenantId: row.tenant_id,
  taskId: row.task_id,
  proposalId: row.proposal_id || undefined,
  fileName: row.file_name,
  fileType: row.file_type,
  fileSize: Number(row.file_size || 0),
  storagePath: row.storage_path,
  createdBy: row.created_by || undefined,
  createdAt: row.created_at || nowIso()
});

export const fromCommunicationRow = (row: any): CRMCommunication => ({
  id: row.id,
  tenantId: row.tenant_id,
  clientId: row.client_id || undefined,
  contactId: row.contact_id || undefined,
  proposalId: row.proposal_id || undefined,
  taskId: row.task_id || undefined,
  userId: row.user_id || undefined,
  provider: row.provider || 'google',
  channel: row.channel || 'email',
  direction: row.direction,
  subject: row.subject || undefined,
  bodyPreview: row.body_preview || undefined,
  fromEmail: row.from_email || undefined,
  toEmails: row.to_emails || [],
  ccEmails: row.cc_emails || [],
  gmailMessageId: row.gmail_message_id || undefined,
  gmailThreadId: row.gmail_thread_id || undefined,
  gmailHistoryId: row.gmail_history_id || undefined,
  gmailInternetMessageId: row.gmail_internet_message_id || undefined,
  emailInReplyTo: row.email_in_reply_to || undefined,
  emailReferences: row.email_references || undefined,
  microsoftMessageId: row.microsoft_message_id || undefined,
  microsoftConversationId: row.microsoft_conversation_id || undefined,
  microsoftInternetMessageId: row.microsoft_internet_message_id || undefined,
  externalUrl: row.external_url || undefined,
  sentAt: row.sent_at || undefined,
  receivedAt: row.received_at || undefined,
  createdAt: row.created_at || nowIso()
});

export const fromExternalEventRow = (row: any): CRMExternalEvent => ({
  id: row.id,
  tenantId: row.tenant_id,
  clientId: row.client_id || undefined,
  contactId: row.contact_id || undefined,
  proposalId: row.proposal_id || undefined,
  taskId: row.task_id || undefined,
  userId: row.user_id || undefined,
  provider: row.provider || 'google',
  eventType: row.event_type || 'calendar_event',
  externalEventId: row.external_event_id,
  title: row.title,
  description: row.description || undefined,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  attendeeEmails: row.attendee_emails || [],
  meetLink: row.meet_link || undefined,
  htmlLink: row.html_link || undefined,
  syncStatus: row.sync_status || 'CREATED',
  createdAt: row.created_at || nowIso()
});

const sanitizeFileName = (name: string) => {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'arquivo';
};

const getAllowedTaskAttachmentType = (file: File) => {
  if (ALLOWED_TASK_ATTACHMENT_TYPES.has(file.type)) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return TASK_ATTACHMENT_TYPE_BY_EXTENSION[extension] || null;
};

const createAttachmentId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const toProposalRow = (proposal: ProposalData, tenantId: string) => {
  const normalizedValue = Number(proposal.value || 0);
  const fullData = { ...proposal, tenantId, value: normalizedValue };
  const row: any = {
    tenant_id: tenantId,
    human_id: proposal.proposalId,
    proposal_number: proposal.proposalId,
    version: proposal.version || 1,
    version_notes: proposal.versionNotes || null,
    version_status: proposal.versionStatus || 'DRAFT',
    is_current_version: proposal.isCurrentVersion !== false,
    type: proposal.type,
    proposal_type: proposal.type,
    client_id: isUuid(proposal.clientId) ? proposal.clientId : null,
    client_name_snapshot: proposal.clientName,
    stage: proposal.stage,
    status: proposal.status,
    probability: proposal.probability || 0,
    total_value: normalizedValue,
    expiration_date: proposal.expirationDate ? proposal.expirationDate.slice(0, 10) : null,
    pricing_module: proposal.pricingModule || null,
    payload: fullData,
    full_data: fullData,
    updated_at: nowIso()
  };
  if (isUuid(proposal.id)) row.id = proposal.id;
  return row;
};

const toProposalFallbackRow = (proposal: ProposalData, tenantId: string) => {
  const normalizedValue = Number(proposal.value || 0);
  const fullData = { ...proposal, tenantId, value: normalizedValue };
  const row: any = {
    tenant_id: tenantId,
    client_id: isUuid(proposal.clientId) ? proposal.clientId : null,
    proposal_number: proposal.proposalId,
    version: proposal.version || 1,
    is_current_version: proposal.isCurrentVersion !== false,
    proposal_type: proposal.type,
    pricing_module: proposal.pricingModule || null,
    payload: fullData,
    updated_at: nowIso()
  };
  if (isUuid(proposal.id)) row.id = proposal.id;
  return row;
};

const fromProposalRow = (row: any): ProposalData => {
  const fullData = row.full_data || row.payload || {};
  return ({
  ...fullData,
  id: row.id,
  tenantId: row.tenant_id,
  proposalId: row.human_id || row.proposal_number || fullData?.proposalId || row.id,
  version: row.version || fullData?.version || 1,
  versionNotes: row.version_notes || fullData?.versionNotes,
  versionStatus: row.version_status || fullData?.versionStatus || 'DRAFT',
  isCurrentVersion: row.is_current_version !== false,
  type: row.type || row.proposal_type || fullData?.type || 'CONTINUOUS',
  clientId: row.client_id || fullData?.clientId,
  clientName: row.client_name_snapshot || fullData?.clientName || 'Cliente',
  stage: row.stage || fullData?.stage || 'Pricing',
  status: row.status || fullData?.status || 'Active',
  probability: row.probability ?? fullData?.probability ?? 50,
  value: Number(row.total_value ?? fullData?.value ?? 0),
  expirationDate: row.expiration_date || fullData?.expirationDate || nowIso(),
  pricingModule: row.pricing_module || fullData?.pricingModule,
  createdAt: row.created_at || fullData?.createdAt || nowIso(),
  updatedAt: row.updated_at || fullData?.updatedAt || nowIso()
});
};

const readBack = async <T>(loader: () => Promise<T | null>, entityName: string): Promise<T> => {
  const saved = await loader();
  if (!saved) throw new Error(`${entityName} nao foi encontrado apos salvar.`);
  return saved;
};

export const crmRepository = {
  async listClients(tenantId: string, options: CrmRequestOptions = {}): Promise<Client[]> {
    let data;
    try {
      data = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('clients').select('*').eq('tenant_id', tenantId).order('name'), signal),
        requestOptions('Listar clientes', 'clients', tenantId, options)
      );
    } catch (error) {
      if (!isSchemaCompatibilityError(error)) throw error;
      data = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('clients').select('*').eq('tenant_id', tenantId).order('updated_at', { ascending: false }), signal),
        requestOptions('Listar clientes fallback', 'clients', tenantId, options)
      );
    }
    return (data || []).map(fromClientRow);
  },

  async upsertClient(client: Client, tenantId: string, options: CrmRequestOptions = {}): Promise<Client> {
    let data;
    try {
      data = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('clients').upsert(toClientRow(client, tenantId)).select('*').single(), signal),
        requestOptions('Salvar cliente', 'clients', tenantId, options)
      );
    } catch (error) {
      if (options.signal?.aborted || !isSchemaCompatibilityError(error) || isMissingPayloadColumn(error)) throw error;
      data = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('clients').upsert(toClientFallbackRow(client, tenantId)).select('*').single(), signal),
        requestOptions('Salvar cliente fallback', 'clients', tenantId, options)
      );
    }
    return fromClientRow(data);
  },

  async getClient(id: string, tenantId: string, options: CrmRequestOptions = {}): Promise<Client | null> {
    if (!isUuid(id)) return null;
    const data = await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('clients').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle(), signal),
      requestOptions('Buscar cliente', 'clients', tenantId, options)
    );
    return data ? fromClientRow(data) : null;
  },

  async createClient(client: Client, tenantId: string, options: CrmRequestOptions = {}): Promise<Client> {
    const saved = await this.upsertClient(client, tenantId, options);
    return readBack(() => this.getClient(saved.id, tenantId, options), 'Cliente');
  },

  async updateClient(client: Client, tenantId: string, options: CrmRequestOptions = {}): Promise<Client> {
    const saved = await this.upsertClient(client, tenantId, options);
    return readBack(() => this.getClient(saved.id, tenantId, options), 'Cliente');
  },

  async deleteClient(id: string, tenantId: string, options: CrmRequestOptions = {}): Promise<void> {
    if (!isUuid(id)) return;
    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('clients').delete().eq('id', id).eq('tenant_id', tenantId), signal),
      requestOptions('Excluir cliente', 'clients', tenantId, options)
    );
  },

  async listContacts(tenantId: string, options: CrmRequestOptions = {}): Promise<Contact[]> {
    let data;
    try {
      data = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('contacts').select('*').eq('tenant_id', tenantId).order('name'), signal),
        requestOptions('Listar contatos', 'contacts', tenantId, options)
      );
    } catch (error) {
      if (!isSchemaCompatibilityError(error)) throw error;
      data = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('contacts').select('*').eq('tenant_id', tenantId).order('updated_at', { ascending: false }), signal),
        requestOptions('Listar contatos fallback', 'contacts', tenantId, options)
      );
    }
    return (data || []).map(fromContactRow);
  },

  async upsertContact(contact: Contact, tenantId: string, options: CrmRequestOptions = {}): Promise<Contact> {
    let data;
    try {
      data = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('contacts').upsert(toContactRow(contact, tenantId)).select('*').single(), signal),
        requestOptions('Salvar contato', 'contacts', tenantId, options)
      );
    } catch (error) {
      if (options.signal?.aborted || !isSchemaCompatibilityError(error) || isMissingPayloadColumn(error)) throw error;
      data = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('contacts').upsert(toContactFallbackRow(contact, tenantId)).select('*').single(), signal),
        requestOptions('Salvar contato fallback', 'contacts', tenantId, options)
      );
    }
    return fromContactRow(data);
  },

  async getContact(id: string, tenantId: string, options: CrmRequestOptions = {}): Promise<Contact | null> {
    if (!isUuid(id)) return null;
    const data = await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('contacts').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle(), signal),
      requestOptions('Buscar contato', 'contacts', tenantId, options)
    );
    return data ? fromContactRow(data) : null;
  },

  async createContact(contact: Contact, tenantId: string, options: CrmRequestOptions = {}): Promise<Contact> {
    const saved = await this.upsertContact(contact, tenantId, options);
    return readBack(() => this.getContact(saved.id, tenantId, options), 'Contato');
  },

  async updateContact(contact: Contact, tenantId: string, options: CrmRequestOptions = {}): Promise<Contact> {
    const saved = await this.upsertContact(contact, tenantId, options);
    return readBack(() => this.getContact(saved.id, tenantId, options), 'Contato');
  },

  async deleteContact(id: string, tenantId: string, options: CrmRequestOptions = {}): Promise<void> {
    if (!isUuid(id)) return;
    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('contacts').delete().eq('id', id).eq('tenant_id', tenantId), signal),
      requestOptions('Excluir contato', 'contacts', tenantId, options)
    );
  },

  async listTasks(tenantId: string, options: CrmRequestOptions = {}): Promise<CRMTask[]> {
    const data = await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('crm_tasks').select('*').eq('tenant_id', tenantId).order('updated_at', { ascending: false }), signal),
      requestOptions('Listar tarefas', 'crm_tasks', tenantId, options)
    );
    return (data || []).map(fromTaskRow);
  },

  async upsertTask(task: CRMTask, tenantId: string, options: CrmRequestOptions = {}): Promise<CRMTask> {
    const data = await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('crm_tasks').upsert(toTaskRow(task, tenantId)).select('*').single(), signal),
      requestOptions('Salvar tarefa', 'crm_tasks', tenantId, options)
    );
    return fromTaskRow(data);
  },

  async getTask(id: string, tenantId: string, options: CrmRequestOptions = {}): Promise<CRMTask | null> {
    if (!isUuid(id)) return null;
    const data = await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('crm_tasks').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle(), signal),
      requestOptions('Buscar tarefa', 'crm_tasks', tenantId, options)
    );
    return data ? fromTaskRow(data) : null;
  },

  async createTask(task: CRMTask, tenantId: string, options: CrmRequestOptions = {}): Promise<CRMTask> {
    const saved = await this.upsertTask(task, tenantId, options);
    return readBack(() => this.getTask(saved.id, tenantId, options), 'Tarefa');
  },

  async updateTask(task: CRMTask, tenantId: string, options: CrmRequestOptions = {}): Promise<CRMTask> {
    const saved = await this.upsertTask(task, tenantId, options);
    return readBack(() => this.getTask(saved.id, tenantId, options), 'Tarefa');
  },

  async deleteTask(id: string, tenantId: string, options: CrmRequestOptions = {}): Promise<void> {
    if (!isUuid(id)) return;
    const attachments = await this.listTaskAttachments(tenantId, id, options);
    if (attachments.length > 0) {
      const { error: storageError } = await runSupabaseRequest(
        () => supabase.storage
          .from(TASK_ATTACHMENTS_BUCKET)
          .remove(attachments.map(attachment => attachment.storagePath)),
        requestOptions('Remover arquivos de tarefa', `storage/${TASK_ATTACHMENTS_BUCKET}`, tenantId, options)
      );
      if (storageError) throw storageError;
    }
    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('crm_tasks').delete().eq('id', id).eq('tenant_id', tenantId), signal),
      requestOptions('Excluir tarefa', 'crm_tasks', tenantId, options)
    );
  },

  async listTaskAttachments(tenantId: string, taskId?: string, options: CrmRequestOptions = {}): Promise<TaskAttachment[]> {
    const data = await runOptionalSupabaseResponse(
      signal => {
        let query = supabase
          .from('crm_task_attachments')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });
        if (taskId) query = query.eq('task_id', taskId);
        return withAbortSignal(query, signal);
      },
      { ...requestOptions('Listar anexos de tarefas', 'crm_task_attachments', tenantId, options), optional: true },
      [] as any[],
      error => isMissingTableError(error, 'crm_task_attachments')
    );
    return (data || []).map(toTaskAttachment);
  },

  async uploadTaskAttachment(task: CRMTask, file: File, tenantId: string, userId?: string, options: CrmRequestOptions = {}): Promise<TaskAttachment> {
    if (!isUuid(task.id)) throw new Error('Salve a tarefa antes de anexar arquivos.');
    const fileType = getAllowedTaskAttachmentType(file);
    if (!fileType) {
      throw new Error(`Tipo de arquivo nao permitido: ${file.name}`);
    }

    const id = createAttachmentId();
    const safeName = sanitizeFileName(file.name);
    const storagePath = `tenant/${tenantId}/tasks/${task.id}/${id}-${safeName}`;
    const { error: uploadError } = await runSupabaseRequest(
      () => supabase.storage
        .from(TASK_ATTACHMENTS_BUCKET)
        .upload(storagePath, file, {
          contentType: fileType,
          upsert: false
        }),
      requestOptions('Enviar anexo de tarefa', `storage/${TASK_ATTACHMENTS_BUCKET}`, tenantId, options)
    );
    if (uploadError) throw uploadError;

    const row = {
      id,
      tenant_id: tenantId,
      task_id: task.id,
      proposal_id: isUuid(task.proposalId) ? task.proposalId : null,
      file_name: file.name,
      file_type: fileType,
      file_size: file.size,
      storage_path: storagePath,
      created_by: userId || null
    };

    try {
      const data = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('crm_task_attachments').insert(row).select('*').single(), signal),
        requestOptions('Registrar anexo de tarefa', 'crm_task_attachments', tenantId, options)
      );
      return toTaskAttachment(data);
    } catch (error) {
      await supabase.storage.from(TASK_ATTACHMENTS_BUCKET).remove([storagePath]);
      throw error;
    }
  },

  async createTaskAttachmentSignedUrl(attachment: TaskAttachment, tenantId: string, options: CrmRequestOptions = {}): Promise<string> {
    if (attachment.tenantId !== tenantId) throw new Error('Anexo nao pertence ao tenant ativo.');
    const { data, error } = await runSupabaseRequest(
      () => supabase.storage
        .from(TASK_ATTACHMENTS_BUCKET)
        .createSignedUrl(attachment.storagePath, SIGNED_URL_EXPIRES_IN, {
          download: attachment.fileName
        }),
      requestOptions('Abrir anexo de tarefa', `storage/${TASK_ATTACHMENTS_BUCKET}`, tenantId, options)
    );
    if (error) throw error;
    return data.signedUrl;
  },

  async deleteTaskAttachment(attachment: TaskAttachment, tenantId: string, options: CrmRequestOptions = {}): Promise<void> {
    if (attachment.tenantId !== tenantId) throw new Error('Anexo nao pertence ao tenant ativo.');
    const { error: storageError } = await runSupabaseRequest(
      () => supabase.storage
        .from(TASK_ATTACHMENTS_BUCKET)
        .remove([attachment.storagePath]),
      requestOptions('Remover arquivo de anexo', `storage/${TASK_ATTACHMENTS_BUCKET}`, tenantId, options)
    );
    if (storageError) throw storageError;

    await runSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('crm_task_attachments')
          .delete()
          .eq('id', attachment.id)
          .eq('tenant_id', tenantId),
        signal
      ),
      requestOptions('Excluir anexo de tarefa', 'crm_task_attachments', tenantId, options)
    );
  },

  async listCommunications(tenantId: string, options: CrmRequestOptions = {}): Promise<CRMCommunication[]> {
    const data = await runOptionalSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('crm_communications')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
        signal
      ),
      { ...requestOptions('Listar comunicacoes', 'crm_communications', tenantId, options), optional: true },
      [] as any[],
      error => isMissingTableError(error, 'crm_communications')
    );
    return (data || []).map(fromCommunicationRow);
  },

  async listExternalEvents(tenantId: string, options: CrmRequestOptions = {}): Promise<CRMExternalEvent[]> {
    const data = await runOptionalSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('crm_external_events')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('starts_at', { ascending: false }),
        signal
      ),
      { ...requestOptions('Listar eventos externos', 'crm_external_events', tenantId, options), optional: true },
      [] as any[],
      error => isMissingTableError(error, 'crm_external_events')
    );
    return (data || []).map(fromExternalEventRow);
  },

  async listProposals(tenantId: string, options: CrmRequestOptions = {}): Promise<ProposalData[]> {
    const data = await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('proposals').select('*').eq('tenant_id', tenantId).order('updated_at', { ascending: false }), signal),
      requestOptions('Listar propostas', 'proposals', tenantId, options)
    );
    return (data || []).map(fromProposalRow);
  },

  async listProposalVersions(tenantId: string, proposalNumber: string, options: CrmRequestOptions = {}): Promise<ProposalData[]> {
    const data = await runSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('proposals')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('proposal_number', proposalNumber)
          .order('version', { ascending: false }),
        signal
      ),
      requestOptions('Listar versoes da proposta', 'proposals', tenantId, options)
    );
    return (data || []).map(fromProposalRow);
  },

  async createProposal(proposal: ProposalData, tenantId: string, options: CrmRequestOptions = {}): Promise<ProposalData> {
    let persistedProposalRow: any;
    try {
      persistedProposalRow = await runSupabaseResponse(
        signal => withAbortSignal(supabase.from('proposals').insert(toProposalRow(proposal, tenantId)).select('*').single(), signal),
        requestOptions('Criar proposta', 'proposals', tenantId, options)
      );
    } catch (error: any) {
      if (!options.signal?.aborted && isSchemaCompatibilityError(error)) {
        persistedProposalRow = await runSupabaseResponse(
          signal => withAbortSignal(supabase.from('proposals').insert(toProposalFallbackRow(proposal, tenantId)).select('*').single(), signal),
          requestOptions('Criar proposta sem payload', 'proposals', tenantId, options)
        );
      } else {
        throw normalizeProposalPersistenceError(error);
      }
    }
    if (!persistedProposalRow) throw new Error('Proposta foi salva, mas o Supabase nao retornou os dados criados.');
    return fromProposalRow(persistedProposalRow);

  },

  async getProposal(id: string, tenantId: string, options: CrmRequestOptions = {}): Promise<ProposalData | null> {
    if (!isUuid(id)) return null;
    const proposalRow = await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('proposals').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle(), signal),
      requestOptions('Buscar proposta', 'proposals', tenantId, options)
    ).catch(error => {
      throw normalizeProposalPersistenceError(error);
    });
    return proposalRow ? fromProposalRow(proposalRow) : null;
  },

  async updateProposal(proposal: ProposalData, tenantId: string, options: CrmRequestOptions = {}): Promise<ProposalData> {
    if (!isUuid(proposal.id)) {
      return this.createProposal(proposal, tenantId, options);
    }

    let persistedProposalRow: any;
    try {
      persistedProposalRow = await runSupabaseResponse(
        signal => withAbortSignal(
          supabase
            .from('proposals')
            .update(toProposalRow(proposal, tenantId))
            .eq('id', proposal.id)
            .eq('tenant_id', tenantId)
            .select('*')
            .maybeSingle(),
          signal
        ),
        requestOptions('Atualizar proposta', 'proposals', tenantId, options)
      );
    } catch (error: any) {
      if (!options.signal?.aborted && isSchemaCompatibilityError(error)) {
        persistedProposalRow = await runSupabaseResponse(
          signal => withAbortSignal(
            supabase
              .from('proposals')
              .update(toProposalFallbackRow(proposal, tenantId))
              .eq('id', proposal.id)
              .eq('tenant_id', tenantId)
              .select('*')
              .maybeSingle(),
            signal
          ),
          requestOptions('Atualizar proposta sem payload', 'proposals', tenantId, options)
        );
      } else {
        throw normalizeProposalPersistenceError(error);
      }
    }
    if (!persistedProposalRow) throw new Error('Proposta nao foi encontrada para atualizacao neste tenant.');
    return fromProposalRow(persistedProposalRow);

  },

  async deleteProposal(id: string, tenantId: string, options: CrmRequestOptions = {}): Promise<void> {
    if (!isUuid(id)) return;
    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('proposals').delete().eq('id', id).eq('tenant_id', tenantId), signal),
      requestOptions('Excluir proposta', 'proposals', tenantId, options)
    );
  },

  async getTenantSettings<T>(tenantId: string, options: CrmRequestOptions = {}): Promise<T | null> {
    const data = await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('tenant_settings').select('settings').eq('tenant_id', tenantId).maybeSingle(), signal),
      requestOptions('Buscar configuracoes do tenant', 'tenant_settings', tenantId, options)
    );
    return (data?.settings as T) || null;
  },

  async upsertTenantSettings<T>(tenantId: string, settings: T, options: CrmRequestOptions = {}): Promise<T> {
    const data = await runSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('tenant_settings')
          .upsert({ tenant_id: tenantId, settings, updated_at: nowIso() })
          .select('settings')
          .single(),
        signal
      ),
      requestOptions('Salvar configuracoes do tenant', 'tenant_settings', tenantId, options)
    );
    return data.settings as T;
  }
};
