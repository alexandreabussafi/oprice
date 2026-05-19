alter table public.crm_communications
  add column if not exists triage_status text not null default 'LINKED'
    check (triage_status in ('NEW', 'LINKED', 'IGNORED')),
  add column if not exists triaged_at timestamptz,
  add column if not exists triaged_by uuid references auth.users(id) on delete set null,
  add column if not exists triage_notes text;

update public.crm_communications
set triage_status = 'NEW'
where provider = 'microsoft'
  and direction = 'inbound'
  and client_id is null
  and contact_id is null
  and proposal_id is null
  and task_id is null
  and triage_status = 'LINKED';

create index if not exists crm_communications_triage_idx
  on public.crm_communications(tenant_id, provider, triage_status, created_at desc);
