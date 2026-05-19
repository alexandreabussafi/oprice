alter table public.crm_communications
  add column if not exists gmail_internet_message_id text,
  add column if not exists email_in_reply_to text,
  add column if not exists email_references text;

create index if not exists crm_communications_gmail_internet_message_id_idx
  on public.crm_communications(tenant_id, gmail_internet_message_id)
  where gmail_internet_message_id is not null;

