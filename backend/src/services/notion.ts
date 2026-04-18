import { Client } from '@notionhq/client';
import { supabase } from '../lib/supabase.js';
import { env } from '../lib/env.js';
import { HttpError } from '../lib/errors.js';

const notion = new Client({ auth: env.NOTION_API_TOKEN });

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
};
const SENTIMENT_EMOJIS: Record<string, string> = {
  positive: '✅',
  neutral: '💬',
  negative: '⚠️',
};
const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

function rt(text: string) {
  return [{ type: 'text' as const, text: { content: (text ?? '').slice(0, 2000) } }];
}

function normalizeNotionId(id: string): string {
  const s = id.trim().replace(/-/g, '');
  if (s.length === 32)
    return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
  return id.trim();
}

// ----------------------------------------------------------------
// Per-project workspace
// ----------------------------------------------------------------
interface ProjectWorkspace {
  projectPageId: string;
  kanbanDbId: string;
  calendarDbId: string;
  historyPageId: string;
}

async function getProjectWorkspace(projectId: string): Promise<ProjectWorkspace> {
  const { data: project } = await supabase
    .from('projects')
    .select('notion_page_id, notion_kanban_db_id, notion_calendar_db_id, notion_history_page_id')
    .eq('id', projectId).single();

  const p = project as any;

  if (p?.notion_kanban_db_id && p?.notion_calendar_db_id && p?.notion_history_page_id && p?.notion_page_id) {
    return {
      projectPageId: p.notion_page_id,
      kanbanDbId:    p.notion_kanban_db_id,
      calendarDbId:  p.notion_calendar_db_id,
      historyPageId: p.notion_history_page_id,
    };
  }

  // IDs not set yet — create workspace for the first time
  return createProjectNotionWorkspace(projectId);
}

// ----------------------------------------------------------------
// Create project Notion workspace (called on project creation + lazy fallback)
// ----------------------------------------------------------------
export async function createProjectNotionWorkspace(projectId: string): Promise<ProjectWorkspace> {
  const { data: project } = await supabase
    .from('projects')
    .select('name, client_name, team, description, reference_links')
    .eq('id', projectId).single();

  if (!project) throw new Error(`Projeto ${projectId} não encontrado`);

  const projectName = (project as any).client_name || (project as any).name;

  // 1 — Create project page under root (clean container, no text content)
  const projectPage: any = await notion.pages.create({
    parent: { page_id: normalizeNotionId(env.NOTION_ROOT_PAGE_ID) },
    icon: { type: 'emoji', emoji: '🏢' },
    properties: { title: { title: rt(projectName) } },
  });

  // 2 — Create Kanban database under project page
  // Note: view type (Board) must be set manually in Notion — API doesn't support it
  const kanbanDb: any = await (notion.databases as any).create({
    parent: { type: 'page_id', page_id: projectPage.id },
    icon: { type: 'emoji', emoji: '📋' },
    title: rt('Kanban'),
    properties: {
      'Nome':         { title: {} },
      'Status':       { status: {} },
      'Data':         { date: {} },
      'Prioridade':   { select: { options: [
        { name: 'Alta',  color: 'red'    },
        { name: 'Média', color: 'yellow' },
        { name: 'Baixa', color: 'blue'   },
      ]}},
      'Responsável':  { rich_text: {} },
      'Gestor':       { rich_text: {} },
      'Analistas':    { rich_text: {} },
    },
  });

  // 3 — Create Calendário de Posts database under project page
  const calendarDb: any = await (notion.databases as any).create({
    parent: { type: 'page_id', page_id: projectPage.id },
    icon: { type: 'emoji', emoji: '📅' },
    title: rt('Calendário de Posts'),
    properties: {
      'Nome':        { title: {} },
      'Data':        { date: {} },
      'Sentimento':  { select: { options: [
        { name: 'Positivo', color: 'green' },
        { name: 'Neutro',   color: 'gray'  },
        { name: 'Negativo', color: 'red'   },
      ]}},
    },
  });

  // 4 — Create Histórico de Calls page under project page
  const historyPage: any = await notion.pages.create({
    parent: { page_id: projectPage.id },
    icon: { type: 'emoji', emoji: '📂' },
    properties: { title: { title: rt('Histórico de Calls') } },
  });

  // 5 — Store all IDs + add Notion page to reference_links
  const notionUrl = `https://notion.so/${projectPage.id.replace(/-/g, '')}`;
  const existingLinks: Array<{ label: string; url: string }> = (project as any).reference_links ?? [];
  const updatedLinks = [
    ...existingLinks.filter((l) => !l.url.includes('notion.so')),
    { label: 'Notion', url: notionUrl },
  ];

  await supabase.from('projects').update({
    notion_page_id:         projectPage.id,
    notion_kanban_db_id:    kanbanDb.id,
    notion_calendar_db_id:  calendarDb.id,
    notion_history_page_id: historyPage.id,
    reference_links:        updatedLinks,
  }).eq('id', projectId);

  console.log(`[notion] Workspace criado para projeto ${projectId}:`, {
    page: projectPage.id, kanban: kanbanDb.id, calendar: calendarDb.id, history: historyPage.id,
  });

  return {
    projectPageId: projectPage.id,
    kanbanDbId:    kanbanDb.id,
    calendarDbId:  calendarDb.id,
    historyPageId: historyPage.id,
  };
}

