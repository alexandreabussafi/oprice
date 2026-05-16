alter table public.crm_communications
  add column if not exists external_url text;

create index if not exists crm_communications_external_url_idx
  on public.crm_communications(tenant_id, external_url)
  where external_url is not null;
