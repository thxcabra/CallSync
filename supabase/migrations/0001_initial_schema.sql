-- ================================================================
-- CallSync — Migration 0001: Initial schema
-- Workspace compartilhado: todo usuário autenticado vê tudo.
-- created_by é apenas atribuição/auditoria, não autorização.
-- ================================================================

-- Extensões necessárias
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ----------------------------------------------------------------
-- Trigger genérico: atualizar updated_at em UPDATE
-- ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ================================================================
-- TABELA: projects
-- ================================================================
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  client_name     text not null,
  description     text,
  campaign_docs   jsonb not null default '[]'::jsonb,        -- [{name, url|storage_path, type}]
  planned_posts_count int,
  team            jsonb not null default '{}'::jsonb,        -- {analysts: [], manager: '', strategists: []}
  contacts        jsonb not null default '[]'::jsonb,        -- [{name, email, phone, role}]
  reference_links jsonb not null default '[]'::jsonb,        -- [{label, url}]
  start_date      date,
  status          text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'archived')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index projects_created_at_idx on public.projects (created_at desc);
create index projects_status_idx on public.projects (status);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ================================================================
-- TABELA: calls
-- ================================================================
create table public.calls (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  title               text,
  call_date           timestamptz not null,
  participants        jsonb not null default '[]'::jsonb,    -- [{name, role?, email?}]
  audio_path          text,                                  -- storage path em 'call-audio'; null se transcript manual
  audio_duration_seconds int,
  transcript          text,
  transcript_source   text not null
    check (transcript_source in ('upload', 'manual')),
  transcript_status   text not null default 'pending'
    check (transcript_status in ('pending', 'transcribing', 'transcribed', 'failed')),
  transcript_error    text,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index calls_project_date_idx on public.calls (project_id, call_date desc);
create index calls_status_idx on public.calls (transcript_status);

create trigger calls_set_updated_at
  before update on public.calls
  for each row execute function public.set_updated_at();

-- ================================================================
-- TABELA: call_analyses
-- Pode haver múltiplas análises por call (re-execuções); query padrão pega a mais recente.
-- ================================================================
create table public.call_analyses (
  id                       uuid primary key default gen_random_uuid(),
  call_id                  uuid not null references public.calls(id) on delete cascade,
  status                   text not null default 'pending'
    check (status in ('pending', 'analyzing', 'done', 'failed')),
  summary                  text,
  sentiment                text check (sentiment in ('positive', 'neutral', 'negative')),
  sentiment_justification  text,
  tasks                    jsonb not null default '[]'::jsonb,   -- [{description, owner?, due_date?, priority?}]
  notes                    jsonb not null default '[]'::jsonb,   -- [{topic, content}]
  feedback                 jsonb not null default '[]'::jsonb,   -- [{topic, sentiment, content}]
  model_used               text,
  raw_response             jsonb,
  error_message            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index call_analyses_call_idx on public.call_analyses (call_id, created_at desc);

create trigger call_analyses_set_updated_at
  before update on public.call_analyses
  for each row execute function public.set_updated_at();

-- ================================================================
-- TABELA: notion_integrations
-- Uma config por projeto: onde mandar calendário, kanban e histórico daquele projeto.
-- ================================================================
create table public.notion_integrations (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null unique references public.projects(id) on delete cascade,
  calendar_database_id   text,
  kanban_database_id     text,
  history_page_id        text,
  settings               jsonb not null default '{}'::jsonb,
  last_synced_at         timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger notion_integrations_set_updated_at
  before update on public.notion_integrations
  for each row execute function public.set_updated_at();

-- ================================================================
-- ROW LEVEL SECURITY
-- Política: bloquear anônimos, liberar tudo para autenticados.
-- ================================================================
alter table public.projects             enable row level security;
alter table public.calls                enable row level security;
alter table public.call_analyses        enable row level security;
alter table public.notion_integrations  enable row level security;

create policy "auth users full access" on public.projects
  for all to authenticated using (true) with check (true);

create policy "auth users full access" on public.calls
  for all to authenticated using (true) with check (true);

create policy "auth users full access" on public.call_analyses
  for all to authenticated using (true) with check (true);

create policy "auth users full access" on public.notion_integrations
  for all to authenticated using (true) with check (true);

-- ================================================================
-- STORAGE: bucket para áudios das calls (privado)
-- ================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'call-audio',
  'call-audio',
  false,
  524288000,  -- 500 MB
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/webm']
)
on conflict (id) do nothing;

-- Storage policies (autenticados podem listar/upload/baixar/deletar áudios)
create policy "auth read call-audio" on storage.objects
  for select to authenticated using (bucket_id = 'call-audio');

create policy "auth insert call-audio" on storage.objects
  for insert to authenticated with check (bucket_id = 'call-audio');

create policy "auth update call-audio" on storage.objects
  for update to authenticated using (bucket_id = 'call-audio');

create policy "auth delete call-audio" on storage.objects
  for delete to authenticated using (bucket_id = 'call-audio');
