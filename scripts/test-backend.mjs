// Smoke test do backend: assume servidor já rodando em http://localhost:3001
// Cobre o fluxo: criar projeto → criar call manual → analisar com Gemini → cleanup.

const BASE = 'http://localhost:3002';
const AUTHOR = 'Cabral';

let projectId, callId;

async function step(label, fn) {
  process.stdout.write(`▶ ${label} ... `);
  try {
    const r = await fn();
    console.log('✅');
    return r;
  } catch (err) {
    console.log('❌');
    console.error(`   ${err.message}`);
    throw err;
  }
}

async function api(method, path, { body, multipart, headers = {} } = {}) {
  const opts = { method, headers: { 'x-author-name': AUTHOR, ...headers } };
  if (body && !multipart) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body && multipart) {
    opts.body = body; // FormData
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} em ${method} ${path}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

console.log('🧪 Smoke test do backend\n');

try {
  await step('GET /health', async () => {
    const r = await api('GET', '/health', { headers: {} });
    if (!r.ok) throw new Error('health não retornou ok');
  });

  const members = await step('GET /api/team-members', async () => {
    const r = await api('GET', '/api/team-members', { headers: {} });
    if (r.members.length !== 5) throw new Error(`esperado 5 membros, veio ${r.members.length}`);
    return r.members;
  });
  console.log(`   ${members.map(m => m.name).join(', ')}`);

  await step('POST sem x-author-name → 400', async () => {
    const res = await fetch(`${BASE}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x', client_name: 'y' }),
    });
    if (res.status !== 400) throw new Error(`esperado 400, veio ${res.status}`);
  });

  await step('POST com x-author-name inválido → 400', async () => {
    const res = await fetch(`${BASE}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-author-name': 'NinguemQueExiste' },
      body: JSON.stringify({ name: 'x', client_name: 'y' }),
    });
    if (res.status !== 400) throw new Error(`esperado 400, veio ${res.status}`);
  });

  const project = await step('POST /api/projects (cria projeto)', async () => {
    const r = await api('POST', '/api/projects', {
      body: {
        name: '__smoke_backend__',
        client_name: 'Acme SaaS',
        description: 'Cliente B2B SaaS de gestão financeira para PMEs.',
        planned_posts_count: 16,
        team: { manager: 'Ana', analysts: ['Cabral', 'Bruno'], strategists: ['Carla'] },
        contacts: [{ name: 'Maria CEO', email: 'maria@acme.com', role: 'CEO' }],
        reference_links: [{ label: 'Site', url: 'https://acme.example' }],
        status: 'active',
        start_date: '2026-04-01',
      },
    });
    if (r.project.author_name !== AUTHOR) throw new Error(`author_name esperado "${AUTHOR}"`);
    return r.project;
  });
  projectId = project.id;
  console.log(`   id: ${projectId}`);

  await step('GET /api/projects (lista contém o novo)', async () => {
    const r = await api('GET', '/api/projects', { headers: {} });
    if (!r.projects.find((p) => p.id === projectId)) throw new Error('projeto não está na lista');
  });

  await step('GET /api/projects/:id (com calls vazias)', async () => {
    const r = await api('GET', `/api/projects/${projectId}`, { headers: {} });
    if (r.project.id !== projectId) throw new Error('projeto errado');
    if (!Array.isArray(r.calls) || r.calls.length !== 0) throw new Error('calls deveriam estar vazias');
  });

  const call = await step('POST /api/projects/:id/calls (transcript manual)', async () => {
    const r = await api('POST', `/api/projects/${projectId}/calls`, {
      body: {
        title: 'Kickoff Acme',
        call_date: new Date().toISOString(),
        participants: [
          { name: 'Cabral', role: 'Analista' },
          { name: 'Maria CEO', role: 'CEO Cliente' },
        ],
        transcript: `[Falante A — Cabral]: Bom dia Maria, vamos revisar o briefing inicial e alinhar expectativas?

[Falante B — Maria]: Bom dia! Pode mandar. Estou animada com os primeiros posts que vocês mandaram, especialmente o reel sobre fluxo de caixa — teve ótimo engajamento.

[Falante A — Cabral]: Que bom! Esse reel performou 3x acima da média. Para a próxima quinzena, sugerimos 8 posts: 3 reels educativos sobre conciliação bancária, 2 carrosséis de cases, e 3 stories interativos.

[Falante B — Maria]: Gostei. Mas preciso que vocês tenham mais agilidade nas aprovações — está demorando 4 dias e perdemos timing. Pode ser 48h?

[Falante A — Cabral]: Concordo. Vou alinhar internamente e te mando um cronograma novo até sexta com SLA de 48h.

[Falante B — Maria]: Perfeito. Outra coisa: o time de vendas pediu pra termos um CTA mais forte nos posts. Pode incorporar?

[Falante A — Cabral]: Anotado. Vou passar pro Ana, ele tá liderando esse projeto pelo nosso lado.`,
      },
    });
    if (r.call.transcript_status !== 'transcribed') throw new Error(`status esperado transcribed`);
    if (r.call.author_name !== AUTHOR) throw new Error(`author_name errado`);
    return r.call;
  });
  callId = call.id;
  console.log(`   id: ${callId}`);

  console.log('   🤖 chamando Gemini para análise (pode levar 10-30s)...');
  const analysis = await step('POST /api/calls/:id/analyze (Gemini IA)', async () => {
    const r = await api('POST', `/api/calls/${callId}/analyze`);
    if (r.analysis.status !== 'done') throw new Error(`status esperado done, veio ${r.analysis.status}`);
    if (!r.analysis.summary || r.analysis.summary.length < 50) throw new Error('summary muito curto');
    if (!['positive', 'neutral', 'negative'].includes(r.analysis.sentiment)) {
      throw new Error(`sentiment inválido: ${r.analysis.sentiment}`);
    }
    if (!Array.isArray(r.analysis.tasks)) throw new Error('tasks não é array');
    return r.analysis;
  });
  console.log(`   sentiment: ${analysis.sentiment}`);
  console.log(`   tasks: ${analysis.tasks.length} | notes: ${analysis.notes.length} | feedback: ${analysis.feedback.length}`);
  console.log(`   summary: "${analysis.summary.slice(0, 120)}..."`);
  if (analysis.tasks.length > 0) {
    console.log(`   primeira task: "${analysis.tasks[0].description}"`);
  }

  await step('GET /api/calls/:id (com análise)', async () => {
    const r = await api('GET', `/api/calls/${callId}`, { headers: {} });
    if (!r.analysis || r.analysis.status !== 'done') throw new Error('análise não veio');
  });

  await step('PATCH /api/projects/:id (edita)', async () => {
    const r = await api('PATCH', `/api/projects/${projectId}`, {
      body: { status: 'paused' },
    });
    if (r.project.status !== 'paused') throw new Error('status não atualizou');
  });

  await step('DELETE /api/projects/:id (cascade)', async () => {
    const res = await fetch(`${BASE}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: { 'x-author-name': AUTHOR },
    });
    if (res.status !== 204) throw new Error(`esperado 204, veio ${res.status}`);
  });
  projectId = null;

  console.log('\n🎉 Backend funcionando end-to-end. MVP backend pronto.');
} catch (err) {
  if (projectId) {
    try { await fetch(`${BASE}/api/projects/${projectId}`, { method: 'DELETE', headers: { 'x-author-name': AUTHOR } }); } catch {}
  }
  console.error('\n💥 Smoke test falhou.');
  process.exit(1);
}
