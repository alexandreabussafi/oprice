import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loadDotEnv = () => {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
};

loadDotEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_URL/SUPABASE_URL para provisionar os usuarios LubCore.');
  process.exit(1);
}

const restHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

const desiredUsers = [
  {
    email: 'vendedor@lubcore.com.br',
    fullName: 'Vendedor LubCore',
    role: 'SELLER',
    allowed_types: ['PRODUCTS']
  },
  {
    email: 'analista@lubcore.com.br',
    fullName: 'Analista LubCore',
    role: 'ANALYST',
    allowed_types: ['PRODUCTS']
  },
  {
    email: 'gestor@lubcore.com.br',
    fullName: 'Gestor LubCore',
    role: 'MANAGER',
    allowed_types: ['PRODUCTS', 'SERVICES']
  }
];

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...restHeaders,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.error || text || response.statusText;
    throw new Error(String(message));
  }
  return data;
};

const getSingle = async (table, params) => {
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('limit', '1');
  const rows = await requestJson(url);
  return Array.isArray(rows) ? rows[0] : null;
};

const upsertRow = async (table, row, onConflict) => {
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  if (onConflict) url.searchParams.set('on_conflict', onConflict);
  const data = await requestJson(url, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row)
  });
  return Array.isArray(data) ? data[0] : data;
};

const createAuthUser = async (user, password) => requestJson(`${supabaseUrl}/auth/v1/admin/users`, {
  method: 'POST',
  body: JSON.stringify({
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: user.fullName }
  })
});

const temporaryPassword = () => `${randomBytes(15).toString('base64url')}Aa1!`;

const tenant = await getSingle('tenants', {
  slug: 'eq.lubcore',
  select: 'id,name,slug'
});

if (!tenant?.id) {
  throw new Error('Tenant com slug lubcore nao encontrado.');
}

const results = [];

for (const user of desiredUsers) {
  const existingProfile = await getSingle('profiles', {
    email: `ilike.${user.email}`,
    select: 'id,email'
  });

  let userId = existingProfile?.id;
  let password = null;
  let created = false;

  if (!userId) {
    password = temporaryPassword();
    const authUser = await createAuthUser(user, password);
    userId = authUser?.user?.id || authUser?.id;
    if (!userId) throw new Error(`Nao foi possivel criar o usuario ${user.email}.`);
    created = true;
  }

  await upsertRow('profiles', {
    id: userId,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    allowed_types: user.allowed_types,
    platform_role: 'USER',
    default_tenant_id: tenant.id
  }, 'id');

  await upsertRow('tenant_users', {
    tenant_id: tenant.id,
    user_id: userId,
    role: user.role,
    allowed_types: user.allowed_types,
    active: true
  }, 'tenant_id,user_id');

  results.push({
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    allowed_types: user.allowed_types,
    tenant: tenant.slug,
    created,
    temporaryPassword: password
  });
}

console.log(JSON.stringify({ tenant, users: results }, null, 2));

