-- 2026-10-13: 대화에서 코치가 더 알게 된 사정을 담는 칸. SQL Editor에서 한 번 실행합니다. 기존 데이터는 그대로입니다.
alter table public.goals add column if not exists context text check (context is null or char_length(context) <= 1500);
notify pgrst, 'reload schema';