// ----------------------------------------------------------------
// DB Schema introspection
// ----------------------------------------------------------------
interface DbSchema {
  titleProp: string;
  dateProp: string | null;
  statusPropName: string | null;
  statusPropType: 'select' | 'status' | null;
  defaultStatusValue: string | null;
  selectProps: string[];
  allPropNames: Set<string>;
}

const _schemas = new Map<string, DbSchema>();

async function getDbSchema(dbId: string): Promise<DbSchema> {
  if (_schemas.has(dbId)) return _schemas.get(dbId)!;

  const db = await notion.databases.retrieve({ database_id: dbId });
  const props = db.properties as Record<string, any>;

  let titleProp = 'Nome';
  let dateProp: string | null = null;
  let statusPropName: string | null = null;
  let statusPropType: 'select' | 'status' | null = null;
  let defaultStatusValue: string | null = null;
  let foundNativeStatus = false;
  const selectProps: string[] = [];

  for (const [name, prop] of Object.entries(props)) {
    if (prop.type === 'title') {
      titleProp = name;
    } else if (prop.type === 'date' && !dateProp) {
      dateProp = name;
    } else if (prop.type === 'status') {
      foundNativeStatus = true;
      statusPropName = name;
      statusPropType = 'status';
      const options: string[] = prop.status?.options?.map((o: any) => o.name) ?? [];
      defaultStatusValue =
        options.find((o) => /backlog|not.?started|fazer|to.?do|pendente|novo|new/i.test(o)) ??
        options[0] ?? null;
    } else if (prop.type === 'select') {
      selectProps.push(name);
      if (!foundNativeStatus && (!statusPropName || /status|estado/i.test(name))) {
        statusPropName = name;
        statusPropType = 'select';
        const options: string[] = prop.select?.options?.map((o: any) => o.name) ?? [];
        defaultStatusValue =
          options.find((o) => /backlog|not.?started|fazer|to.?do|pendente|novo|new/i.test(o)) ??
          options[0] ?? null;
      }
    }
  }

  const schema: DbSchema = {
    titleProp, dateProp, statusPropName, statusPropType, defaultStatusValue,
    selectProps, allPropNames: new Set(Object.keys(props)),
  };
  _schemas.set(dbId, schema);
  return schema;
}

// ----------------------------------------------------------------
// Deduplication — archive existing by exact title
// ----------------------------------------------------------------
async function archiveExistingByTitle(dbId: string, schema: DbSchema, title: string) {
  try {
    const res: any = await notion.databases.query({
      database_id: dbId,
      filter: { property: schema.titleProp, title: { equals: title } },
    });
    for (const page of res.results ?? []) {
      try { await notion.pages.update({ page_id: page.id, archived: true }); } catch {}
    }
  } catch {}
}

