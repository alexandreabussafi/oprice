-- Platform superadmin access for tenant administration.

create table if not exists public.platform_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.platform_admins (email)
values ('alexandre.abussafi@gmail.com')
on conflict (email) do nothing;

alter table public.profiles
  add column if not exists platform_role text not null default 'USER'
  check (platform_role in ('SUPER_ADMIN', 'USER'));

update public.profiles
set platform_role = 'SUPER_ADMIN'
where lower(email) = 'alexandre.abussafi@gmail.com';

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
  );
$$;

drop policy if exists "members can read tenants" on public.tenants;
create policy "members and platform admins can read tenants"
  on public.tenants for select
  using (public.is_platform_super_admin() or public.is_tenant_member(id));

create policy "platform admins manage tenants"
  on public.tenants for all
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());

drop policy if exists "members can read tenant memberships" on public.tenant_users;
create policy "members and platform admins can read tenant memberships"
  on public.tenant_users for select
  using (public.is_platform_super_admin() or public.is_tenant_member(tenant_id));

create policy "platform admins manage tenant memberships"
  on public.tenant_users for all
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());

create policy "platform admins manage tenant settings"
  on public.tenant_settings for all
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());
