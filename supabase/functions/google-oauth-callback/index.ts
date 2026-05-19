import { corsHeaders, encryptToken, fetchGoogleJson, getServiceClient, htmlResponse, requireEnv } from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error');

  try {
    if (oauthError) throw new Error(oauthError);
    if (!state || !code) throw new Error('Callback Google incompleto.');

    const serviceClient = getServiceClient();
    const { data: stateRow, error: stateError } = await serviceClient
      .from('crm_google_oauth_states')
      .select('*')
      .eq('id', state)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (stateError) throw stateError;
    if (!stateRow) throw new Error('Sessao OAuth expirada.');

    const tokenData = await fetchGoogleJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: requireEnv('GOOGLE_CLIENT_ID'),
        client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: requireEnv('GOOGLE_REDIRECT_URI')
      })
    });
    if (!tokenData.refresh_token) throw new Error('Google nao retornou refresh token. Revogue o app e conecte novamente.');

    const profile = await fetchGoogleJson('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const { error: upsertError } = await serviceClient
      .from('crm_google_accounts')
      .upsert({
        tenant_id: stateRow.tenant_id,
        user_id: stateRow.user_id,
        google_email: profile.email,
        refresh_token_ciphertext: await encryptToken(tokenData.refresh_token),
        scopes: String(tokenData.scope || '').split(' ').filter(Boolean),
        status: 'CONNECTED',
        sync_enabled: true,
        error_message: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,user_id' });
    if (upsertError) throw upsertError;

    await serviceClient.from('crm_google_oauth_states').delete().eq('id', stateRow.id);
    const redirectTo = stateRow.redirect_to || '/';
    const destination = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}google_connected=1`;
    return Response.redirect(destination, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao conectar Google.';
    return htmlResponse(`<html><body><h1>Erro ao conectar Google</h1><p>${message}</p></body></html>`, 400);
  }
});
