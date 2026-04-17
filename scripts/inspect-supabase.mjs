import 'dotenv/config';
import dns from 'node:dns';
import { createClient } from '@supabase/supabase-js';

dns.setServers(['1.1.1.1', '8.8.8.8']);
const originalLookup = dns.lookup;
dns.lookup = function patchedLookup(hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? {} : (options || {});
  if (hostname.endsWith('.supabase.co')) {
    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses?.length) return originalLookup(hostname, opts, cb);
      if (opts.all) cb(null, addresses.map((address) => ({ address, family: 4 })));
      else cb(null, addresses[0], 4);
    });
    return;
  }
  originalLookup(hostname, opts, cb);
};

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('🔍 Inspecionando estado atual do projeto Supabase...\n');

console.log('📋 [1] Tabelas no schema public:');
const { data: tables, error: tErr } = await admin
  .schema('information_schema')
  .from('tables')
  .select('table_name, table_type')
  .eq('table_schema', 'public');
if (tErr) console.error(`   ❌ ${tErr.message}`);
else if (!tables?.length) console.log('   (nenhuma — schema público vazio)');
else tables.forEach((t) => console.log(`   - ${t.table_name} (${t.table_type})`));

console.log('\n👥 [2] Auth users:');
const { data: usersData, error: uErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 10 });
if (uErr) console.error(`   ❌ ${uErr.message}`);
else if (!usersData.users.length) console.log('   (nenhum usuário cadastrado)');
else usersData.users.forEach((u) => console.log(`   - ${u.email} (${u.id})`));

console.log('\n🪣 [3] Storage buckets:');
const { data: buckets, error: bErr } = await admin.storage.listBuckets();
if (bErr) console.error(`   ❌ ${bErr.message}`);
else if (!buckets?.length) console.log('   (nenhum bucket criado)');
else buckets.forEach((b) => console.log(`   - ${b.name} (${b.public ? 'public' : 'private'})`));

console.log('\n🔑 [4] Auth providers habilitados:');
console.log('   (não exposto via SDK; verificar no Dashboard → Authentication → Providers)');

console.log('\n✅ Inspeção concluída.');
