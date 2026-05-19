import { corsHeaders, getAuthedContext, jsonResponse } from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { tenantId } = await req.json();
    const context = await getAuthedContext(req, tenantId);
    const { data, error } = await context.serviceClient
      .from('crm_google_accounts')
      .select('id, google_email, scopes, status, sync_enabled, last_synced_at, error_message')
      .eq('tenant_id', context.tenantId)
      .eq('user_id', context.user.id)
      .maybeSingle();
    if (error) throw error;
    return jsonResponse({ connected: data?.status === 'CONNECTED', account: data || null });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao consultar Google.' }, 400);
  }
});
