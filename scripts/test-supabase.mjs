import 'dotenv/config';
import dns from 'node:dns';
import { createClient } from '@supabase/supabase-js';

// Local DNS (192.168.5.1) trava ao resolver hostnames de projetos Supabase.
// dns.setServers só afeta dns.resolve*, NÃO dns.lookup (usado por fetch/undici).
// Patch: para hosts *.supabase.co, usar resolve4 com DNS público.
dns.setServers(['1.1.1.1', '8.8.8.8']);
const originalLookup = dns.lookup;
dns.lookup = function patchedLookup(hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? {} : (options || {});
  if (hostname.endsWith('.supabase.co')) {
    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses?.length) return originalLookup(hostname, opts, cb);
      if (opts.all) {
        cb(null, addresses.map((address) => ({ address, family: 4 })));
      } else {
        cb(null, addresses[0], 4);
      }
    });
    return;
  }
  originalLookup(hostname, opts, cb);
};

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const missing = [];
if (!url) missing.push('SUPABASE_URL');
if (!publishableKey) missing.push('SUPABASE_PUBLISHABLE_KEY');
if (!secretKey) missing.push('SUPABASE_SECRET_KEY');
if (missing.length) {
  console.error(`❌ Variáveis ausentes no .env: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`🌐 URL: ${url}`);
console.log(`🔑 Publishable: ${publishableKey.slice(0, 20)}... (${publishableKey.length} chars)`);
console.log(`🔒 Secret: ${secretKey.slice(0, 13)}...${secretKey.slice(-4)} (${secretKey.length} chars)\n`);

let allOk = true;

console.log('📡 [1/2] Testando publishable key (cliente público)...');
try {
  const publicClient = createClient(url, publishableKey);
  const { data, error } = await publicClient.auth.getSession();
  if (error) throw error;
  console.log(`   ✅ Conectou. Sessão atual: ${data.session ? 'ativa' : 'nenhuma (esperado)'}\n`);
} catch (err) {
  console.error(`   ❌ Falhou: ${err?.message ?? err}\n`);
  allOk = false;
}

console.log('🔐 [2/2] Testando secret key (cliente backend, bypassa RLS)...');
try {
  const adminClient = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw error;
  console.log(`   ✅ Acesso admin OK. Usuários no projeto: ${data.users.length === 0 ? '0 (esperado, projeto novo)' : data.users.length}\n`);
} catch (err) {
  console.error(`   ❌ Falhou: ${err?.message ?? err}\n`);
  allOk = false;
}

if (allOk) {
  console.log('🎉 Supabase 100% conectado. Pronto pra criar schema e configurar Google OAuth.');
} else {
  console.error('💥 Pelo menos um teste falhou. Confira as chaves no .env.');
  process.exit(2);
}
