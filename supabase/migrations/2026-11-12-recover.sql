-- 놓친 날 이어 가기(2026-11-12). Supabase SQL Editor에서 한 번 실행한다. 여러 번 실행해도 된다.
-- 1) 조정 기록에 종류를 둔다. adjust: 오늘이 버거워 바꾼 것 / recover: 지난 날 못 한 일을 정리한 것
alter table public.adjustments add column if not exists kind text not null default 'adjust';
alter table public.adjustments drop constraint if exists adjustments_kind_check;
alter table public.adjustments add constraint adjustments_kind_check check (kind in ('adjust', 'recover'));
-- 정리한 지난 날짜. recover일 때만 값이 있다.
alter table public.adjustments add column if not exists for_date date;
-- 옮긴 일을 모두 인증하면 그날 기록을 '조정'으로 되살릴 수 있는 정리인지. 7일에 한 번까지만 true.
alter table public.adjustments add column if not exists repairs boolean not null default false;
-- 고른 안이 코드가 만든 기본안인지(basic), 코치가 사정을 듣고 낸 안인지(coach). 사용 측정용.
alter table public.adjustments add column if not exists source text;
alter table public.adjustments drop constraint if exists adjustments_source_check;
alter table public.adjustments add constraint adjustments_source_check check (source is null or source in ('basic', 'coach'));
alter table public.adjustments drop constraint if exists adjustments_recover_date_check;
alter table public.adjustments add constraint adjustments_recover_date_check check (kind <> 'recover' or for_date is not null);
-- 같은 날을 두 번 정리하지 않는다(두 번 눌러도 한 번만 남는다).
create unique index if not exists adjustments_recover_once on public.adjustments (user_id, for_date) where kind = 'recover';

-- 2) AI 사용 기록의 목적에 recover를 더한다.
alter table public.ai_runs drop constraint if exists ai_runs_purpose_check;
alter table public.ai_runs add constraint ai_runs_purpose_check check (purpose in ('plan', 'chat', 'read', 'verify', 'adjust', 'recover'));

notify pgrst, 'reload schema';
