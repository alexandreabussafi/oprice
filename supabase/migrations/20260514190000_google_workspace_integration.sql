create table if not exists public.crm_google_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  google_email text not null,
  refresh_token_ciphertext text not null,
  scopes text[] not null default '{}',
  status text not null default 'CONNECTED' check (status in ('CONNECTED', 'DISCONNECTED', 'ERROR')),
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.crm_google_oauth_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_to text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create table if not exists public.crm_communications (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  task_id uuid references public.crm_tasks(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'google' check (provider in ('google', 'manual')),
  channel text not null default 'email' check (channel in ('email', 'calendar')),
  direction text not null check (direction in ('outbound', 'inbound')),
  subject text,
  body_preview text,
  from_email text,
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  gmail_message_id text,
  gmail_thread_id text,
  gmail_history_id text,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_external_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  task_id uuid references public.crm_tasks(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'google' check (provider in ('google')),
  event_type text not null default 'calendar_event' check (event_type in ('calendar_event')),
  external_event_id text not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  attendee_emails text[] not null default '{}',
  meet_link text,
  html_link text,
  sync_status text not null default 'CREATED' check (sync_status in ('CREATED', 'SYNCED', 'ERROR', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, external_event_id)
);

create unique index if not exists crm_communications_google_message_uidx
  on public.crm_communications(tenant_id, gmail_message_id)
  where gmail_message_id is not null;

create index if not exists crm_communications_tenant_proposal_idx
  on public.crm_communications(tenant_id, proposal_id, created_at desc);

create index if not exists crm_communications_tenant_client_idx
  on public.crm_communications(tenant_id, client_id, created_at desc);

create index if not exists crm_communications_google_thread_idx
  on public.crm_communications(tenant_id, gmail_thread_id)
  where gmail_thread_id is not null;

create index if not exists crm_external_events_tenant_proposal_idx
  on public.crm_external_events(tenant_id, proposal_id, starts_at desc);

create index if not exists crm_google_accounts_user_idx
  on public.crm_google_accounts(user_id, tenant_id);

alter table public.crm_google_accounts enable row level security;
alter table public.crm_google_oauth_states enable row level security;
alter table public.crm_communications enable row level security;
alter table public.crm_external_events enable row level security;

drop policy if exists "users can read own google account status" on public.crm_google_accounts;
create policy "users can read own google account status"
  on public.crm_google_accounts for select
  using (
    user_id = auth.uid()
    and (
      public.is_platform_super_admin()
      or public.is_tenant_member(tenant_id)
    )
  );

drop policy if exists "members manage tenant communications" on public.crm_communications;
create policy "members manage tenant communications"
  on public.crm_communications for all
  using (
    public.is_platform_super_admin()
    or public.is_tenant_member(tenant_id)
  )
  with check (
    public.is_platform_super_admin()
    or public.is_tenant_member(tenant_id)
  );

drop policy if exists "members manage tenant external events" on public.crm_external_events;
create policy "members manage tenant external events"
  on public.crm_external_events for all
  using (
    public.is_platform_super_admin()
    or public.is_tenant_member(tenant_id)
  )
  with check (
    public.is_platform_super_admin()
    or public.is_tenant_member(tenant_id)
  );

revoke all on public.crm_google_accounts from authenticated;
grant select (
  id,
  tenant_id,
  user_id,
  google_email,
  scopes,
  status,
  sync_enabled,
  last_synced_at,
  error_message,
  created_at,
  updated_at
) on public.crm_google_accounts to authenticated;
grant select, insert, update, delete on public.crm_communications to authenticated;
grant select, insert, update, delete on public.crm_external_events to authenticated;
