import { corsHeaders, getAuthedContext, jsonResponse, requireEnv } from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { tenantId, redirectTo } = await req.json();
    const context = await getAuthedContext(req, tenantId);
    const { data, error } = await context.serviceClient
      .from('crm_google_oauth_states')
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
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];
    const params = new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state: data.id
    });

    return jsonResponse({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao iniciar OAuth Google.' }, 400);
  }
});
