-- Ensure tenant-scoped CRM writes work for tenant members and platform admins.

create table if not exists public.platform_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists platform_role text not null default 'USER'
  check (platform_role in ('SUPER_ADMIN', 'USER'));

alter table public.proposals
  add column if not exists tenant_id text references public.tenants(id),
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists proposal_number text,
  add column if not exists version integer not null default 1,
  add column if not exists is_current_version boolean not null default true,
  add column if not exists proposal_type text,
  add column if not exists pricing_module text,
  add column if not exists payload jsonb,
  add column if not exists human_id text,
  add column if not exists version_notes text,
  add column if not exists version_status text,
  add column if not exists type text,
  add column if not exists client_name_snapshot text,
  add column if not exists stage text,
  add column if not exists status text,
  add column if not exists probability numeric,
  add column if not exists total_value numeric not null default 0,
  add column if not exists expiration_date date,
  add column if not exists full_data jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.platform_role = 'SUPER_ADMIN'
  );
$$;

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

insert into public.tenant_users (tenant_id, user_id, role, allowed_types, active)
select t.id, p.id, 'SUPER_ADMIN', array['BOTH'], true
from public.tenants t
cross join public.profiles p
where p.platform_role = 'SUPER_ADMIN'
   or exists (
     select 1
     from public.platform_admins pa
     where lower(pa.email) = lower(coalesce(p.email, ''))
   )
on conflict (tenant_id, user_id)
do update set role = 'SUPER_ADMIN', allowed_types = array['BOTH'], active = true;

alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.proposals enable row level security;
alter table public.tenant_settings enable row level security;

drop policy if exists "members manage tenant clients" on public.clients;
drop policy if exists "platform admins manage tenant clients" on public.clients;
drop policy if exists "tenant members and platform admins manage clients" on public.clients;
create policy "tenant members and platform admins manage clients"
  on public.clients for all
  using (public.is_platform_super_admin() or public.is_tenant_member(tenant_id))
  with check (public.is_platform_super_admin() or public.is_tenant_member(tenant_id));

drop policy if exists "members manage tenant contacts" on public.contacts;
drop policy if exists "platform admins manage tenant contacts" on public.contacts;
drop policy if exists "tenant members and platform admins manage contacts" on public.contacts;
create policy "tenant members and platform admins manage contacts"
  on public.contacts for all
  using (public.is_platform_super_admin() or public.is_tenant_member(tenant_id))
  with check (public.is_platform_super_admin() or public.is_tenant_member(tenant_id));

drop policy if exists "members manage tenant tasks" on public.crm_tasks;
drop policy if exists "platform admins manage tenant tasks" on public.crm_tasks;
drop policy if exists "tenant members and platform admins manage tasks" on public.crm_tasks;
create policy "tenant members and platform admins manage tasks"
  on public.crm_tasks for all
  using (public.is_platform_super_admin() or public.is_tenant_member(tenant_id))
  with check (public.is_platform_super_admin() or public.is_tenant_member(tenant_id));

drop policy if exists "members manage tenant proposals" on public.proposals;
drop policy if exists "platform admins manage tenant proposals" on public.proposals;
drop policy if exists "tenant members and platform admins manage proposals" on public.proposals;
create policy "tenant members and platform admins manage proposals"
  on public.proposals for all
  using (public.is_platform_super_admin() or public.is_tenant_member(tenant_id))
  with check (public.is_platform_super_admin() or public.is_tenant_member(tenant_id));

drop policy if exists "members manage tenant settings" on public.tenant_settings;
drop policy if exists "platform admins manage tenant settings" on public.tenant_settings;
drop policy if exists "tenant members and platform admins manage settings" on public.tenant_settings;
create policy "tenant members and platform admins manage settings"
  on public.tenant_settings for all
  using (public.is_platform_super_admin() or public.is_tenant_member(tenant_id))
  with check (public.is_platform_super_admin() or public.is_tenant_member(tenant_id));

create index if not exists proposals_tenant_updated_idx on public.proposals(tenant_id, updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.proposals'::regclass
      and c.contype = 'u'
      and (
        select array_agg(a.attname::text order by key_cols.ordinality)
        from unnest(c.conkey) with ordinality as key_cols(attnum, ordinality)
        join pg_attribute a
          on a.attrelid = c.conrelid
         and a.attnum = key_cols.attnum
      ) = array['tenant_id', 'proposal_number', 'version']::text[]
  ) then
    alter table public.proposals
      add constraint proposals_tenant_proposal_number_version_key
      unique (tenant_id, proposal_number, version);
  end if;
end $$;
