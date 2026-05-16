create table if not exists public.crm_task_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.crm_tasks(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete set null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  storage_path text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_task_attachments_tenant_task_idx
  on public.crm_task_attachments(tenant_id, task_id);

create index if not exists crm_task_attachments_tenant_proposal_idx
  on public.crm_task_attachments(tenant_id, proposal_id);

alter table public.crm_task_attachments enable row level security;

drop policy if exists "members manage tenant task attachments" on public.crm_task_attachments;
create policy "members manage tenant task attachments"
  on public.crm_task_attachments for all
  using (
    public.is_platform_super_admin()
    or public.is_tenant_member(tenant_id)
  )
  with check (
    public.is_platform_super_admin()
    or public.is_tenant_member(tenant_id)
  );

grant select, insert, update, delete on public.crm_task_attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm-task-attachments',
  'crm-task-attachments',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members read tenant task attachment files" on storage.objects;
create policy "members read tenant task attachment files"
  on storage.objects for select
  using (
    bucket_id = 'crm-task-attachments'
    and split_part(name, '/', 1) = 'tenant'
    and (
      public.is_platform_super_admin()
      or public.is_tenant_member(split_part(name, '/', 2))
    )
  );

drop policy if exists "members upload tenant task attachment files" on storage.objects;
create policy "members upload tenant task attachment files"
  on storage.objects for insert
  with check (
    bucket_id = 'crm-task-attachments'
    and split_part(name, '/', 1) = 'tenant'
    and split_part(name, '/', 3) = 'tasks'
    and (
      public.is_platform_super_admin()
      or public.is_tenant_member(split_part(name, '/', 2))
    )
  );

drop policy if exists "members delete tenant task attachment files" on storage.objects;
create policy "members delete tenant task attachment files"
  on storage.objects for delete
  using (
    bucket_id = 'crm-task-attachments'
    and split_part(name, '/', 1) = 'tenant'
    and (
      public.is_platform_super_admin()
      or public.is_tenant_member(split_part(name, '/', 2))
    )
  );