// ----------------------------------------------------------------
// Preview
// ----------------------------------------------------------------
export async function getNotionPreview(callId: string) {
  const { data: call, error: callErr } = await supabase
    .from('calls').select('*').eq('id', callId).single();
  if (callErr || !call) throw new HttpError(404, 'Call não encontrada');

  const { data: analyses } = await supabase
    .from('call_analyses').select('*').eq('call_id', callId).eq('status', 'done')
    .order('created_at', { ascending: false }).limit(1);

  const analysis = analyses?.[0] ?? null;
  if (!analysis) throw new HttpError(400, 'Call ainda não foi analisada');

  const { data: lastSync } = await supabase
    .from('notion_call_syncs').select('*').eq('call_id', callId)
    .order('synced_at', { ascending: false }).limit(1).single();

  const { data: project } = await supabase
    .from('projects')
    .select('name, client_name, notion_page_id, notion_kanban_db_id')
    .eq('id', (call as any).project_id).single();

  const lastPageIds: Record<string, string> = (lastSync as any)?.notion_page_ids ?? {};
  const projectName = (project as any)?.client_name || (project as any)?.name || 'Projeto';

  const items: Array<{
    id: string;
    type: 'calendar' | 'task' | 'history_page';
    label: string;
    description: string;
    synced_notion_id: string | null;
  }> = [];

  items.push({
    id: 'calendar',
    type: 'calendar',
    label: 'Entrada no Calendário de Posts',
    description: `${new Date((call as any).call_date).toLocaleDateString('pt-BR')}${analysis.sentiment ? ` · ${SENTIMENT_LABELS[analysis.sentiment]}` : ''}`,
    synced_notion_id: lastPageIds['calendar'] ?? null,
  });

  for (let i = 0; i < (analysis.tasks ?? []).length; i++) {
    const task = analysis.tasks[i];
    const meta: string[] = [];
    if (task.priority) meta.push(PRIORITY_LABELS[task.priority]);
    if (task.owner) meta.push(task.owner);
    if (task.due_date) meta.push(task.due_date);
    items.push({
      id: `task-${i}`,
      type: 'task',
      label: task.description,
      description: meta.join(' · ') || 'Sem detalhes adicionais',
      synced_notion_id: lastPageIds[`task-${i}`] ?? null,
    });
  }

  const noteCount = (analysis.notes ?? []).length;
  const fbCount = (analysis.feedback ?? []).length;
  items.push({
    id: 'history',
    type: 'history_page',
    label: 'Página no Histórico de Calls',
    description: `Resumo + transcrição · ${noteCount} anotaç${noteCount !== 1 ? 'ões' : 'ão'} · ${fbCount} feedback${fbCount !== 1 ? 's' : ''}`,
    synced_notion_id: lastPageIds['history'] ?? null,
  });

  return { call, analysis_id: analysis.id, last_sync: lastSync ?? null, items };
}

