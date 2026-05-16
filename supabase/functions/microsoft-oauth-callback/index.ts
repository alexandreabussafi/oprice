import { corsHeaders, encryptToken, fetchMicrosoftJson, getServiceClient, htmlResponse, requireEnv } from '../_shared/microsoft.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');

  try {
    if (oauthError) throw new Error(oauthError);
    if (!state || !code) throw new Error('Callback Microsoft incompleto.');

    const serviceClient = getServiceClient();
    const { data: stateRow, error: stateError } = await serviceClient
      .from('crm_microsoft_oauth_states')
      .select('*')
      .eq('id', state)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (stateError) throw stateError;
    if (!stateRow) throw new Error('Sessao OAuth expirada.');

    const tokenData = await fetchMicrosoftJson('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: requireEnv('MICROSOFT_CLIENT_ID'),
        client_secret: requireEnv('MICROSOFT_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: requireEnv('MICROSOFT_REDIRECT_URI'),
        scope: 'openid email profile offline_access User.Read Mail.Send Mail.Read Calendars.ReadWrite Tasks.ReadWrite'
      })
    });
    if (!tokenData.refresh_token) throw new Error('Microsoft nao retornou refresh token. Conecte novamente.');

    const profile = await fetchMicrosoftJson('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const email = profile.mail || profile.userPrincipalName;
    if (!email) throw new Error('Nao foi possivel identificar o e-mail Microsoft conectado.');

    const { error: upsertError } = await serviceClient
      .from('crm_microsoft_accounts')
      .upsert({
        tenant_id: stateRow.tenant_id,
        user_id: stateRow.user_id,
        microsoft_email: email,
        microsoft_user_id: profile.id || null,
        refresh_token_ciphertext: await encryptToken(tokenData.refresh_token),
        scopes: String(tokenData.scope || '').split(' ').filter(Boolean),
        status: 'CONNECTED',
        sync_enabled: true,
        error_message: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,user_id' });
    if (upsertError) throw upsertError;

    await serviceClient.from('crm_microsoft_oauth_states').delete().eq('id', stateRow.id);
    const redirectTo = stateRow.redirect_to || '/';
    const destination = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}microsoft_connected=1`;
    return Response.redirect(destination, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao conectar Microsoft.';
    return htmlResponse(`<html><body><h1>Erro ao conectar Microsoft</h1><p>${message}</p></body></html>`, 400);
  }
});
