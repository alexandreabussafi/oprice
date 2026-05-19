import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

const requireEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const validRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'ANALYST']);
const validAccesses = new Set(['SERVICES', 'PRODUCTS', 'BOTH']);
const validPlatformRoles = new Set(['SUPER_ADMIN', 'USER']);

const normalizeAccesses = (value: unknown): string[] => {
  const raw = Array.isArray(value) ? value : [];
  const next = raw.filter(item => typeof item === 'string' && validAccesses.has(item));
  return next.length > 0 ? Array.from(new Set(next)) : ['BOTH'];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Metodo nao permitido.' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) throw new Error('Sessao obrigatoria.');

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const serviceClient = createClient(supabaseUrl, requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
    const authClient = createClient(supabaseUrl, requireEnv('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: requesterData, error: requesterError } = await authClient.auth.getUser();
    if (requesterError || !requesterData.user) throw new Error('Sessao invalida.');

    const requesterEmail = requesterData.user.email?.toLowerCase() || '';
    const { data: requesterProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('platform_role')
      .eq('id', requesterData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const body = await req.json();
    const tenantId = String(body.tenantId || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    const requestedRole = validRoles.has(body.role) ? body.role : 'SELLER';
    const requestedPlatformRole = validPlatformRoles.has(body.platformRole) ? body.platformRole : 'USER';

    const { data: adminRow, error: adminError } = await serviceClient
      .from('platform_admins')
      .select('email')
      .ilike('email', requesterEmail)
      .maybeSingle();
    if (adminError) throw adminError;

    const isPlatformAdmin = requesterProfile?.platform_role === 'SUPER_ADMIN' || !!adminRow;
    let isTenantAdmin = false;
    if (tenantId) {
      const { data: membership, error: membershipLookupError } = await serviceClient
        .from('tenant_users')
        .select('role, active')
        .eq('tenant_id', tenantId)
        .eq('user_id', requesterData.user.id)
        .maybeSingle();
      if (membershipLookupError) throw membershipLookupError;
      isTenantAdmin = membership?.active === true && ['SUPER_ADMIN', 'ADMIN'].includes(membership.role);
    }

    const platformRole = isPlatformAdmin ? requestedPlatformRole : 'USER';
    const role = !isPlatformAdmin && requestedRole === 'SUPER_ADMIN' ? 'ADMIN' : requestedRole;
    const allowedTypes = platformRole === 'SUPER_ADMIN' ? ['BOTH'] : normalizeAccesses(body.allowed_types);

    if (platformRole === 'SUPER_ADMIN' && !isPlatformAdmin) {
      throw new Error('Apenas superadmins da plataforma podem criar superadmins.');
    }
    if (!isPlatformAdmin && !isTenantAdmin) {
      throw new Error('Apenas administradores do tenant podem criar usuarios.');
    }

    if (!email || !password || !fullName) throw new Error('Nome, e-mail e senha sao obrigatorios.');
    if (password.length < 6) throw new Error('A senha temporaria deve ter pelo menos 6 caracteres.');
    if (platformRole !== 'SUPER_ADMIN' && !tenantId) throw new Error('Tenant obrigatorio para usuario comum.');

    let userId: string | undefined;
    const { data: existingProfile, error: existingProfileError } = await serviceClient
      .from('profiles')
      .select('id, platform_role')
      .ilike('email', email)
      .maybeSingle();
    if (existingProfileError) throw existingProfileError;

    if (existingProfile?.id) {
      if (platformRole !== 'SUPER_ADMIN') {
        throw new Error('Este e-mail ja existe. Use Vincular usuario para adiciona-lo ao tenant.');
      }
      userId = existingProfile.id;
    } else {
      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      if (createError) throw createError;
      userId = created.user?.id;
    }

    if (!userId) throw new Error('Nao foi possivel obter o id do usuario criado.');

    const effectiveTenantId = platformRole === 'SUPER_ADMIN' ? null : tenantId;
    const { error: upsertProfileError } = await serviceClient
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: platformRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : role,
        allowed_types: allowedTypes,
        platform_role: platformRole,
        default_tenant_id: effectiveTenantId
      }, { onConflict: 'id' });
    if (upsertProfileError) throw upsertProfileError;

    if (platformRole === 'SUPER_ADMIN') {
      const { error: adminUpsertError } = await serviceClient
        .from('platform_admins')
        .upsert({ email });
      if (adminUpsertError) throw adminUpsertError;

      const { data: tenants, error: tenantsError } = await serviceClient
        .from('tenants')
        .select('id');
      if (tenantsError) throw tenantsError;

      const memberships = (tenants || []).map((tenant: { id: string }) => ({
        tenant_id: tenant.id,
        user_id: userId,
        role: 'SUPER_ADMIN',
        allowed_types: ['BOTH'],
        active: true
      }));
      if (memberships.length > 0) {
        const { error: membershipError } = await serviceClient
          .from('tenant_users')
          .upsert(memberships, { onConflict: 'tenant_id,user_id' });
        if (membershipError) throw membershipError;
      }
    } else {
      const { error: membershipError } = await serviceClient
        .from('tenant_users')
        .upsert({
          tenant_id: tenantId,
          user_id: userId,
          role,
          allowed_types: allowedTypes,
          active: true
        }, { onConflict: 'tenant_id,user_id' });
      if (membershipError) throw membershipError;
    }

    return jsonResponse({ userId, email });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao criar usuario.' }, 400);
  }
});
