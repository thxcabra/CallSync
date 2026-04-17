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

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('🧪 Smoke test do schema 0002\n');

let projectId;

async function step(label, fn) {
  process.stdout.write(`▶ ${label} ... `);
  try {
    const r = await fn();
    console.log('✅');
    return r;
  } catch (err) {
    console.log('❌');
    console.error(`   ${err.message ?? err}`);
    throw err;
  }
}

try {
  const members = await step('team_members tem 5 linhas com roles corretos', async () => {
    const { data, error } = await admin.from('team_members').select('name, role, active').order('name');
    if (error) throw error;
    if (data.length !== 5) throw new Error(`esperado 5, veio ${data.length}`);
    const expected = {
      'Ana': 'manager',
      'Cabral': 'analista',
      'Carla': 'manager',
      'Bruno': 'analista',
      'Diego': 'CEO',
    };
    for (const m of data) {
      if (expected[m.name] !== m.role) throw new Error(`${m.name} esperado role ${expected[m.name]}, veio ${m.role}`);
      if (m.active !== true) throw new Error(`${m.name} deveria estar active`);
    }
    return data;
  });
  console.log(`   ${members.map(m => `${m.name} (${m.role})`).join(', ')}`);

  await step('UNIQUE em team_members.name bloqueia duplicata', async () => {
    const { error } = await admin.from('team_members').insert({ name: 'Cabral' });
    if (!error) throw new Error('era pra falhar');
    if (error.code !== '23505') throw new Error(`erro errado: ${error.message}`);
  });

  const project = await step('projects.author_name aceita insert', async () => {
    const { data, error } = await admin.from('projects').insert({
      name: '__smoke_0002__',
      client_name: 'Cliente',
      author_name: 'Cabral',
    }).select().single();
    if (error) throw error;
    if (data.author_name !== 'Cabral') throw new Error('author_name não persistiu');
    return data;
  });
  projectId = project.id;

  await step('calls.author_name aceita insert', async () => {
    const { data, error } = await admin.from('calls').insert({
      project_id: projectId,
      call_date: new Date().toISOString(),
      transcript_source: 'manual',
      transcript: 'fake',
      author_name: 'Bruno',
    }).select().single();
    if (error) throw error;
    if (data.author_name !== 'Bruno') throw new Error('author_name não persistiu');

    const { data: analysis, error: aErr } = await admin.from('call_analyses').insert({
      call_id: data.id,
      author_name: 'Ana',
    }).select().single();
    if (aErr) throw aErr;
    if (analysis.author_name !== 'Ana') throw new Error('author_name não persistiu em call_analyses');
  });

  await step('cleanup', async () => {
    const { error } = await admin.from('projects').delete().eq('id', projectId);
    if (error) throw error;
  });
  projectId = null;

  console.log('\n🎉 Migration 0002 validada. Pronto pra Camada 3 (backend Express).');
} catch (err) {
  if (projectId) await admin.from('projects').delete().eq('id', projectId);
  console.error('\n💥 Smoke test falhou.');
  process.exit(1);
}
