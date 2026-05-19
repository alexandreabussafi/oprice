alter table public.crm_microsoft_accounts
  add column if not exists mailbox_delta_links jsonb not null default '{}'::jsonb;

with shared_mailbox as (
  select jsonb_build_object(
    'email', 'comercial@lubrin.com.br',
    'label', 'Comercial Lubrin',
    'enabled', true
  ) as config
),
target_tenants as (
  select id
  from public.tenants
  where lower(slug) in ('lubcore', 'lubrin')
     or lower(name) like '%lubrin%'
)
insert into public.tenant_settings (tenant_id, settings, updated_at)
select
  target_tenants.id,
  jsonb_build_object(
    'microsoftWorkspace',
    jsonb_build_object('sharedMailboxes', jsonb_build_array(shared_mailbox.config))
  ),
  now()
from target_tenants
cross join shared_mailbox
on conflict (tenant_id) do update
set settings = jsonb_set(
    coalesce(public.tenant_settings.settings, '{}'::jsonb),
    '{microsoftWorkspace,sharedMailboxes}',
    case
      when coalesce(public.tenant_settings.settings #> '{microsoftWorkspace,sharedMailboxes}', '[]'::jsonb)
        @> jsonb_build_array((select config from shared_mailbox))
        then coalesce(public.tenant_settings.settings #> '{microsoftWorkspace,sharedMailboxes}', '[]'::jsonb)
      else coalesce(public.tenant_settings.settings #> '{microsoftWorkspace,sharedMailboxes}', '[]'::jsonb)
        || jsonb_build_array((select config from shared_mailbox))
    end,
    true
  ),
  updated_at = now();
