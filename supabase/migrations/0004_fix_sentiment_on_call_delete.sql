-- ================================================================
-- CallSync — Migration 0004: Fix sentiment refresh em cascade delete
-- ----------------------------------------------------------------
-- Bug do 0003: trigger em call_analyses AFTER DELETE não consegue
-- recuperar project_id quando a call já foi deletada (cascade).
-- Fix: trigger adicional em calls AFTER DELETE que refresca o projeto.
-- ================================================================

create or replace function public.trigger_refresh_on_call_delete()
returns trigger
language plpgsql
as $$
begin
  if old.project_id is not null then
    perform public.refresh_project_sentiment(old.project_id);
  end if;
  return null;
end;
$$;

drop trigger if exists calls_refresh_project_sentiment_on_delete on public.calls;
create trigger calls_refresh_project_sentiment_on_delete
  after delete on public.calls
  for each row execute function public.trigger_refresh_on_call_delete();
