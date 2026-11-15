-- 휴지통과 끝난 계획 정리(2026-11-16). Supabase SQL Editor에서 한 번 실행한다. 여러 번 실행해도 된다.
-- 1) 지운 목표는 바로 지우지 않고 휴지통에 30일 둔다. deleted_at이 그 때이고, 30일이 지나면 앱이 완전히 지운다.
alter table public.goals add column if not exists deleted_at timestamptz;
create index if not exists goals_trash_idx on public.goals (user_id, deleted_at) where deleted_at is not null;

-- 2) 날짜 있는·완성 목표가 목표일까지 인증 하나 없이 끝나면 계획만 지우고 상태를 expired로 둔다.
alter table public.goals drop constraint if exists goals_plan_status_check;
alter table public.goals add constraint goals_plan_status_check check (plan_status in ('pending', 'ready', 'failed', 'expired'));

notify pgrst, 'reload schema';
