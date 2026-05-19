-- Allow platform superadmins to manage tenant-scoped CRM data from the Superadmin tenant entry flow.

drop policy if exists "platform admins manage tenant clients" on public.clients;
create policy "platform admins manage tenant clients"
  on public.clients for all
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());

drop policy if exists "platform admins manage tenant contacts" on public.contacts;
create policy "platform admins manage tenant contacts"
  on public.contacts for all
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());

drop policy if exists "platform admins manage tenant tasks" on public.crm_tasks;
create policy "platform admins manage tenant tasks"
  on public.crm_tasks for all
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());

drop policy if exists "platform admins manage tenant proposals" on public.proposals;
create policy "platform admins manage tenant proposals"
  on public.proposals for all
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());
