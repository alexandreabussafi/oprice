create table if not exists public.crm_microsoft_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  microsoft_email text not null,
  microsoft_user_id text,
  refresh_token_ciphertext text not null,
  scopes text[] not null default '{}',
  status text not null default 'CONNECTED' check (status in ('CONNECTED', 'DISCONNECTED', 'ERROR')),
  sync_enabled boolean not null default true,
  inbox_delta_link text,
  sent_delta_link text,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.crm_microsoft_oauth_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_to text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create table if not exists public.crm_external_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  task_id uuid references public.crm_tasks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null check (provider in ('microsoft')),
  external_task_id text not null,
  external_task_list_id text,
  title text not null,
  due_date date,
  sync_status text not null default 'CREATED' check (sync_status in ('CREATED', 'SYNCED', 'ERROR', 'CANCELLED')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, external_task_id)
);

alter table public.crm_communications
  add column if not exists microsoft_message_id text,
  add column if not exists microsoft_conversation_id text,
  add column if not exists microsoft_internet_message_id text;

alter table public.crm_communications
  drop constraint if exists crm_communications_provider_check;
alter table public.crm_communications
  add constraint crm_communications_provider_check check (provider in ('google', 'microsoft', 'manual'));

alter table public.crm_external_events
  drop constraint if exists crm_external_events_provider_check;
alter table public.crm_external_events
  add constraint crm_external_events_provider_check check (provider in ('google', 'microsoft'));

create unique index if not exists crm_communications_microsoft_message_uidx
  on public.crm_communications(tenant_id, microsoft_message_id)
  where microsoft_message_id is not null;

create index if not exists crm_communications_microsoft_conversation_idx
  on public.crm_communications(tenant_id, microsoft_conversation_id)
  where microsoft_conversation_id is not null;

create index if not exists crm_microsoft_accounts_user_idx
  on public.crm_microsoft_accounts(user_id, tenant_id);

create index if not exists crm_external_tasks_tenant_task_idx
  on public.crm_external_tasks(tenant_id, task_id);

alter table public.crm_microsoft_accounts enable row level security;
alter table public.crm_microsoft_oauth_states enable row level security;
alter table public.crm_external_tasks enable row level security;

drop policy if exists "users can read own microsoft account status" on public.crm_microsoft_accounts;
create policy "users can read own microsoft account status"
  on public.crm_microsoft_accounts for select
  using (
    user_id = auth.uid()
    and (
      public.is_platform_super_admin()
      or public.is_tenant_member(tenant_id)
    )
  );

drop policy if exists "members manage tenant external tasks" on public.crm_external_tasks;
create policy "members manage tenant external tasks"
  on public.crm_external_tasks for all
  using (
    public.is_platform_super_admin()
    or public.is_tenant_member(tenant_id)
  )
  with check (
    public.is_platform_super_admin()
    or public.is_tenant_member(tenant_id)
  );

revoke all on public.crm_microsoft_accounts from authenticated;
grant select (
  id,
  tenant_id,
  user_id,
  microsoft_email,
  microsoft_user_id,
  scopes,
  status,
  sync_enabled,
  last_synced_at,
  error_message,
  created_at,
  updated_at
) on public.crm_microsoft_accounts to authenticated;

grant select, insert, update, delete on public.crm_external_tasks to authenticated;
