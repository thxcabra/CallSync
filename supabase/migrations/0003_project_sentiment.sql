-- ================================================================
-- CallSync — Migration 0003: Sentimento no projeto (auto-atualizado)
-- ----------------------------------------------------------------
-- Adiciona current_sentiment e last_analyzed_at em projects, mantidos
-- automaticamente por trigger toda vez que call_analyses muda.
-- "Sentimento do projeto" = sentimento da call mais recente (por call_date)
-- que tenha análise concluída (status=done) — análise mais recente dessa call.
-- ================================================================

-- 1. Colunas novas em projects
alter table public.projects
  add column current_sentiment text
    check (current_sentiment in ('positive', 'neutral', 'negative')),
  add column last_analyzed_at  timestamptz;

-- 2. Função de recálculo
create or replace function public.refresh_project_sentiment(p_project_id uuid)
returns void
language plpgsql
as $$
declare
  s text;
  t timestamptz;
begin
  select ca.sentiment, ca.created_at
    into s, t
  from public.call_analyses ca
  join public.calls c on c.id = ca.call_id
  where c.project_id = p_project_id
    and ca.status = 'done'
    and ca.sentiment is not null
  order by c.call_date desc, ca.created_at desc
  limit 1;

  update public.projects
     set current_sentiment = s,
         last_analyzed_at  = t
   where id = p_project_id;
end;
$$;

-- 3. Trigger function — descobre o project_id e chama refresh
create or replace function public.trigger_refresh_project_sentiment()
returns trigger
language plpgsql
as $$
declare
  pid uuid;
begin
  if (tg_op = 'DELETE') then
    select project_id into pid from public.calls where id = old.call_id;
  else
    select project_id into pid from public.calls where id = new.call_id;
  end if;
  if pid is not null then
    perform public.refresh_project_sentiment(pid);
  end if;
  return null; -- AFTER trigger ignora retorno
end;
$$;

-- 4. Trigger: dispara em qualquer INSERT/UPDATE/DELETE de análise
drop trigger if exists call_analyses_refresh_project_sentiment on public.call_analyses;
create trigger call_analyses_refresh_project_sentiment
  after insert or update or delete on public.call_analyses
  for each row execute function public.trigger_refresh_project_sentiment();

-- 5. Backfill: rodar refresh em todos os projetos que já tem análise
do $$
declare
  proj_id uuid;
begin
  for proj_id in
    select distinct c.project_id
      from public.call_analyses ca
      join public.calls c on c.id = ca.call_id
     where ca.status = 'done'
  loop
    perform public.refresh_project_sentiment(proj_id);
  end loop;
end;
$$;
