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

console.log('🧪 Smoke test do schema 0001\n');

let projectId, callId, analysisId;

async function step(label, fn) {
  process.stdout.write(`▶ ${label} ... `);
  try {
    const result = await fn();
    console.log('✅');
    return result;
  } catch (err) {
    console.log('❌');
    console.error(`   ${err.message ?? err}`);
    throw err;
  }
}

try {
  // 1. Criar projeto
  const project = await step('insert projects', async () => {
    const { data, error } = await admin.from('projects').insert({
      name: '__smoke_test__',
      client_name: 'Cliente Teste',
      description: 'Projeto criado por smoke test, deletar.',
      planned_posts_count: 12,
      team: { manager: 'João', analysts: ['Ana', 'Bruno'], strategists: ['Carla'] },
      contacts: [{ name: 'Cliente', email: 'cliente@example.com', phone: '+55...', role: 'CEO' }],
      reference_links: [{ label: 'Site', url: 'https://example.com' }],
      campaign_docs: [{ name: 'Briefing Q2', url: 'https://example.com/brief.pdf', type: 'pdf' }],
      start_date: '2026-04-17',
      status: 'active',
    }).select().single();
    if (error) throw error;
    return data;
  });
  projectId = project.id;
  console.log(`   id: ${projectId}`);

  // 2. Criar call
  const call = await step('insert calls (FK + check constraint)', async () => {
    const { data, error } = await admin.from('calls').insert({
      project_id: projectId,
      title: 'Kickoff fake',
      call_date: new Date().toISOString(),
      participants: [{ name: 'João', role: 'PM' }, { name: 'Cliente', role: 'CEO' }],
      transcript: 'Transcrição fake do smoke test.',
      transcript_source: 'manual',
      transcript_status: 'transcribed',
    }).select().single();
    if (error) throw error;
    return data;
  });
  callId = call.id;

  // 3. Criar análise
  const analysis = await step('insert call_analyses (sentiment check)', async () => {
    const { data, error } = await admin.from('call_analyses').insert({
      call_id: callId,
      status: 'done',
      summary: 'Cliente alinhou expectativas e pediu mais agilidade.',
      sentiment: 'positive',
      sentiment_justification: 'Tom geral construtivo e expectativa clara.',
      tasks: [{ description: 'Mandar cronograma', owner: 'Ana', priority: 'high' }],
      notes: [{ topic: 'Tom de voz', content: 'Manter informal, sem jargões' }],
      feedback: [{ topic: 'Reels', sentiment: 'positive', content: 'Gostou dos cortes' }],
      model_used: 'gemini-2.5-flash-lite',
      raw_response: { fake: true },
    }).select().single();
    if (error) throw error;
    return data;
  });
  analysisId = analysis.id;

  // 4. Criar notion_integration (testar UNIQUE(project_id))
  await step('insert notion_integrations (UNIQUE project_id)', async () => {
    const { error } = await admin.from('notion_integrations').insert({
      project_id: projectId,
      calendar_database_id: 'fake_cal_db',
      kanban_database_id: 'fake_kanban_db',
      history_page_id: 'fake_history_page',
    });
    if (error) throw error;
  });

  // 5. Tentar UNIQUE violation (esperado falhar)
  await step('UNIQUE(project_id) bloqueia duplicata', async () => {
    const { error } = await admin.from('notion_integrations').insert({
      project_id: projectId,
      calendar_database_id: 'outro',
    });
    if (!error) throw new Error('Era pra falhar mas passou');
    if (!error.message.toLowerCase().includes('duplicate') && error.code !== '23505') {
      throw new Error(`Erro errado: ${error.message}`);
    }
  });

  // 6. Tentar sentiment inválido (esperado falhar)
  await step('CHECK constraint bloqueia sentiment inválido', async () => {
    const { error } = await admin.from('call_analyses').insert({
      call_id: callId,
      sentiment: 'super_positivo_demais',
    });
    if (!error) throw new Error('Era pra falhar mas passou');
    if (error.code !== '23514') throw new Error(`Erro errado: ${error.message}`);
  });

  // 7. Verificar trigger updated_at
  const before = analysis.updated_at;
  await new Promise((r) => setTimeout(r, 1100));
  const updated = await step('trigger updated_at incrementa em UPDATE', async () => {
    const { data, error } = await admin.from('call_analyses')
      .update({ summary: 'Resumo atualizado' })
      .eq('id', analysisId)
      .select()
      .single();
    if (error) throw error;
    if (data.updated_at === before) throw new Error('updated_at não mudou');
    return data;
  });

  // 8. Verificar bucket call-audio
  await step('bucket call-audio existe e é privado', async () => {
    const { data, error } = await admin.storage.listBuckets();
    if (error) throw error;
    const bucket = data.find((b) => b.name === 'call-audio');
    if (!bucket) throw new Error('bucket não encontrado');
    if (bucket.public) throw new Error('bucket está público (deveria ser privado)');
  });

  // 9. Cascade delete (deletar projeto deve apagar tudo)
  await step('CASCADE delete: projeto → call → análise → notion_integration', async () => {
    const { error } = await admin.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    const { count: remainingCalls } = await admin.from('calls').select('*', { count: 'exact', head: true }).eq('id', callId);
    const { count: remainingAnalyses } = await admin.from('call_analyses').select('*', { count: 'exact', head: true }).eq('id', analysisId);
    const { count: remainingNotion } = await admin.from('notion_integrations').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
    if (remainingCalls !== 0 || remainingAnalyses !== 0 || remainingNotion !== 0) {
      throw new Error(`Cascade falhou: calls=${remainingCalls}, analyses=${remainingAnalyses}, notion=${remainingNotion}`);
    }
  });
  projectId = null; // já deletado, não precisa cleanup

  console.log('\n🎉 Schema 100% validado. Pronto pra Camada 2 (Google OAuth).');
} catch (err) {
  console.error('\n💥 Smoke test falhou.');
  // Cleanup defensivo
  if (projectId) {
    await admin.from('projects').delete().eq('id', projectId);
    console.log('🧹 Projeto de teste removido.');
  }
  process.exit(1);
}
