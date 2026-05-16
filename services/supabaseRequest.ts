export type PersistenceErrorKind =
  | 'timeout'
  | 'abort'
  | 'network'
  | 'rls'
  | 'schema'
  | 'constraint'
  | 'edge-function'
  | 'missing-table'
  | 'unknown';

export type SupabaseRequestOptions = {
  label: string;
  resource?: string;
  tenantId?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  optional?: boolean;
};

export type SupabaseRequestLog = {
  label: string;
  resource?: string;
  tenantId?: string;
  durationMs: number;
  status: 'ok' | 'error';
  kind?: PersistenceErrorKind;
  code?: string;
  requestId?: string;
  message?: string;
};

export const DEFAULT_SUPABASE_TIMEOUT_MS = 10_000;
export const OPTIONAL_SUPABASE_TIMEOUT_MS = 7_000;

const isAbortLike = (error: any) =>
  error?.name === 'AbortError' || /abort|aborted/i.test(String(error?.message || ''));

const getRequestId = (error: any) =>
  error?.requestId
  || error?.request_id
  || error?.headers?.get?.('x-request-id')
  || error?.context?.headers?.get?.('x-request-id')
  || error?.context?.headers?.get?.('cf-ray')
  || undefined;

export const withAbortSignal = <T,>(query: T, signal?: AbortSignal): T => {
  if (!signal) return query;
  const abortable = query as T & { abortSignal?: (signal: AbortSignal) => T };
  return typeof abortable.abortSignal === 'function' ? abortable.abortSignal(signal) : query;
};

export const classifySupabaseError = (error: any): PersistenceErrorKind => {
  const code = String(error?.code || error?.status || '');
  const message = String(error?.message || error?.details || error?.hint || '');
  const combined = `${code} ${message}`.toLowerCase();

  if (code === 'CRM_TIMEOUT' || code === 'SUPABASE_TIMEOUT' || combined.includes('tempo limite') || combined.includes('timeout')) return 'timeout';
  if (isAbortLike(error)) return 'abort';
  if (/failed to fetch|networkerror|load failed|err_network|err_connection|fetch failed|network request failed/i.test(combined)) return 'network';
  if (code === '42501' || /row-level security|permission denied|not authorized|unauthorized|not allowed/i.test(combined)) return 'rls';
  if (/schema cache|column .* does not exist|could not find .* column|pgrst204/i.test(combined)) return 'schema';
  if (/pgrst205|could not find the table|table .* not found|relation .* does not exist/i.test(combined)) return 'missing-table';
  if (code === '23505' || code === '23503' || /duplicate key|unique constraint|foreign key|violates .* constraint/i.test(combined)) return 'constraint';
  if (/edge function|functions|function invoke|non-2xx status code/i.test(combined)) return 'edge-function';
  return 'unknown';
};

export const createSupabaseTimeoutError = (label: string, timeoutMs: number) => {
  const error = new Error(`${label} excedeu o limite de ${Math.round(timeoutMs / 1000)}s. A chamada ao Supabase foi abortada para liberar a tela. Verifique conexao, RLS/membership do tenant e o trace do Playwright.`) as Error & {
    code?: string;
    kind?: PersistenceErrorKind;
    crmLabel?: string;
    timeoutMs?: number;
  };
  error.code = 'SUPABASE_TIMEOUT';
  error.kind = 'timeout';
  error.crmLabel = label;
  error.timeoutMs = timeoutMs;
  return error;
};

export const normalizeSupabaseError = (error: any, options: SupabaseRequestOptions) => {
  const kind = classifySupabaseError(error);
  const normalized = error instanceof Error ? error : new Error(String(error?.message || error || 'Erro Supabase'));
  (normalized as any).kind = (normalized as any).kind || kind;
  (normalized as any).code = (normalized as any).code || error?.code;
  (normalized as any).details = (normalized as any).details || error?.details;
  (normalized as any).hint = (normalized as any).hint || error?.hint;
  (normalized as any).resource = (normalized as any).resource || options.resource;
  (normalized as any).tenantId = (normalized as any).tenantId || options.tenantId;
  (normalized as any).requestId = (normalized as any).requestId || getRequestId(error);
  return normalized;
};

