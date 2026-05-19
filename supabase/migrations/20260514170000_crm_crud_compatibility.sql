-- Keep the CRM repository compatible with the current app model and older foundation columns.

alter table public.proposals
  add column if not exists proposal_number text,
  add column if not exists proposal_type text,
  add column if not exists payload jsonb,
  add column if not exists human_id text,
  add column if not exists version_notes text,
  add column if not exists version_status text,
  add column if not exists is_current_version boolean not null default true,
  add column if not exists type text,
  add column if not exists client_name_snapshot text,
  add column if not exists stage text,
  add column if not exists status text,
  add column if not exists probability numeric,
  add column if not exists total_value numeric not null default 0,
  add column if not exists expiration_date date,
  add column if not exists full_data jsonb;

update public.proposals
set
  human_id = coalesce(human_id, proposal_number),
  type = coalesce(type, proposal_type),
  full_data = coalesce(full_data, payload),
  total_value = case
    when (total_value is null or total_value = 0)
      and (coalesce(full_data, payload)->>'value') ~ '^-?[0-9]+(\.[0-9]+)?$'
    then (coalesce(full_data, payload)->>'value')::numeric
    else coalesce(total_value, 0)
  end
where human_id is null
   or type is null
   or full_data is null;

create index if not exists proposals_tenant_updated_idx on public.proposals(tenant_id, updated_at desc);
create index if not exists proposals_tenant_total_value_idx on public.proposals(tenant_id, total_value);
create index if not exists crm_tasks_tenant_updated_idx on public.crm_tasks(tenant_id, updated_at desc);
create index if not exists crm_tasks_tenant_client_idx on public.crm_tasks(tenant_id, client_id);
create index if not exists crm_tasks_tenant_proposal_idx on public.crm_tasks(tenant_id, proposal_id);
