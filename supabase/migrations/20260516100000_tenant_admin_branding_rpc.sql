-- Let tenant admins update only the branding JSON of their own tenant.

drop function if exists public.update_tenant_branding(text, jsonb);
drop function if exists public.update_tenant_branding(jsonb, text);

create or replace function public.update_tenant_branding(
  next_branding jsonb,
  target_tenant_id text
)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_tenant public.tenants;
begin
  if not public.is_tenant_admin(target_tenant_id) then
    raise exception 'Not allowed to update tenant branding';
  end if;

  update public.tenants
  set branding = coalesce(next_branding, '{}'::jsonb)
  where id = target_tenant_id
  returning * into updated_tenant;

  if updated_tenant.id is null then
    raise exception 'Tenant not found';
  end if;

  return updated_tenant;
end;
$$;

grant execute on function public.update_tenant_branding(jsonb, text) to authenticated;