export const getPersistenceErrorMessage = (error: any, fallback: string) => {
  const kind = (error?.kind || classifySupabaseError(error)) as PersistenceErrorKind;
  const code = String(error?.code || '');
  const message = String(error?.message || error?.details || '');
  const combined = `${message} ${error?.details || ''} ${error?.hint || ''}`;

  if (kind === 'timeout') return message || 'Operacao excedeu o tempo limite de resposta do Supabase.';
  if (kind === 'abort') return 'A chamada ao Supabase foi abortada apos timeout para liberar a tela. Tente novamente e consulte o trace do Playwright se persistir.';
  if (kind === 'network') return 'Falha de rede ao acessar o Supabase. Verifique internet, URL/chave do projeto e bloqueios do navegador.';
  if (kind === 'rls') return 'Sem permissao para salvar neste tenant. Verifique se o usuario esta vinculado ao tenant ativo e se as politicas RLS foram aplicadas.';
  if (kind === 'schema') return `Schema remoto incompativel: ${message || 'colunas esperadas nao estao disponiveis.'}`;
  if (kind === 'missing-table') return `Migration pendente: tabela esperada nao esta disponivel no Supabase. ${message}`.trim();
  if (code === '23503' && /tenant_id|tenants/i.test(combined)) return 'Tenant ativo nao existe no Supabase ou nao esta disponivel para gravacao. Reabra o tenant ou verifique a migration multitenant.';
  if (code === '23503' && /client_id|clients/i.test(combined)) return 'Cliente invalido para esta oportunidade. Recarregue os dados do tenant e selecione um cliente do tenant ativo.';
  if (code === '23505' && /proposals_human_id_key|human_id bloqueando o versionamento/i.test(combined)) return 'Constraint legada de human_id esta bloqueando o versionamento. Rode a migration que remove proposals_human_id_key no Supabase.';
  if (code === '23505' && /proposals_tenant_proposal_number_version_key|numero e versao/i.test(combined)) return 'Ja existe uma proposta com este numero e versao neste tenant. Os dados foram recarregados; tente novamente.';
  if (kind === 'constraint') return message || 'Restricao do Supabase impediu a gravacao.';
  if (kind === 'edge-function') return message || 'Erro ao chamar Edge Function do Supabase.';
  return message || fallback;
};

const writeRequestLog = (log: SupabaseRequestLog) => {
  const line = `[supabase:${log.status}] ${log.label}${log.resource ? ` (${log.resource})` : ''} ${log.durationMs}ms`;
  if (log.status === 'ok') {
    console.debug(line, log);
  } else {
    console.warn(line, log);
  }
};

export const runSupabaseRequest = async <T>(
  operation: (signal?: AbortSignal) => Promise<T>,
  options: SupabaseRequestOptions
): Promise<T> => {
  const timeoutMs = options.timeoutMs ?? (options.optional ? OPTIONAL_SUPABASE_TIMEOUT_MS : DEFAULT_SUPABASE_TIMEOUT_MS);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const startedAt = Date.now();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const onOuterAbort = () => controller?.abort();
  options.signal?.addEventListener('abort', onOuterAbort, { once: true });

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller?.abort();
      reject(createSupabaseTimeoutError(options.label, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([operation(controller?.signal), timeoutPromise]);
    writeRequestLog({
      label: options.label,
      resource: options.resource,
      tenantId: options.tenantId,
      durationMs: Date.now() - startedAt,
      status: 'ok'
    });
    return result as T;
  } catch (error: any) {
    const normalized = normalizeSupabaseError(
      timedOut || isAbortLike(error) ? createSupabaseTimeoutError(options.label, timeoutMs) : error,
      options
    );
    writeRequestLog({
      label: options.label,
      resource: options.resource,
      tenantId: options.tenantId,
      durationMs: Date.now() - startedAt,
      status: 'error',
      kind: (normalized as any).kind,
      code: (normalized as any).code,
      requestId: (normalized as any).requestId,
      message: normalized.message
    });
    throw normalized;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', onOuterAbort);
  }
};

export const runSupabaseResponse = async <TData>(
  operation: (signal?: AbortSignal) => Promise<{ data: TData; error: any }>,
  options: SupabaseRequestOptions
): Promise<TData> => {
  const response = await runSupabaseRequest(operation, options);
  if (response.error) {
    const normalized = normalizeSupabaseError(response.error, options);
    writeRequestLog({
      label: options.label,
      resource: options.resource,
      tenantId: options.tenantId,
      durationMs: 0,
      status: 'error',
      kind: (normalized as any).kind,
      code: (normalized as any).code,
      requestId: (normalized as any).requestId,
      message: normalized.message
    });
    throw normalized;
  }
  return response.data;
};

export const runOptionalSupabaseResponse = async <TData>(
  operation: (signal?: AbortSignal) => Promise<{ data: TData; error: any }>,
  options: SupabaseRequestOptions,
  fallback: TData,
  isOptionalError?: (error: any) => boolean
): Promise<TData> => {
  try {
    return await runSupabaseResponse(operation, { ...options, optional: true });
  } catch (error: any) {
    if (isOptionalError?.(error) || options.optional) {
      console.warn(`[supabase:optional] ${options.label} indisponivel; usando fallback.`, error);
      return fallback;
    }
    throw error;
  }
};
