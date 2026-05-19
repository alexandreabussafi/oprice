import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const loadEnvFile = path => {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
};

loadEnvFile('.env');
loadEnvFile('.env.local');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const tenantId = process.env.E2E_TENANT_ID || 'tenant-lubcore';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const probe = async (label, queryFactory) => {
  const startedAt = Date.now();
  const { error } = await queryFactory();
  const durationMs = Date.now() - startedAt;
  const status = error ? 'error' : 'ok';
  const code = error?.code || error?.status || '';
  const message = error?.message || error?.details || '';
  console.log(JSON.stringify({ label, status, durationMs, code, message }));
  return { label, status, durationMs, code, message };
};

if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_EMAIL,
    password: process.env.E2E_PASSWORD
  });
  if (error) {
    console.error(`Auth failed: ${error.message}`);
    process.exit(1);
  }
  console.log(JSON.stringify({ label: 'auth', status: 'ok', email: process.env.E2E_EMAIL }));
} else {
  console.log(JSON.stringify({ label: 'auth', status: 'skipped', message: 'Set E2E_EMAIL/E2E_PASSWORD for authenticated probes.' }));
}

const probes = [
  ['tenant membership', () => supabase.from('tenant_users').select('tenant_id,user_id,role,active').eq('tenant_id', tenantId).limit(5)],
  ['tenants', () => supabase.from('tenants').select('id,slug,name,status').eq('id', tenantId).limit(1)],
  ['clients', () => supabase.from('clients').select('id,tenant_id,name').eq('tenant_id', tenantId).limit(1)],
  ['contacts', () => supabase.from('contacts').select('id,tenant_id,name').eq('tenant_id', tenantId).limit(1)],
  ['crm_tasks', () => supabase.from('crm_tasks').select('id,tenant_id').eq('tenant_id', tenantId).limit(1)],
  ['proposals', () => supabase.from('proposals').select('id,tenant_id,proposal_number,version').eq('tenant_id', tenantId).limit(1)],
  ['tenant_settings', () => supabase.from('tenant_settings').select('tenant_id').eq('tenant_id', tenantId).limit(1)],
  ['crm_task_attachments', () => supabase.from('crm_task_attachments').select('id,tenant_id').eq('tenant_id', tenantId).limit(1)],
  ['crm_communications', () => supabase.from('crm_communications').select('id,tenant_id').eq('tenant_id', tenantId).limit(1)],
  ['crm_external_events', () => supabase.from('crm_external_events').select('id,tenant_id').eq('tenant_id', tenantId).limit(1)]
];

const results = [];
for (const [label, queryFactory] of probes) {
  results.push(await probe(label, queryFactory));
}

const failures = results.filter(result => result.status !== 'ok');
if (failures.length > 0) {
  console.error(`Supabase smoke check failed for ${failures.length} probe(s).`);
  process.exit(1);
}
