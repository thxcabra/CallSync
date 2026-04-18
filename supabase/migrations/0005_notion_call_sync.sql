-- ================================================================
-- CallSync — Migration 0005: notion_call_syncs
-- Rastreia quais itens de cada call foram sincronizados com Notion.
-- ================================================================

create table public.notion_call_syncs (
  id                uuid primary key default gen_random_uuid(),
  call_id           uuid not null references public.calls(id) on delete cascade,
  analysis_id       uuid references public.call_analyses(id) on delete set null,
  synced_items      jsonb not null default '[]'::jsonb,  -- item IDs enviados
  calendar_page_id  text,
  history_page_id   text,
  author_name       text,
  synced_at         timestamptz not null default now()
);

create index notion_call_syncs_call_idx on public.notion_call_syncs (call_id, synced_at desc);

alter table public.notion_call_syncs enable row level security;

create policy "auth users full access" on public.notion_call_syncs
  for all to authenticated using (true) with check (true);
