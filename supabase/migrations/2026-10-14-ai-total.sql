-- 정한 때부터 모든 사용자가 AI에 쓴 양. 다른 사람의 기록 내용은 보여 주지 않고 합만 돌려준다.
drop function if exists public.ai_runs_since(timestamptz);
create or replace function public.ai_usage_since(since timestamptz)
returns table (runs integer, input_tokens bigint, output_tokens bigint)
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer, coalesce(sum(input_tokens), 0)::bigint, coalesce(sum(output_tokens), 0)::bigint
  from public.ai_runs where created_at >= since;
$$;
revoke all on function public.ai_usage_since(timestamptz) from public, anon;
grant execute on function public.ai_usage_since(timestamptz) to authenticated;

notify pgrst, 'reload schema';
