import { supabase } from '../lib/supabase';
import {
  TenantActivityAction,
  TenantActivityEvent,
  TenantAuditEntityType,
  TenantSessionStatus,
  TenantUserActivitySummary,
  TenantUserSession
} from '../types';
import { classifySupabaseError, runOptionalSupabaseResponse, withAbortSignal } from './supabaseRequest';

type AuditRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

type TrackActivityInput = {
  tenantId: string;
  userId: string;
  action: TenantActivityAction;
  entityType: TenantAuditEntityType;
  entityId?: string | null;
  route?: string | null;
  metadata?: Record<string, any>;
};

type ListAuditFilters = {
  from?: string;
  to?: string;
  userId?: string;
  action?: TenantActivityAction | 'ALL';
  entityType?: TenantAuditEntityType | 'ALL';
  limit?: number;
};

let currentSessionId: string | null = null;
let currentSessionStartedAt: string | null = null;

const nowIso = () => new Date().toISOString();

const isMissingAuditTable = (error: any) => {
  const message = String(error?.message || error?.details || '');
  return classifySupabaseError(error) === 'missing-table'
    || /tenant_user_sessions|tenant_activity_events/i.test(message);
};

const getRoute = () => {
  if (typeof window === 'undefined') return null;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const toSession = (row: any): TenantUserSession => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.user_id,
  startedAt: row.started_at,
  lastSeenAt: row.last_seen_at,
  endedAt: row.ended_at,
  durationSeconds: Number(row.duration_seconds || 0),
  currentRoute: row.current_route,
  status: row.status || 'ACTIVE',
  userAgent: row.user_agent,
  createdAt: row.created_at || row.started_at
});

const toEvent = (row: any): TenantActivityEvent => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.user_id,
  sessionId: row.session_id,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  route: row.route,
  metadata: row.metadata || {},
  createdAt: row.created_at
});

const createEmptySummary = (tenantId: string, userId: string): TenantUserActivitySummary => ({
  tenantId,
  userId,
  activeSession: false,
  periodOnlineSeconds: 0,
  totalEvents: 0,
  clientsCreated: 0,
  clientsUpdated: 0,
  contactsCreated: 0,
  contactsUpdated: 0,
  tasksCreated: 0,
  tasksUpdated: 0,
  tasksCompleted: 0,
  proposalsCreated: 0,
  proposalsUpdated: 0,
  proposalsSent: 0,
  proposalVersionsCreated: 0,
  deletedRecords: 0
});

const secondsBetween = (start?: string | null, end?: string | null) => {
  if (!start) return 0;
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  return Math.round((endMs - startMs) / 1000);
};

