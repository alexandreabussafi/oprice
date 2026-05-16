-- Tenant members seed, helper view, and branding storage policies.

insert into public.tenant_users (tenant_id, user_id, role, allowed_types, active)
select 'tenant-lubrim', p.id, 'SUPER_ADMIN', array['BOTH'], true
from public.profiles p
where lower(p.email) = 'alexandre.abussafi@gmail.com'
on conflict (tenant_id, user_id)
do update set role = excluded.role, allowed_types = excluded.allowed_types, active = true;

insert into public.tenant_users (tenant_id, user_id, role, allowed_types, active)
select 'tenant-lubrim', p.id, 'ADMIN', array['BOTH'], true
from public.profiles p
where lower(p.email) = 'tiago.ferrari@lubrin.com.br'
on conflict (tenant_id, user_id)
do update set role = excluded.role, allowed_types = excluded.allowed_types, active = true;

update public.tenants
set branding = branding || jsonb_build_object(
  'companyName', coalesce(branding ->> 'companyName', name),
  'displayName', coalesce(branding ->> 'displayName', name)
);

create or replace view public.tenant_user_profiles as
select
  tu.tenant_id,
  tu.user_id,
  p.email,
  p.full_name,
  p.platform_role,
  tu.role,
  tu.allowed_types,
  tu.active,
  tu.created_at
from public.tenant_users tu
join public.profiles p on p.id = tu.user_id;

grant select on public.tenant_user_profiles to authenticated;

insert into storage.buckets (id, name, public)
values ('branding-assets', 'branding-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "platform admins manage branding assets" on storage.objects;
create policy "platform admins manage branding assets"
  on storage.objects for all
  using (
    bucket_id = 'branding-assets'
    and public.is_platform_super_admin()
  )
  with check (
    bucket_id = 'branding-assets'
    and public.is_platform_super_admin()
  );

drop policy if exists "members read branding assets" on storage.objects;
create policy "members read branding assets"
  on storage.objects for select
  using (
    bucket_id = 'branding-assets'
    and (
      public.is_platform_super_admin()
      or public.is_tenant_member(split_part(name, '/', 2))
    )
  );
