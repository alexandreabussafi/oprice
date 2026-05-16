-- Allow tenant admins to manage branding assets inside their own tenant folder.

insert into storage.buckets (id, name, public)
values ('branding-assets', 'branding-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "platform admins manage branding assets" on storage.objects;
drop policy if exists "tenant admins manage branding assets" on storage.objects;

create policy "tenant admins manage branding assets"
  on storage.objects for all
  using (
    bucket_id = 'branding-assets'
    and (
      public.is_platform_super_admin()
      or public.is_tenant_admin(split_part(name, '/', 2))
    )
  )
  with check (
    bucket_id = 'branding-assets'
    and split_part(name, '/', 1) = 'tenants'
    and (
      public.is_platform_super_admin()
      or public.is_tenant_admin(split_part(name, '/', 2))
    )
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
