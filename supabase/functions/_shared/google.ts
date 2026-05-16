import { createClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

export type EdgeContext = {
  user: { id: string; email?: string };
  tenantId: string;
  serviceClient: ReturnType<typeof createClient>;
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

export const htmlResponse = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
  });

export const requireEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

export const getServiceClient = () => createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY')
);

export const getAuthedContext = async (req: Request, tenantId?: string): Promise<EdgeContext> => {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader) throw new Error('Sessao obrigatoria.');

  const serviceClient = getServiceClient();
  const authClient = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } }
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) throw new Error('Sessao invalida.');
  if (!tenantId) throw new Error('Tenant obrigatorio.');

  const { data: membership, error: membershipError } = await serviceClient
    .from('tenant_users')
    .select('tenant_id')
    .eq('tenant_id', tenantId)
    .eq('user_id', data.user.id)
    .eq('active', true)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) {
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('platform_role')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profile?.platform_role !== 'SUPER_ADMIN') throw new Error('Usuario sem acesso ao tenant.');
  }

  return {
    user: { id: data.user.id, email: data.user.email || undefined },
    tenantId,
    serviceClient
  };
};

const getCryptoKey = async () => {
  const secret = requireEnv('GOOGLE_TOKEN_ENCRYPTION_KEY');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

export const encryptToken = async (plainText: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getCryptoKey();
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  );
  return `${base64Encode(iv)}.${base64Encode(new Uint8Array(cipher))}`;
};

export const decryptToken = async (encrypted: string) => {
  const [ivEncoded, cipherEncoded] = encrypted.split('.');
  if (!ivEncoded || !cipherEncoded) throw new Error('Token Google invalido.');
  const key = await getCryptoKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(ivEncoded) },
    key,
    base64Decode(cipherEncoded)
  );
  return new TextDecoder().decode(plain);
};

export const base64UrlEncode = (value: string) =>
  btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const base64Encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

const base64Decode = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const fetchGoogleJson = async (url: string, init: RequestInit = {}) => {
  const response = await fetch(url, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.error_description || data?.error?.message || data?.error || 'Erro na API Google.';
    throw new Error(String(message));
  }
  return data;
};

export const refreshGoogleAccessToken = async (
  serviceClient: ReturnType<typeof createClient>,
  account: any
) => {
  const refreshToken = await decryptToken(account.refresh_token_ciphertext);
  const tokenData = await fetchGoogleJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  await serviceClient
    .from('crm_google_accounts')
    .update({ status: 'CONNECTED', error_message: null, updated_at: new Date().toISOString() })
    .eq('id', account.id);

  return tokenData.access_token as string;
};

export const getGoogleAccount = async (
  serviceClient: ReturnType<typeof createClient>,
  tenantId: string,
  userId: string
) => {
  const { data, error } = await serviceClient
    .from('crm_google_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'CONNECTED')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Conecte sua conta Google antes de usar esta acao.');
  return data;
};

export const parseEmailList = (value?: string[] | string | null) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(',') : value;
  return raw.split(',').map(item => item.trim()).filter(Boolean);
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const toNullableUuid = (value?: string | null) =>
  typeof value === 'string' && UUID_PATTERN.test(value) ? value : null;

export const describeCaughtError = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message || fallback;
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const parts = [
      typeof value.message === 'string' ? value.message : '',
      typeof value.details === 'string' ? value.details : '',
      typeof value.hint === 'string' ? value.hint : '',
      typeof value.code === 'string' ? `Codigo: ${value.code}` : ''
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    try {
      return JSON.stringify(error);
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
};

export const createMimeMessage = (input: {
  from?: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyText: string;
  inReplyTo?: string;
  references?: string;
  attachments?: Array<{
    fileName: string;
    contentType: string;
    base64Content: string;
  }>;
}) => {
  const wrapBase64 = (value: string) => {
    const normalized = String(value || '').replace(/\s+/g, '');
    return normalized.match(/.{1,76}/g)?.join('\r\n') || '';
  };
  const attachments = input.attachments || [];
  const boundary = `oprice_${crypto.randomUUID()}`;
  const headers = [
    input.from ? `From: ${input.from}` : null,
    `To: ${input.to.join(', ')}`,
    input.cc?.length ? `Cc: ${input.cc.join(', ')}` : null,
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : null,
    input.references ? `References: ${input.references}` : input.inReplyTo ? `References: ${input.inReplyTo}` : null,
    attachments.length
      ? `Content-Type: multipart/mixed; boundary="${boundary}"`
      : 'Content-Type: text/plain; charset="UTF-8"'
  ].filter(Boolean);

  if (!attachments.length) {
    return base64UrlEncode(`${headers.join('\r\n')}\r\n\r\n${input.bodyText}`);
  }

  const bodyParts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    input.bodyText || '',
    ...attachments.flatMap(attachment => [
      `--${boundary}`,
      `Content-Type: ${attachment.contentType || 'application/octet-stream'}; name="${attachment.fileName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.fileName}"`,
      '',
      wrapBase64(attachment.base64Content)
    ]),
    `--${boundary}--`
  ];

  return base64UrlEncode(`${headers.join('\r\n')}\r\n\r\n${bodyParts.join('\r\n')}`);
};

export const getHeader = (message: any, name: string) =>
  message?.payload?.headers?.find((header: any) => header.name?.toLowerCase() === name.toLowerCase())?.value || '';

export const toPlainSnippet = (value?: string) => (value || '').replace(/\s+/g, ' ').trim().slice(0, 1000);

export const taskPayload = (input: {
  id: string;
  tenantId: string;
  clientId?: string;
  contactId?: string;
  proposalId?: string;
  assignee?: string;
  title: string;
  description: string;
  type: 'Email' | 'Meeting';
  status: 'Done' | 'To Do';
  dueDate: string;
}) => ({
  id: input.id,
  tenantId: input.tenantId,
  clientId: input.clientId,
  contactId: input.contactId,
  proposalId: input.proposalId,
  assignee: input.assignee,
  title: input.title,
  description: input.description,
  type: input.type,
  status: input.status,
  dueDate: input.dueDate,
  createdAt: new Date().toISOString()
});
