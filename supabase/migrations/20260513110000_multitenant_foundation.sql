-- oPrice/RM multitenant foundation.
-- Apply after reviewing existing production table names and backup strategy.

create extension if not exists "pgcrypto";

create table if not exists public.tenants (
  id text primary key,
  name text not null,
  slug text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  enabled_modules text[] not null default array['CRM_CORE'],
  default_business_unit text not null default 'SERVICES' check (default_business_unit in ('SERVICES', 'PRODUCTS')),
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_users (
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'SELLER' check (role in ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'ANALYST')),
  allowed_types text[] not null default array['SERVICES'],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

alter table public.profiles
  add column if not exists default_tenant_id text references public.tenants(id);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  proposal_id uuid,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  proposal_number text not null,
  version integer not null default 1,
  is_current_version boolean not null default true,
  proposal_type text not null,
  pricing_module text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, proposal_number, version)
);

create table if not exists public.tenant_settings (
  tenant_id text primary key references public.tenants(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients
  add column if not exists tenant_id text references public.tenants(id);

alter table public.contacts
  add column if not exists tenant_id text references public.tenants(id);

alter table public.crm_tasks
  add column if not exists tenant_id text references public.tenants(id);

alter table public.proposals
  add column if not exists tenant_id text references public.tenants(id),
  add column if not exists pricing_module text;

update public.clients set tenant_id = 'tenant-lubrim' where tenant_id is null;
update public.contacts set tenant_id = 'tenant-lubrim' where tenant_id is null;
update public.crm_tasks set tenant_id = 'tenant-lubrim' where tenant_id is null;
update public.proposals set tenant_id = 'tenant-lubrim' where tenant_id is null;

alter table public.clients alter column tenant_id set not null;
alter table public.contacts alter column tenant_id set not null;
alter table public.crm_tasks alter column tenant_id set not null;
alter table public.proposals alter column tenant_id set not null;

create index if not exists clients_tenant_id_idx on public.clients(tenant_id);
create index if not exists contacts_tenant_id_idx on public.contacts(tenant_id);
create index if not exists crm_tasks_tenant_id_idx on public.crm_tasks(tenant_id);
create index if not exists proposals_tenant_id_idx on public.proposals(tenant_id);
create index if not exists tenant_users_user_id_idx on public.tenant_users(user_id);

create or replace function public.is_tenant_member(target_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = target_tenant_id
      and tu.user_id = auth.uid()
      and tu.active = true
  );
$$;

alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;
alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.proposals enable row level security;
alter table public.tenant_settings enable row level security;

create policy "members can read tenants"
  on public.tenants for select
  using (public.is_tenant_member(id));

create policy "members can read tenant memberships"
  on public.tenant_users for select
  using (public.is_tenant_member(tenant_id));

create policy "members manage tenant clients"
  on public.clients for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy "members manage tenant contacts"
  on public.contacts for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy "members manage tenant tasks"
  on public.crm_tasks for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy "members manage tenant proposals"
  on public.proposals for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy "members manage tenant settings"
  on public.tenant_settings for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

insert into public.tenants (id, name, slug, enabled_modules, default_business_unit, branding)
values
  ('tenant-lubrim', 'Lubrim', 'lubrim', array['CRM_CORE', 'SERVICES_COMPLEX', 'PRODUCT_SALES'], 'SERVICES', '{"logoUrl":"/logo.png","primaryColor":"#0f172a","secondaryColor":"#2563eb"}'::jsonb),
  ('tenant-saas', 'Software SaaS', 'software-saas', array['CRM_CORE', 'SAAS_SUBSCRIPTION'], 'PRODUCTS', '{"primaryColor":"#047857","secondaryColor":"#0f766e"}'::jsonb),
  ('tenant-iot', 'Sensores & Monitoramento', 'sensores-monitoramento', array['CRM_CORE', 'IOT_SUBSCRIPTION', 'PRODUCT_SALES'], 'PRODUCTS', '{"primaryColor":"#0369a1","secondaryColor":"#7c3aed"}'::jsonb)
on conflict (slug) do nothing;
