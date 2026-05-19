import {
  corsHeaders,
  describeCaughtError,
  fetchMicrosoftJson,
  getAuthedContext,
  getMicrosoftAccount,
  jsonResponse,
  refreshMicrosoftAccessToken,
  taskPayload,
  toNullableUuid,
  toPlainSnippet
} from '../_shared/microsoft.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const input = await req.json();
    const context = await getAuthedContext(req, input.tenantId);
    if (!input.title?.trim()) throw new Error('Informe o titulo da tarefa.');
    if (!input.dueDate) throw new Error('Informe o prazo da tarefa.');

    const taskId = crypto.randomUUID();
    const task = taskPayload({
      id: taskId,
      tenantId: context.tenantId,
      clientId: input.clientId,
      contactId: input.contactId,
      proposalId: input.proposalId,
      assignee: context.user.email,
      title: input.title,
      description: toPlainSnippet(input.description),
      type: input.type || 'Follow-up',
      status: 'To Do',
      dueDate: input.dueDate
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

    try {
      const account = await getMicrosoftAccount(context.serviceClient, context.tenantId, context.user.id);
      const accessToken = await refreshMicrosoftAccessToken(context.serviceClient, account);
      const lists = await fetchMicrosoftJson('https://graph.microsoft.com/v1.0/me/todo/lists', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const list = lists.value?.find((item: any) => item.wellknownListName === 'defaultList') || lists.value?.[0];
      if (!list?.id) throw new Error('Nao foi possivel localizar uma lista do Microsoft To Do.');

      const todoTask = await fetchMicrosoftJson(`https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: input.title,
          body: {
            content: input.description || '',
            contentType: 'text'
          },
          dueDateTime: {
            dateTime: `${input.dueDate}T17:00:00`,
            timeZone: 'UTC'
          }
        })
      });

      const { data: externalTask, error: externalTaskError } = await context.serviceClient
        .from('crm_external_tasks')
        .insert({
          tenant_id: context.tenantId,
          task_id: taskId,
          user_id: context.user.id,
          provider: 'microsoft',
          external_task_id: todoTask.id,
          external_task_list_id: list.id,
          title: input.title,
          due_date: input.dueDate,
          sync_status: 'CREATED'
        })
        .select('*')
        .single();
      if (externalTaskError) throw externalTaskError;

      return jsonResponse({ task: savedTask, externalTask });
    } catch (todoError) {
      const detail = describeCaughtError(todoError, 'Erro ao criar tarefa no Microsoft To Do.');
      console.error('microsoft-create-todo-task external sync failed', { taskId, error: detail });
      return jsonResponse({
        task: savedTask,
        externalTask: null,
        todoError: `Atividade criada no CRM, mas nao sincronizada com Microsoft To Do: ${detail}`
      });
    }
  } catch (error) {
    const detail = describeCaughtError(error, 'Erro ao criar tarefa Microsoft To Do.');
    console.error('microsoft-create-todo-task failed', { error: detail });
    return jsonResponse({ error: detail }, 400);
  }
});
