-- Tenant-scoped user sessions and activity audit.

create table if not exists public.tenant_user_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  current_route text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ENDED', 'EXPIRED')),
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_activity_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.tenant_user_sessions(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  route text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tenant_user_sessions_tenant_seen_idx
  on public.tenant_user_sessions(tenant_id, last_seen_at desc);

create index if not exists tenant_user_sessions_user_tenant_status_idx
  on public.tenant_user_sessions(user_id, tenant_id, status);

create index if not exists tenant_activity_events_tenant_created_idx
  on public.tenant_activity_events(tenant_id, created_at desc);

create index if not exists tenant_activity_events_user_created_idx
  on public.tenant_activity_events(user_id, created_at desc);

create or replace function public.can_read_tenant_audit(target_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_super_admin()
    or exists (
      select 1
      from public.tenant_users tu
      where tu.tenant_id = target_tenant_id
        and tu.user_id = auth.uid()
        and tu.active = true
        and tu.role in ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
    );
$$;

create or replace function public.purge_old_tenant_activity_events(retention interval default interval '180 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if current_user not in ('postgres', 'supabase_admin') and not public.is_platform_super_admin() then
    raise exception 'Apenas superadmins da plataforma podem limpar eventos de auditoria.';
  end if;

  delete from public.tenant_activity_events
  where created_at < now() - retention;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter table public.tenant_user_sessions enable row level security;
alter table public.tenant_activity_events enable row level security;

drop policy if exists "tenant audit readers read sessions" on public.tenant_user_sessions;
drop policy if exists "users insert own sessions" on public.tenant_user_sessions;
drop policy if exists "users update own sessions" on public.tenant_user_sessions;

create policy "tenant audit readers read sessions"
  on public.tenant_user_sessions for select
  using (public.can_read_tenant_audit(tenant_id) or user_id = auth.uid());

create policy "users insert own sessions"
  on public.tenant_user_sessions for insert
  with check (user_id = auth.uid() and public.is_tenant_member(tenant_id));

create policy "users update own sessions"
  on public.tenant_user_sessions for update
  using (user_id = auth.uid() and public.is_tenant_member(tenant_id))
  with check (user_id = auth.uid() and public.is_tenant_member(tenant_id));

drop policy if exists "tenant audit readers read events" on public.tenant_activity_events;
drop policy if exists "users insert own events" on public.tenant_activity_events;

create policy "tenant audit readers read events"
  on public.tenant_activity_events for select
  using (public.can_read_tenant_audit(tenant_id) or user_id = auth.uid());

create policy "users insert own events"
  on public.tenant_activity_events for insert
  with check (user_id = auth.uid() and public.is_tenant_member(tenant_id));

grant select, insert, update on public.tenant_user_sessions to authenticated;
grant select, insert on public.tenant_activity_events to authenticated;
grant execute on function public.purge_old_tenant_activity_events(interval) to authenticated;

comment on function public.purge_old_tenant_activity_events(interval)
  is 'Remove tenant_activity_events older than the retention window. Default retention is 180 days.';
