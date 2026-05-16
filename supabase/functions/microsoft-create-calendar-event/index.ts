import {
  corsHeaders,
  fetchMicrosoftJson,
  getAuthedContext,
  getMicrosoftAccount,
  jsonResponse,
  parseEmailList,
  refreshMicrosoftAccessToken,
  taskPayload,
  toNullableUuid,
  toPlainSnippet
} from '../_shared/microsoft.ts';

const toGraphDateTime = (value: string) => value.replace(/\.\d{3}Z$/, '').replace(/Z$/, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const input = await req.json();
    const context = await getAuthedContext(req, input.tenantId);
    const account = await getMicrosoftAccount(context.serviceClient, context.tenantId, context.user.id);
    const accessToken = await refreshMicrosoftAccessToken(context.serviceClient, account);
    const attendeeEmails = parseEmailList(input.attendeeEmails);
    if (!input.title?.trim()) throw new Error('Informe o titulo da reuniao.');
    if (!input.startsAt || !input.endsAt) throw new Error('Informe inicio e fim da reuniao.');

    const event = await fetchMicrosoftJson('https://graph.microsoft.com/v1.0/me/calendar/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: input.title,
        body: {
          contentType: 'Text',
          content: input.description || ''
        },
        start: {
          dateTime: toGraphDateTime(input.startsAt),
          timeZone: 'UTC'
        },
        end: {
          dateTime: toGraphDateTime(input.endsAt),
          timeZone: 'UTC'
        },
        attendees: attendeeEmails.map(email => ({
          emailAddress: { address: email },
          type: 'required'
        })),
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness'
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
      description: toPlainSnippet(input.description || event.onlineMeeting?.joinUrl || ''),
      type: 'Meeting',
      status: 'To Do',
      dueDate: String(input.startsAt).slice(0, 10)
    });

    const { data: savedTask, error: taskError } = await context.serviceClient
      .from('crm_tasks')
      .insert({
        id: taskId,
        tenant_id: context.tenantId,
        client_id: toNullableUuid(input.clientId),
        contact_id: toNullableUuid(input.contactId),
        proposal_id: toNullableUuid(input.proposalId),
        payload: task,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
    if (taskError) throw taskError;

    const teamsLink = event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || null;
    const { data: externalEvent, error: externalEventError } = await context.serviceClient
      .from('crm_external_events')
      .insert({
        tenant_id: context.tenantId,
        client_id: toNullableUuid(input.clientId),
        contact_id: toNullableUuid(input.contactId),
        proposal_id: toNullableUuid(input.proposalId),
        task_id: taskId,
        user_id: context.user.id,
        provider: 'microsoft',
        event_type: 'calendar_event',
        external_event_id: event.id,
        title: input.title,
        description: input.description || null,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        attendee_emails: attendeeEmails,
        meet_link: teamsLink,
        html_link: event.webLink || null,
        sync_status: 'CREATED'
      })
      .select('*')
      .single();
    if (externalEventError) throw externalEventError;

    return jsonResponse({ task: savedTask, externalEvent });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao criar reuniao Microsoft.' }, 400);
  }
});
