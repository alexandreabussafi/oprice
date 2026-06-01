-- Normalize tenant module flags without changing the stored text[] shape.

with normalized as (
  select
    id,
    array(
      select distinct module
      from unnest(array['CRM_CORE']::text[] || coalesce(enabled_modules, array[]::text[])) as module
      where module = any(array['CRM_CORE', 'SERVICES_COMPLEX', 'PRODUCT_SALES', 'SAAS_SUBSCRIPTION', 'IOT_SUBSCRIPTION']::text[])
    ) as modules
  from public.tenants
)
update public.tenants t
set
  enabled_modules = n.modules,
  default_business_unit = case
    when t.default_business_unit = 'SERVICES' and 'SERVICES_COMPLEX' = any(n.modules) then 'SERVICES'
    when t.default_business_unit = 'PRODUCTS' and (
      'PRODUCT_SALES' = any(n.modules)
      or 'SAAS_SUBSCRIPTION' = any(n.modules)
      or 'IOT_SUBSCRIPTION' = any(n.modules)
    ) then 'PRODUCTS'
    when 'SERVICES_COMPLEX' = any(n.modules) then 'SERVICES'
    when (
      'PRODUCT_SALES' = any(n.modules)
      or 'SAAS_SUBSCRIPTION' = any(n.modules)
      or 'IOT_SUBSCRIPTION' = any(n.modules)
    ) then 'PRODUCTS'
    else coalesce(t.default_business_unit, 'SERVICES')
  end
from normalized n
where t.id = n.id;

alter table public.tenants
  drop constraint if exists tenants_enabled_modules_known_check,
  drop constraint if exists tenants_enabled_modules_core_check;

alter table public.tenants
  add constraint tenants_enabled_modules_known_check
    check (enabled_modules <@ array['CRM_CORE', 'SERVICES_COMPLEX', 'PRODUCT_SALES', 'SAAS_SUBSCRIPTION', 'IOT_SUBSCRIPTION']::text[]),
  add constraint tenants_enabled_modules_core_check
    check ('CRM_CORE' = any(enabled_modules));
