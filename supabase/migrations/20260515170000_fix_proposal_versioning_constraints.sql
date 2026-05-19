-- Fix proposal versioning constraints.
-- `human_id` is a display/reference identifier and must be reusable across versions.

alter table public.proposals
  drop constraint if exists proposals_human_id_key;

update public.proposals
set
  proposal_number = coalesce(proposal_number, human_id, full_data->>'proposalId', payload->>'proposalId', id::text),
  human_id = coalesce(human_id, proposal_number, full_data->>'proposalId', payload->>'proposalId', id::text)
where proposal_number is null
   or human_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.proposals'::regclass
      and c.contype = 'u'
      and (
        select array_agg(a.attname::text order by key_cols.ordinality)
        from unnest(c.conkey) with ordinality as key_cols(attnum, ordinality)
        join pg_attribute a
          on a.attrelid = c.conrelid
         and a.attnum = key_cols.attnum
      ) = array['tenant_id', 'proposal_number', 'version']::text[]
  ) then
    alter table public.proposals
      add constraint proposals_tenant_proposal_number_version_key
      unique (tenant_id, proposal_number, version);
  end if;
end $$;

with ranked_versions as (
  select
    id,
    row_number() over (
      partition by tenant_id, proposal_number
      order by version desc, updated_at desc, created_at desc, id desc
    ) as current_rank
  from public.proposals
  where is_current_version = true
)
update public.proposals p
set is_current_version = false,
    updated_at = now()
from ranked_versions rv
where p.id = rv.id
  and rv.current_rank > 1;

create index if not exists proposals_human_id_idx
  on public.proposals(human_id);

create unique index if not exists proposals_one_current_version_uidx
  on public.proposals(tenant_id, proposal_number)
  where is_current_version = true;
