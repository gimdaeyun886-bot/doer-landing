-- Do-er: 목표(goals)와 AI 계획, 인증 기록(proofs), 잠글 앱 설정, 사진 저장소.
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여 넣고 한 번 실행합니다. 다시 실행해도 안전합니다.

-- 0) 이전 단계에서 만든 연습용 테이블 정리 (예시 데이터만 들어 있음)
drop table if exists public.tasks;
drop table if exists public.plan_runs;

-- 1) 목표
create table if not exists public.goals (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(title) between 1 and 40),
  kind              text not null default 'dated' check (kind in ('dated', 'finish', 'ongoing')),
  deadline          date,  -- kind 가 dated 일 때만 값이 있음
  daily_minutes     integer not null check (daily_minutes between 10 and 600),
  schedule          text check (schedule is null or char_length(schedule) <= 120),  -- 언제 할 수 있는지
  note              text check (note is null or char_length(note) <= 300),
  material_path     text,   -- goal-materials 버킷 안의 파일 경로
  material_summary  text,   -- 코치가 사진에서 읽은 내용
  plan              jsonb,  -- AI가 만든 계획: { summary, basis[], assumptions[], weeks[], days[] }
  plan_status       text not null default 'pending' check (plan_status in ('pending', 'ready', 'failed')),
  plan_generated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (kind <> 'dated' or deadline is not null)
);

create index if not exists goals_created_at_idx on public.goals (created_at desc);

-- 이전 버전에서 만든 테이블에 새 칸을 더한다. 잠글 앱은 목표가 아니라 설정으로 옮겼다.
alter table public.goals add column if not exists schedule text check (schedule is null or char_length(schedule) <= 120);
alter table public.goals add column if not exists material_summary text;
alter table public.goals drop column if exists lock_targets;
-- 계획의 모양이 바뀌어, 예전 모양으로 저장된 계획은 다시 만들게 한다.
update public.goals set plan = null, plan_status = 'pending' where plan is not null and not (plan ? 'days');

-- 1-1) 잠글 앱. 사용자 한 명에게 한 벌이다. (로그인이 생기면 사용자별로 나눈다)
create table if not exists public.app_settings (
  id           integer primary key default 1 check (id = 1),
  lock_targets text[] not null default '{}',
  updated_at   timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- 1-2) 인증 기록. 과제 하나에 가장 최근 인증 한 건을 둔다.
create table if not exists public.proofs (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals (id) on delete cascade,
  task_id    text not null,
  date       date not null,
  passed     boolean not null,
  reason     text not null default '',
  image_path text,  -- goal-materials 버킷 안의 파일 경로 (proofs/ 아래)
  created_at timestamptz not null default now(),
  unique (goal_id, task_id)
);
create index if not exists proofs_date_idx on public.proofs (date);

-- 2) AI 사용 기록 (하루 사용 횟수 제한과 사용량 확인용)
create table if not exists public.ai_runs (
  id            bigint generated always as identity primary key,
  purpose       text not null check (purpose in ('plan', 'chat', 'read', 'verify')),
  goal_id       uuid references public.goals (id) on delete set null,
  ok            boolean not null,
  model         text not null,
  input_tokens  integer,
  output_tokens integer,
  created_at    timestamptz not null default now()
);

alter table public.ai_runs drop constraint if exists ai_runs_purpose_check;
alter table public.ai_runs add constraint ai_runs_purpose_check check (purpose in ('plan', 'chat', 'read', 'verify'));
create index if not exists ai_runs_created_at_idx on public.ai_runs (purpose, created_at desc);

-- 3) 수정할 때마다 updated_at 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- 4) 접근 권한
-- 이번 단계는 로그인 없이 진행하므로 RLS를 끄고 공개 키(anon)에 읽기·쓰기를 허용합니다.
-- 사용자별 접근 제어와 RLS 정책은 다음 단계에서 적용합니다. 개인정보는 저장하지 않습니다.
alter table public.goals disable row level security;
alter table public.ai_runs disable row level security;
alter table public.app_settings disable row level security;
alter table public.proofs disable row level security;
grant select, insert, update, delete on public.goals to anon, authenticated;
grant select, insert, update on public.app_settings to anon, authenticated;
grant select, insert, update, delete on public.proofs to anon, authenticated;
grant select, insert on public.ai_runs to anon, authenticated;

-- 5) 사진 저장소(목차·범위 자료와 인증 사진): 공개 읽기, 이미지 3종, 3MB 이하
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('goal-materials', 'goal-materials', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "goal-materials read" on storage.objects;
drop policy if exists "goal-materials insert" on storage.objects;
drop policy if exists "goal-materials delete" on storage.objects;

create policy "goal-materials read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'goal-materials');
create policy "goal-materials insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'goal-materials');
create policy "goal-materials delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'goal-materials');


drop policy if exists "goal-materials update" on storage.objects;
create policy "goal-materials update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'goal-materials') with check (bucket_id = 'goal-materials');

-- 6) 방금 바꾼 구조를 API가 바로 알도록 한다.
notify pgrst, 'reload schema';
