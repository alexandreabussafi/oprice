import { corsHeaders, getAuthedContext, jsonResponse } from '../_shared/microsoft.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { tenantId } = await req.json();
    const context = await getAuthedContext(req, tenantId);
    const { error } = await context.serviceClient
      .from('crm_microsoft_accounts')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('user_id', context.user.id);
    if (error) throw error;
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao desconectar Microsoft.' }, 400);
  }
});