export const auditRepository = {
  getCurrentSessionId: () => currentSessionId,

  async startUserSession(input: {
    tenantId: string;
    userId: string;
    route?: string | null;
    userAgent?: string | null;
  }, options: AuditRequestOptions = {}): Promise<TenantUserSession | null> {
    const startedAt = nowIso();
    const route = input.route ?? getRoute();

    await runOptionalSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('tenant_user_sessions')
          .update({
            status: 'EXPIRED',
            ended_at: startedAt,
            last_seen_at: startedAt
          })
          .eq('tenant_id', input.tenantId)
          .eq('user_id', input.userId)
          .eq('status', 'ACTIVE'),
        signal
      ),
      { label: 'Expirar sessoes anteriores', resource: 'tenant_user_sessions', tenantId: input.tenantId, timeoutMs: options.timeoutMs || 5000, signal: options.signal },
      null as any,
      isMissingAuditTable
    );

    const data = await runOptionalSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('tenant_user_sessions')
          .insert({
            tenant_id: input.tenantId,
            user_id: input.userId,
            started_at: startedAt,
            last_seen_at: startedAt,
            current_route: route,
            status: 'ACTIVE',
            user_agent: input.userAgent || null
          })
          .select('*')
          .single(),
        signal
      ),
      { label: 'Iniciar sessao de usuario', resource: 'tenant_user_sessions', tenantId: input.tenantId, timeoutMs: options.timeoutMs || 5000, signal: options.signal },
      null as any,
      isMissingAuditTable
    );

    if (!data) {
      currentSessionId = null;
      currentSessionStartedAt = null;
      return null;
    }

    const session = toSession(data);
    currentSessionId = session.id;
    currentSessionStartedAt = session.startedAt;
    return session;
  },

  async heartbeat(input: {
    tenantId: string;
    userId: string;
    sessionId?: string | null;
    route?: string | null;
  }, options: AuditRequestOptions = {}): Promise<void> {
    const sessionId = input.sessionId || currentSessionId;
    if (!sessionId) return;
    const seenAt = nowIso();
    const durationSeconds = secondsBetween(currentSessionStartedAt, seenAt);

    await runOptionalSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('tenant_user_sessions')
          .update({
            last_seen_at: seenAt,
            current_route: input.route ?? getRoute(),
            duration_seconds: durationSeconds
          })
          .eq('id', sessionId)
          .eq('tenant_id', input.tenantId)
          .eq('user_id', input.userId),
        signal
      ),
      { label: 'Atualizar presenca do usuario', resource: 'tenant_user_sessions', tenantId: input.tenantId, timeoutMs: options.timeoutMs || 5000, signal: options.signal },
      null as any,
      isMissingAuditTable
    );
  },

  async endUserSession(input: {
    tenantId: string;
    userId: string;
    sessionId?: string | null;
    status?: Extract<TenantSessionStatus, 'ENDED' | 'EXPIRED'>;
  }, options: AuditRequestOptions = {}): Promise<void> {
    const sessionId = input.sessionId || currentSessionId;
    if (!sessionId) return;
    const endedAt = nowIso();

    await runOptionalSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('tenant_user_sessions')
          .update({
            status: input.status || 'ENDED',
            ended_at: endedAt,
            last_seen_at: endedAt,
            duration_seconds: secondsBetween(currentSessionStartedAt, endedAt)
          })
          .eq('id', sessionId)
          .eq('tenant_id', input.tenantId)
          .eq('user_id', input.userId),
        signal
      ),
      { label: 'Encerrar sessao de usuario', resource: 'tenant_user_sessions', tenantId: input.tenantId, timeoutMs: options.timeoutMs || 5000, signal: options.signal },
      null as any,
      isMissingAuditTable
    );

    if (sessionId === currentSessionId) {
      currentSessionId = null;
      currentSessionStartedAt = null;
    }
  },

  async trackActivity(input: TrackActivityInput, options: AuditRequestOptions = {}): Promise<TenantActivityEvent | null> {
    const data = await runOptionalSupabaseResponse(
      signal => withAbortSignal(
        supabase
          .from('tenant_activity_events')
          .insert({
            tenant_id: input.tenantId,
            user_id: input.userId,
            session_id: currentSessionId,
            action: input.action,
            entity_type: input.entityType,
            entity_id: input.entityId || null,
            route: input.route ?? getRoute(),
            metadata: input.metadata || {}
          })
          .select('*')
          .single(),
        signal
      ),
      { label: 'Registrar atividade do usuario', resource: 'tenant_activity_events', tenantId: input.tenantId, timeoutMs: options.timeoutMs || 5000, signal: options.signal },
      null as any,
      isMissingAuditTable
    );
    return data ? toEvent(data) : null;
  },

  async listTenantUserSessions(tenantId: string, filters: ListAuditFilters = {}, options: AuditRequestOptions = {}): Promise<TenantUserSession[]> {
    const data = await runOptionalSupabaseResponse(
      signal => {
        let query = supabase
          .from('tenant_user_sessions')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('last_seen_at', { ascending: false })
          .limit(filters.limit || 1000);
        if (filters.from) query = query.gte('started_at', filters.from);
        if (filters.to) query = query.lte('started_at', filters.to);
        if (filters.userId) query = query.eq('user_id', filters.userId);
        return withAbortSignal(query, signal);
      },
      { label: 'Listar sessoes do tenant', resource: 'tenant_user_sessions', tenantId, timeoutMs: options.timeoutMs || 7000, signal: options.signal },
      [] as any[],
      isMissingAuditTable
    );
    return (data || []).map(toSession);
  },

  async listTenantActivityEvents(tenantId: string, filters: ListAuditFilters = {}, options: AuditRequestOptions = {}): Promise<TenantActivityEvent[]> {
    const data = await runOptionalSupabaseResponse(
      signal => {
        let query = supabase
          .from('tenant_activity_events')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(filters.limit || 500);
        if (filters.from) query = query.gte('created_at', filters.from);
        if (filters.to) query = query.lte('created_at', filters.to);
        if (filters.userId) query = query.eq('user_id', filters.userId);
        if (filters.action && filters.action !== 'ALL') query = query.eq('action', filters.action);
        if (filters.entityType && filters.entityType !== 'ALL') query = query.eq('entity_type', filters.entityType);
        return withAbortSignal(query, signal);
      },
      { label: 'Listar eventos de auditoria', resource: 'tenant_activity_events', tenantId, timeoutMs: options.timeoutMs || 7000, signal: options.signal },
      [] as any[],
      isMissingAuditTable
    );
    return (data || []).map(toEvent);
  },

  async refreshTenantUserActivity(tenantId: string, filters: ListAuditFilters = {}, options: AuditRequestOptions = {}) {
    const [sessions, events] = await Promise.all([
      this.listTenantUserSessions(tenantId, filters, options),
      this.listTenantActivityEvents(tenantId, { ...filters, limit: filters.limit || 1000 }, options)
    ]);

    const summaries = new Map<string, TenantUserActivitySummary>();
    const ensureSummary = (userId: string) => {
      if (!summaries.has(userId)) summaries.set(userId, createEmptySummary(tenantId, userId));
      return summaries.get(userId)!;
    };

    sessions.forEach(session => {
      const summary = ensureSummary(session.userId);
      if (!summary.lastSeenAt || new Date(session.lastSeenAt).getTime() > new Date(summary.lastSeenAt).getTime()) {
        summary.lastSeenAt = session.lastSeenAt;
      }
      if (!summary.lastLoginAt || new Date(session.startedAt).getTime() > new Date(summary.lastLoginAt).getTime()) {
        summary.lastLoginAt = session.startedAt;
      }
      const lastSeenMs = new Date(session.lastSeenAt).getTime();
      if (session.status === 'ACTIVE' && Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs <= 5 * 60 * 1000) {
        summary.activeSession = true;
      }
      summary.periodOnlineSeconds += session.endedAt
        ? Math.max(session.durationSeconds, secondsBetween(session.startedAt, session.endedAt))
        : Math.max(session.durationSeconds, secondsBetween(session.startedAt));
    });

    events.forEach(event => {
      const summary = ensureSummary(event.userId);
      summary.totalEvents += 1;
      if (event.action === 'DELETE') summary.deletedRecords += 1;
      if (event.entityType === 'client' && event.action === 'CREATE') summary.clientsCreated += 1;
      if (event.entityType === 'client' && event.action === 'UPDATE') summary.clientsUpdated += 1;
      if (event.entityType === 'contact' && event.action === 'CREATE') summary.contactsCreated += 1;
      if (event.entityType === 'contact' && event.action === 'UPDATE') summary.contactsUpdated += 1;
      if (event.entityType === 'task' && event.action === 'CREATE') summary.tasksCreated += 1;
      if (event.entityType === 'task' && event.action === 'UPDATE') summary.tasksUpdated += 1;
      if (event.entityType === 'task' && (event.metadata?.status === 'Done' || event.metadata?.status === 'Completed')) summary.tasksCompleted += 1;
      if (event.entityType === 'proposal' && event.action === 'CREATE') summary.proposalsCreated += 1;
      if (event.entityType === 'proposal' && event.action === 'UPDATE') summary.proposalsUpdated += 1;
      if (event.entityType === 'proposal' && event.action === 'SEND') summary.proposalsSent += 1;
      if (event.entityType === 'proposal' && event.action === 'VERSION_CREATE') summary.proposalVersionsCreated += 1;
    });

    return {
      sessions,
      events,
      summaries: Array.from(summaries.values())
    };
  }
};