// ----------------------------------------------------------------
// Sync
// ----------------------------------------------------------------
export async function syncToNotion(
  callId: string,
  selectedItems: string[] | 'all',
  authorName?: string
) {
  const { data: call, error: callErr } = await supabase
    .from('calls').select('*').eq('id', callId).single();
  if (callErr || !call) throw new HttpError(404, 'Call não encontrada');

  const { data: analyses } = await supabase
    .from('call_analyses').select('*').eq('call_id', callId).eq('status', 'done')
    .order('created_at', { ascending: false }).limit(1);
  const analysis = analyses?.[0];
  if (!analysis) throw new HttpError(400, 'Sem análise disponível para sincronizar');

  const { data: project } = await supabase
    .from('projects').select('name, client_name, team, description')
    .eq('id', (call as any).project_id).single();

  const projectName = (project as any)?.client_name || (project as any)?.name || 'Projeto';
  const team = (project as any)?.team ?? {};
  const manager: string = team.manager ?? '';
  const analysts: string[] = team.analysts ?? [];
  const strategists: string[] = team.strategists ?? [];

  let items: string[];
  if (selectedItems === 'all') {
    items = [
      'calendar',
      ...(analysis.tasks ?? []).map((_: any, i: number) => `task-${i}`),
      'history',
    ];
  } else {
    items = selectedItems;
  }

  // Get (or create) project-specific Notion workspace
  const ws = await getProjectWorkspace((call as any).project_id);

  const results: Array<{ item: string; notion_id?: string; error?: string }> = [];
  const notionPageIds: Record<string, string> = {};

  for (const itemId of items) {
    try {

      // ── Calendar ──────────────────────────────────────────────
      if (itemId === 'calendar') {
        const schema = await getDbSchema(ws.calendarDbId);
        const callDate = (call as any).call_date.split('T')[0];
        const title = `${(call as any).title || 'Call'} · ${new Date((call as any).call_date).toLocaleDateString('pt-BR')}`;

        await archiveExistingByTitle(ws.calendarDbId, schema, title);

        const sentimentLabel = analysis.sentiment ? SENTIMENT_LABELS[analysis.sentiment] : undefined;
        const properties: Record<string, any> = {
          [schema.titleProp]: { title: rt(title) },
        };
        if (callDate && schema.dateProp)
          properties[schema.dateProp] = { date: { start: callDate } };
        if (sentimentLabel && schema.selectProps.length > 0)
          properties[schema.selectProps[0]] = { select: { name: sentimentLabel } };

        const page = await notion.pages.create({
          parent: { database_id: ws.calendarDbId },
          properties: properties as any,
          children: [
            { object: 'block', type: 'callout', callout: {
              rich_text: rt(`Projeto: ${projectName}`),
              icon: { type: 'emoji', emoji: '📋' },
            }},
            ...(analysis.summary ? [
              { object: 'block', type: 'paragraph', paragraph: { rich_text: rt(analysis.summary) } },
            ] : []),
          ] as any,
        });
        notionPageIds[itemId] = page.id;
        results.push({ item: itemId, notion_id: page.id });

      // ── Task ──────────────────────────────────────────────────
      } else if (itemId.startsWith('task-')) {
        const idx = parseInt(itemId.replace('task-', ''), 10);
        const task = (analysis.tasks ?? [])[idx];
        if (!task) continue;

        const schema = await getDbSchema(ws.kanbanDbId);

        await archiveExistingByTitle(ws.kanbanDbId, schema, task.description);

        const properties: Record<string, any> = {
          [schema.titleProp]: { title: rt(task.description) },
        };
        if (schema.statusPropName && schema.defaultStatusValue) {
          properties[schema.statusPropName] =
            schema.statusPropType === 'status'
              ? { status: { name: schema.defaultStatusValue } }
              : { select: { name: schema.defaultStatusValue } };
        }
        if (task.due_date && schema.dateProp)
          properties[schema.dateProp] = { date: { start: task.due_date } };

        // Set extra properties if they exist on this DB (project-specific Kanbans have them)
        if (task.priority && schema.allPropNames.has('Prioridade'))
          properties['Prioridade'] = { select: { name: PRIORITY_LABELS[task.priority] } };
        if (task.owner && schema.allPropNames.has('Responsável'))
          properties['Responsável'] = { rich_text: rt(task.owner) };
        if (manager && schema.allPropNames.has('Gestor'))
          properties['Gestor'] = { rich_text: rt(manager) };
        if (analysts.length > 0 && schema.allPropNames.has('Analistas'))
          properties['Analistas'] = { rich_text: rt(analysts.join(', ')) };

        const page = await notion.pages.create({
          parent: { database_id: ws.kanbanDbId },
          properties: properties as any,
        });
        notionPageIds[itemId] = page.id;
        results.push({ item: itemId, notion_id: page.id });

      // ── History page ──────────────────────────────────────────
      } else if (itemId === 'history') {
        const sentimentLabel = analysis.sentiment ? SENTIMENT_LABELS[analysis.sentiment] : 'N/A';
        const sentimentEmoji = analysis.sentiment ? SENTIMENT_EMOJIS[analysis.sentiment] : '💬';
        const histTitle = `${projectName} · ${new Date((call as any).call_date).toLocaleDateString('pt-BR')} · ${(call as any).title || 'Call'}`;

        await archiveExistingByTitle(ws.historyPageId as any, { titleProp: 'title', dateProp: null, statusPropName: null, statusPropType: null, defaultStatusValue: null, selectProps: [], allPropNames: new Set() }, histTitle).catch(() => {});

        const blocks: any[] = [
          { object: 'block', type: 'callout', callout: {
            rich_text: rt(`${sentimentLabel}  —  ${analysis.sentiment_justification ?? ''}`),
            icon: { type: 'emoji', emoji: sentimentEmoji },
          }},
        ];

        if (manager || analysts.length > 0) {
          blocks.push({
            object: 'block', type: 'callout', callout: {
              rich_text: rt([
                manager ? `Gestor: ${manager}` : null,
                analysts.length > 0 ? `Analistas: ${analysts.join(', ')}` : null,
                strategists.length > 0 ? `Estrategistas: ${strategists.join(', ')}` : null,
              ].filter(Boolean).join('\n')),
              icon: { type: 'emoji', emoji: '👥' },
            },
          });
        }

        blocks.push({ object: 'block', type: 'divider', divider: {} });
        blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: rt('Resumo Executivo') } });
        blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: rt(analysis.summary ?? '') } });

        if ((analysis.notes ?? []).length > 0) {
          blocks.push({ object: 'block', type: 'divider', divider: {} });
          blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: rt('Anotações') } });
          for (const note of analysis.notes) {
            blocks.push({ object: 'block', type: 'callout', callout: {
              rich_text: [{ type: 'text', text: { content: `${note.topic}\n\n${note.content}`.slice(0, 2000) } }],
              icon: { type: 'emoji', emoji: '📌' },
            }});
          }
        }

        if ((analysis.feedback ?? []).length > 0) {
          blocks.push({ object: 'block', type: 'divider', divider: {} });
          blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: rt('Feedback do Cliente') } });
          for (const fb of analysis.feedback) {
            const fbEmoji = fb.sentiment === 'positive' ? '✅' : fb.sentiment === 'negative' ? '❌' : '💬';
            blocks.push({ object: 'block', type: 'callout', callout: {
              rich_text: [{ type: 'text', text: { content: `${fb.topic}\n\n${fb.content}`.slice(0, 2000) } }],
              icon: { type: 'emoji', emoji: fbEmoji },
            }});
          }
        }

        if ((analysis.tasks ?? []).length > 0) {
          blocks.push({ object: 'block', type: 'divider', divider: {} });
          blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: rt('Tasks') } });
          for (const task of analysis.tasks) {
            blocks.push({ object: 'block', type: 'to_do', to_do: {
              rich_text: rt(`${task.description}${task.owner ? ` — ${task.owner}` : ''}${task.due_date ? ` · ${task.due_date}` : ''}`),
              checked: false,
            }});
          }
        }

        if ((call as any).transcript) {
          blocks.push({ object: 'block', type: 'divider', divider: {} });
          blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: rt('Transcrição') } });
          const transcript: string = (call as any).transcript;
          const chunkSize = 1900;
          for (let i = 0; i < transcript.length && blocks.length < 95; i += chunkSize) {
            blocks.push({ object: 'block', type: 'paragraph', paragraph: {
              rich_text: [{ type: 'text', text: { content: transcript.slice(i, i + chunkSize) } }],
            }});
          }
        }

        const page = await notion.pages.create({
          parent: { page_id: ws.historyPageId },
          icon: { type: 'emoji', emoji: '📞' },
          properties: { title: { title: rt(histTitle) } },
          children: blocks.slice(0, 99) as any,
        });
        notionPageIds[itemId] = page.id;
        results.push({ item: itemId, notion_id: page.id });
      }

    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      results.push({ item: itemId, error: raw });
    }
  }

  await supabase.from('notion_call_syncs').insert({
    call_id: callId,
    analysis_id: analysis.id,
    synced_items: items,
    calendar_page_id: notionPageIds['calendar'] ?? null,
    history_page_id:  notionPageIds['history'] ?? null,
    notion_page_ids:  notionPageIds,
    author_name: authorName,
  });

  await supabase
    .from('notion_integrations')
    .upsert({ project_id: (call as any).project_id, last_synced_at: new Date().toISOString() }, { onConflict: 'project_id' });

  return {
    results,
    partial: results.some((r) => r.error),
    synced_count: results.filter((r) => !r.error).length,
  };
}
