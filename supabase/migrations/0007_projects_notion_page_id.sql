alter table public.projects
  add column if not exists notion_page_id text,
  add column if not exists notion_kanban_db_id text,
  add column if not exists notion_calendar_db_id text,
  add column if not exists notion_history_page_id text;
