-- Platform user administration for the Superadmin Portal.

create table if not exists public.platform_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists platform_role text not null default 'USER'
  check (platform_role in ('SUPER_ADMIN', 'USER')),
  add column if not exists default_tenant_id text references public.tenants(id);

alter table public.profiles enable row level security;

insert into public.platform_admins (email)
select lower(email)
from public.profiles
where platform_role = 'SUPER_ADMIN'
  and email is not null
on conflict (email) do nothing;

update public.profiles p
set platform_role = 'SUPER_ADMIN'
from public.platform_admins pa
where lower(pa.email) = lower(coalesce(p.email, ''));

drop policy if exists "platform admins read profiles" on public.profiles;
create policy "platform admins read profiles"
  on public.profiles for select
  using (public.is_platform_super_admin() or id = auth.uid());

drop policy if exists "platform admins update profiles" on public.profiles;
create policy "platform admins update profiles"
  on public.profiles for update
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());

grant select, update on public.profiles to authenticated;

create or replace function public.sync_platform_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.email is not null then
    if old.platform_role = 'SUPER_ADMIN' then
      delete from public.platform_admins pa
      where lower(pa.email) = lower(old.email)
        and not exists (
          select 1
          from public.profiles p
          where lower(coalesce(p.email, '')) = lower(old.email)
            and p.platform_role = 'SUPER_ADMIN'
        );
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.email is not null then
    if old.platform_role = 'SUPER_ADMIN'
      and (new.email is distinct from old.email or new.platform_role is distinct from old.platform_role) then
      delete from public.platform_admins pa
      where lower(pa.email) = lower(old.email)
        and not exists (
          select 1
          from public.profiles p
          where lower(coalesce(p.email, '')) = lower(old.email)
            and p.platform_role = 'SUPER_ADMIN'
            and p.id <> old.id
        );
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.platform_role = 'SUPER_ADMIN' and new.email is not null then
    insert into public.platform_admins (email)
    values (lower(new.email))
    on conflict (email) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_platform_admin_profile_trigger on public.profiles;
create trigger sync_platform_admin_profile_trigger
after insert or update or delete on public.profiles
for each row execute function public.sync_platform_admin_profile();
