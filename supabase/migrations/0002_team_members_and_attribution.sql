-- ================================================================
-- CallSync — Migration 0002: Team members + atribuição por nome
-- ----------------------------------------------------------------
-- MVP roda SEM autenticação. Backend Express usará a SECRET KEY do
-- Supabase (que bypassa RLS), então não precisamos abrir RLS para anon.
-- A atribuição "quem fez isso" vem de um dropdown no header da UI,
-- preenchido a partir da tabela team_members.
-- ================================================================

-- ----------------------------------------------------------------
-- TABELA: team_members  (fonte do dropdown "Quem é você?")
-- ----------------------------------------------------------------
create table public.team_members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  email       text,
  role        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.team_members enable row level security;

create policy "auth users full access" on public.team_members
  for all to authenticated using (true) with check (true);

-- Pré-popular com a equipe atual da moic.digital
insert into public.team_members (name, role) values
  ('Cabral',   'analista'),
  ('Bruno',       'analista'),
  ('Ana',     'manager'),
  ('Carla', 'manager'),
  ('Diego',  'CEO');

-- ----------------------------------------------------------------
-- author_name em registros existentes
-- Snapshot denormalizado: guarda o nome na hora do INSERT, então
-- renomear alguém em team_members no futuro NÃO altera atribuições antigas.
-- (Isso é desejado: histórico imutável.)
-- ----------------------------------------------------------------
alter table public.projects       add column author_name text;
alter table public.calls          add column author_name text;
alter table public.call_analyses  add column author_name text;
