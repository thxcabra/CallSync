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

console.log('🧪 Smoke test do schema 0003 (project sentiment auto-update)\n');

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

async function fetchProject() {
  const { data, error } = await admin.from('projects')
    .select('current_sentiment, last_analyzed_at').eq('id', projectId).single();
  if (error) throw error;
  return data;
}

try {
  const p = await step('cria projeto novo', async () => {
    const { data, error } = await admin.from('projects').insert({
      name: '__sentiment_test__', client_name: 'X',
    }).select('id, current_sentiment, last_analyzed_at').single();
    if (error) throw error;
    if (data.current_sentiment !== null) throw new Error('sentiment deveria começar NULL');
    return data;
  });
  projectId = p.id;

  // Cria 2 calls, datas diferentes
  const olderDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const newerDate = new Date().toISOString();

  const callOlder = await step('cria call ANTIGA (7 dias atrás)', async () => {
    const { data, error } = await admin.from('calls').insert({
      project_id: projectId, call_date: olderDate, transcript_source: 'manual', transcript: 'old',
    }).select().single();
    if (error) throw error;
    return data;
  });

  const callNewer = await step('cria call RECENTE (agora)', async () => {
    const { data, error } = await admin.from('calls').insert({
      project_id: projectId, call_date: newerDate, transcript_source: 'manual', transcript: 'new',
    }).select().single();
    if (error) throw error;
    return data;
  });

  await step('insere análise POSITIVE na call ANTIGA → projeto.sentiment = positive', async () => {
    const { error } = await admin.from('call_analyses').insert({
      call_id: callOlder.id, status: 'done', sentiment: 'positive',
      summary: 'old', sentiment_justification: 'x',
    });
    if (error) throw error;
    const proj = await fetchProject();
    if (proj.current_sentiment !== 'positive') throw new Error(`esperado positive, veio ${proj.current_sentiment}`);
    if (!proj.last_analyzed_at) throw new Error('last_analyzed_at não foi setado');
  });

  await step('insere análise NEGATIVE na call RECENTE → projeto.sentiment = negative (call mais nova vence)', async () => {
    const { error } = await admin.from('call_analyses').insert({
      call_id: callNewer.id, status: 'done', sentiment: 'negative',
      summary: 'new', sentiment_justification: 'y',
    });
    if (error) throw error;
    const proj = await fetchProject();
    if (proj.current_sentiment !== 'negative') throw new Error(`esperado negative, veio ${proj.current_sentiment}`);
  });

  await step('insere SEGUNDA análise (NEUTRAL) na call ANTIGA → projeto continua negative (não regride)', async () => {
    const { error } = await admin.from('call_analyses').insert({
      call_id: callOlder.id, status: 'done', sentiment: 'neutral',
      summary: 'old re-analyzed', sentiment_justification: 'z',
    });
    if (error) throw error;
    const proj = await fetchProject();
    if (proj.current_sentiment !== 'negative') throw new Error(`esperado negative (call recente vence), veio ${proj.current_sentiment}`);
  });

  await step('atualiza análise da call RECENTE pra sentiment=positive → projeto vira positive', async () => {
    const { data: latest } = await admin.from('call_analyses')
      .select('id').eq('call_id', callNewer.id)
      .order('created_at', { ascending: false }).limit(1).single();
    const { error } = await admin.from('call_analyses')
      .update({ sentiment: 'positive' }).eq('id', latest.id);
    if (error) throw error;
    const proj = await fetchProject();
    if (proj.current_sentiment !== 'positive') throw new Error(`esperado positive, veio ${proj.current_sentiment}`);
  });

  await step('deleta call RECENTE (cascade nas análises) → projeto cai pro sentimento da call ANTIGA (neutral)', async () => {
    const { error } = await admin.from('calls').delete().eq('id', callNewer.id);
    if (error) throw error;
    const proj = await fetchProject();
    if (proj.current_sentiment !== 'neutral') throw new Error(`esperado neutral, veio ${proj.current_sentiment}`);
  });

  await step('deleta call ANTIGA também → projeto sentiment volta pra null', async () => {
    const { error } = await admin.from('calls').delete().eq('id', callOlder.id);
    if (error) throw error;
    const proj = await fetchProject();
    if (proj.current_sentiment !== null) throw new Error(`esperado null, veio ${proj.current_sentiment}`);
    if (proj.last_analyzed_at !== null) throw new Error('last_analyzed_at deveria ser null');
  });

  await step('cleanup', async () => {
    const { error } = await admin.from('projects').delete().eq('id', projectId);
    if (error) throw error;
  });
  projectId = null;

  console.log('\n🎉 Migration 0003 validada. Trigger funciona em todos os cenários.');
} catch (err) {
  if (projectId) await admin.from('projects').delete().eq('id', projectId);
  console.error('\n💥 Smoke test falhou.');
  process.exit(1);
}
