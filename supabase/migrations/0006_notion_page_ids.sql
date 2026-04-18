-- ================================================================
-- CallSync — Migration 0006: notion_call_syncs.notion_page_ids
-- Guarda o mapa item_id → notion_page_id de cada sync,
-- permitindo arquivar páginas antigas em re-sincronizações.
-- ================================================================
alter table public.notion_call_syncs
  add column if not exists notion_page_ids jsonb not null default '{}'::jsonb;
