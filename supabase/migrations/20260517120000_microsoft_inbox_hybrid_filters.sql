alter table public.crm_communications
  add column if not exists source_mailbox_email text,
  add column if not exists source_mailbox_label text,
  add column if not exists source_mailbox_kind text
    check (source_mailbox_kind is null or source_mailbox_kind in ('personal', 'shared'));

create index if not exists crm_communications_source_mailbox_idx
  on public.crm_communications(tenant_id, provider, source_mailbox_email, triage_status, created_at desc);

update public.tenant_settings
set settings = jsonb_set(
    jsonb_set(
      coalesce(settings, '{}'::jsonb),
      '{microsoftWorkspace,personalInboxIntake}',
      jsonb_build_object(
        'enabled', false,
        'filters', jsonb_build_object(
          'ignoreNoReply', true,
          'ignoreAutoReplies', true,
          'ignoreNewsletters', true,
          'ignoredDomains', jsonb_build_array(),
          'ignoredSenders', jsonb_build_array(),
          'subjectExcludes', jsonb_build_array(),
          'allowedDomains', jsonb_build_array()
        )
      ),
      true
    ),
    '{microsoftWorkspace,sharedMailboxes}',
    coalesce((
      select jsonb_agg(
        mailbox
        || jsonb_build_object(
          'intakeMode', coalesce(mailbox->>'intakeMode', 'filtered'),
          'intakeStartAt', coalesce(mailbox->>'intakeStartAt', now()::text),
          'filters',
            jsonb_build_object(
              'ignoreNoReply', true,
              'ignoreAutoReplies', true,
              'ignoreNewsletters', true,
              'ignoredDomains', jsonb_build_array(),
              'ignoredSenders', jsonb_build_array(),
              'subjectExcludes', jsonb_build_array(),
              'allowedDomains', jsonb_build_array()
            )
            || coalesce(mailbox->'filters', '{}'::jsonb)
        )
      )
      from jsonb_array_elements(coalesce(settings #> '{microsoftWorkspace,sharedMailboxes}', '[]'::jsonb)) as mailbox
    ), '[]'::jsonb),
    true
  ),
  updated_at = now()
where settings #> '{microsoftWorkspace}' is not null;
