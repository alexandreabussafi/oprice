import {
  corsHeaders,
  fetchGoogleJson,
  getAuthedContext,
  getGoogleAccount,
  jsonResponse,
  parseEmailList,
  refreshGoogleAccessToken,
  taskPayload,
  toPlainSnippet
} from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const input = await req.json();
    const context = await getAuthedContext(req, input.tenantId);
    const account = await getGoogleAccount(context.serviceClient, context.tenantId, context.user.id);
    const accessToken = await refreshGoogleAccessToken(context.serviceClient, account);
    const attendeeEmails = parseEmailList(input.attendeeEmails);
    if (!input.title?.trim()) throw new Error('Informe o titulo da reuniao.');
    if (!input.startsAt || !input.endsAt) throw new Error('Informe inicio e fim da reuniao.');

    const event = await fetchGoogleJson('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: input.title,
        description: input.description || '',
        start: { dateTime: input.startsAt },
        end: { dateTime: input.endsAt },
        attendees: attendeeEmails.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      })
    });

    const taskId = crypto.randomUUID();
    const task = taskPayload({
      id: taskId,
      tenantId: context.tenantId,
      clientId: input.clientId,
      contactId: input.contactId,
      proposalId: input.proposalId,
      assignee: context.user.email,
      title: input.title,
      description: toPlainSnippet(input.description || event.hangoutLink || ''),
      type: 'Meeting',
      status: 'To Do',
      dueDate: String(input.startsAt).slice(0, 10)
    });

    const { data: savedTask, error: taskError } = await context.serviceClient
      .from('crm_tasks')
      .insert({
        id: taskId,
        tenant_id: context.tenantId,
        client_id: input.clientId || null,
        contact_id: input.contactId || null,
        proposal_id: input.proposalId || null,
        payload: task,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
    if (taskError) throw taskError;

    const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === 'video')?.uri || null;
    const { data: externalEvent, error: externalEventError } = await context.serviceClient
      .from('crm_external_events')
      .insert({
        tenant_id: context.tenantId,
        client_id: input.clientId || null,
        contact_id: input.contactId || null,
        proposal_id: input.proposalId || null,
        task_id: taskId,
        user_id: context.user.id,
        provider: 'google',
        event_type: 'calendar_event',
        external_event_id: event.id,
        title: input.title,
        description: input.description || null,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        attendee_emails: attendeeEmails,
        meet_link: meetLink,
        html_link: event.htmlLink || null,
        sync_status: 'CREATED'
      })
      .select('*')
      .single();
    if (externalEventError) throw externalEventError;

    return jsonResponse({ task: savedTask, externalEvent });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao criar reuniao Google.' }, 400);
  }
});
