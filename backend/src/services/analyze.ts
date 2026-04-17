import { gemini, GEMINI_MODEL } from '../lib/gemini.js';
import { supabase } from '../lib/supabase.js';
import { HttpError } from '../lib/errors.js';

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Resumo executivo da call em 3-5 parágrafos curtos.' },
    sentiment: {
      type: 'string',
      enum: ['positive', 'neutral', 'negative'],
      description: 'Sentimento geral DO CLIENTE durante a call.',
    },
    sentiment_justification: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          owner: { type: 'string' },
          due_date: { type: 'string', description: 'YYYY-MM-DD se mencionado' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['description'],
      },
    },
    notes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['topic', 'content'],
      },
    },
    feedback: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
          content: { type: 'string' },
        },
        required: ['topic', 'sentiment', 'content'],
      },
    },
  },
  required: ['summary', 'sentiment', 'sentiment_justification', 'tasks', 'notes', 'feedback'],
};

interface PreviousAnalysisCtx {
  call_date: string;
  summary: string | null;
  sentiment: string | null;
}

function buildPrompt(args: {
  project: any;
  previousAnalyses: PreviousAnalysisCtx[];
  call: any;
}): string {
  const { project, previousAnalyses, call } = args;

  const teamLines = project.team
    ? [
        project.team.manager && `Manager: ${project.team.manager}`,
        project.team.analysts?.length && `Analistas: ${project.team.analysts.join(', ')}`,
        project.team.strategists?.length && `Estrategistas: ${project.team.strategists.join(', ')}`,
      ].filter(Boolean).join('\n')
    : '(não informado)';

  const contactsStr = (project.contacts || [])
    .map((c: any) => `- ${c.name}${c.role ? ` (${c.role})` : ''}${c.email ? ` <${c.email}>` : ''}`)
    .join('\n') || '(nenhum)';

  const linksStr = (project.reference_links || [])
    .map((l: any) => `- ${l.label}: ${l.url}`)
    .join('\n') || '(nenhum)';

  const historyStr = previousAnalyses.length
    ? previousAnalyses.map((a, i) =>
        `### Call anterior ${i + 1} (${a.call_date})\nSentimento: ${a.sentiment ?? 'N/A'}\nResumo: ${a.summary ?? '(sem resumo)'}`
      ).join('\n\n')
    : '(esta é a primeira call analisada deste projeto)';

  const participantsStr = (call.participants || [])
    .map((p: any) => `- ${p.name}${p.role ? ` (${p.role})` : ''}`)
    .join('\n') || '(não informado)';

  return `Você é um analista sênior de marketing digital ajudando a moic.digital a documentar e extrair insights de calls com clientes.

# Contexto do projeto
**Cliente:** ${project.client_name}
**Projeto:** ${project.name}
**Descrição:** ${project.description || '(sem descrição)'}
**Status:** ${project.status}
**Posts planejados:** ${project.planned_posts_count ?? 'N/A'}

**Equipe:**
${teamLines}

**Pontos de contato:**
${contactsStr}

**Links de referência:**
${linksStr}

# Histórico — calls anteriores deste projeto
${historyStr}

# Call atual
**Data:** ${call.call_date}
**Título:** ${call.title || '(sem título)'}

**Participantes:**
${participantsStr}

## Transcrição completa
${call.transcript}

# Sua tarefa
Analise a call considerando o contexto do projeto e o histórico. Responda em JSON estruturado:

1. **summary**: resumo executivo em 3-5 parágrafos. Foque no que o cliente trouxe e no que ficou decidido.
2. **sentiment**: sentimento geral DO CLIENTE ('positive' | 'neutral' | 'negative').
3. **sentiment_justification**: por que esse sentimento, com paráfrases/citações curtas da transcrição.
4. **tasks**: ações concretas. Descrição obrigatória; se a transcrição mencionar responsável, prazo (YYYY-MM-DD) ou prioridade, inclua.
5. **notes**: pontos importantes que não viram tasks (insights, decisões estratégicas, contexto).
6. **feedback**: feedbacks específicos do cliente sobre campanhas/posts/trabalho. Cada um com tópico, sentimento e conteúdo.

Tudo em português brasileiro. Seja específico. Cite a transcrição quando útil.`;
}

export async function analyzeCall(callId: string, options: { authorName?: string } = {}) {
  const { data: call, error: callErr } = await supabase
    .from('calls').select('*').eq('id', callId).single();
  if (callErr || !call) throw new HttpError(404, 'Call não encontrada');
  if (!call.transcript) throw new HttpError(400, 'Call sem transcrição. Transcreva primeiro.');

  const { data: project, error: projErr } = await supabase
    .from('projects').select('*').eq('id', call.project_id).single();
  if (projErr || !project) throw new HttpError(404, 'Projeto não encontrado');

  // Últimas 5 calls anteriores deste projeto + análise mais recente de cada
  const { data: prevCalls } = await supabase
    .from('calls')
    .select('id, call_date')
    .eq('project_id', project.id)
    .neq('id', callId)
    .order('call_date', { ascending: false })
    .limit(5);

  const previousAnalyses: PreviousAnalysisCtx[] = [];
  for (const pc of prevCalls || []) {
    const { data: analyses } = await supabase
      .from('call_analyses')
      .select('summary, sentiment')
      .eq('call_id', pc.id)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(1);
    if (analyses?.[0]) {
      previousAnalyses.push({ ...analyses[0], call_date: pc.call_date });
    }
  }

  const { data: analysis, error: insErr } = await supabase
    .from('call_analyses')
    .insert({
      call_id: callId,
      status: 'analyzing',
      model_used: GEMINI_MODEL,
      author_name: options.authorName,
    })
    .select()
    .single();
  if (insErr || !analysis) throw new HttpError(500, `Falha ao criar registro de análise: ${insErr?.message}`);

  try {
    const prompt = buildPrompt({ project, previousAnalyses, call });

    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: ANALYSIS_SCHEMA as any,
      },
    });

    const raw = response.text ?? '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Gemini retornou JSON inválido: ${raw.slice(0, 200)}`);
    }

    const { data: updated, error: updErr } = await supabase
      .from('call_analyses')
      .update({
        status: 'done',
        summary: parsed.summary,
        sentiment: parsed.sentiment,
        sentiment_justification: parsed.sentiment_justification,
        tasks: parsed.tasks ?? [],
        notes: parsed.notes ?? [],
        feedback: parsed.feedback ?? [],
        raw_response: parsed,
      })
      .eq('id', analysis.id)
      .select()
      .single();
    if (updErr) throw new Error(`Falha ao salvar análise: ${updErr.message}`);

    return updated;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await supabase.from('call_analyses').update({
      status: 'failed',
      error_message: errMsg,
    }).eq('id', analysis.id);
    throw err;
  }
}
