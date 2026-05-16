-- Harden tenant user administration and profile visibility.

create or replace function public.is_tenant_admin(target_tenant_id text)
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
        and tu.role in ('SUPER_ADMIN', 'ADMIN')
    );
$$;

create or replace function public.can_read_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or public.is_platform_super_admin()
    or exists (
      select 1
      from public.tenant_users reader
      join public.tenant_users target
        on target.tenant_id = reader.tenant_id
      where reader.user_id = auth.uid()
        and reader.active = true
        and target.user_id = target_user_id
    );
$$;

alter table public.tenant_users enable row level security;

drop policy if exists "members and platform admins can read tenant memberships" on public.tenant_users;
drop policy if exists "members can read tenant memberships" on public.tenant_users;
drop policy if exists "platform admins manage tenant memberships" on public.tenant_users;
drop policy if exists "tenant admins manage tenant memberships" on public.tenant_users;

create policy "members and platform admins can read tenant memberships"
  on public.tenant_users for select
  using (public.is_platform_super_admin() or public.is_tenant_member(tenant_id));

create policy "tenant admins manage tenant memberships"
  on public.tenant_users for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

alter table public.profiles enable row level security;

drop policy if exists "platform admins read profiles" on public.profiles;
drop policy if exists "tenant shared profiles read" on public.profiles;

create policy "tenant shared profiles read"
  on public.profiles for select
  using (public.can_read_profile(id));

drop policy if exists "platform admins update profiles" on public.profiles;
create policy "platform admins update profiles"
  on public.profiles for update
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());

alter view public.tenant_user_profiles set (security_invoker = true);

grant select on public.tenant_user_profiles to authenticated;
grant select, update on public.profiles to authenticated;
