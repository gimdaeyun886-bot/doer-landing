-- 오늘 모든 사용자가 AI를 쓴 횟수. 다른 사람의 기록 내용은 보여 주지 않고 수만 돌려준다.
create or replace function public.ai_runs_since(since timestamptz)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer from public.ai_runs where created_at >= since;
$$;
revoke all on function public.ai_runs_since(timestamptz) from public, anon;
grant execute on function public.ai_runs_since(timestamptz) to authenticated;

notify pgrst, 'reload schema';
