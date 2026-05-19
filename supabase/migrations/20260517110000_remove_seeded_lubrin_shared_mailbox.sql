update public.tenant_settings
set settings = jsonb_set(
    settings,
    '{microsoftWorkspace,sharedMailboxes}',
    coalesce((
      select jsonb_agg(mailbox)
      from jsonb_array_elements(coalesce(settings #> '{microsoftWorkspace,sharedMailboxes}', '[]'::jsonb)) as mailbox
      where lower(mailbox->>'email') <> 'comercial@lubrin.com.br'
    ), '[]'::jsonb),
    true
  ),
  updated_at = now()
where settings #> '{microsoftWorkspace,sharedMailboxes}' is not null;
