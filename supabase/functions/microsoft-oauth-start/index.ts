import { corsHeaders, getAuthedContext, jsonResponse, requireEnv } from '../_shared/microsoft.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { tenantId, redirectTo } = await req.json();
    const context = await getAuthedContext(req, tenantId);
    const { data, error } = await context.serviceClient
      .from('crm_microsoft_oauth_states')
      .insert({
        tenant_id: context.tenantId,
        user_id: context.user.id,
        redirect_to: redirectTo || null
      })
      .select('id')
      .single();
    if (error) throw error;

    const scopes = [
      'openid',
      'email',
      'profile',
      'offline_access',
      'User.Read',
      'Mail.Send',
      'Mail.Read',
      'Calendars.ReadWrite',
      'Tasks.ReadWrite'
    ];
    const params = new URLSearchParams({
      client_id: requireEnv('MICROSOFT_CLIENT_ID'),
      redirect_uri: requireEnv('MICROSOFT_REDIRECT_URI'),
      response_type: 'code',
      response_mode: 'query',
      scope: scopes.join(' '),
      state: data.id,
      prompt: 'select_account'
    });

    return jsonResponse({ authUrl: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}` });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao iniciar OAuth Microsoft.' }, 400);
  }
});
