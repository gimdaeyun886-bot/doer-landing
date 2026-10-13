-- Do-er: 로그인한 사용자별 목표·계획·인증·잠금 설정과 사진 저장소.
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여 넣고 한 번 실행합니다.
-- 주의: 로그인 도입 전(사용자 구분이 없던 때)의 연습 데이터는 주인을 알 수 없어 모두 지웁니다.

-- 0) 이전 단계의 테이블 정리
drop table if exists public.tasks;
drop table if exists public.plan_runs;
drop table if exists public.proofs;
drop table if exists public.adjustments;
drop table if exists public.ai_runs;
drop table if exists public.app_settings;
drop table if exists public.consents;
drop table if exists public.goals;

-- 1) 목표와 AI 계획
create table public.goals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 40),
  kind              text not null default 'dated' check (kind in ('dated', 'finish', 'ongoing')),
  deadline          date,  -- kind 가 dated 일 때만 값이 있음
  daily_minutes     integer not null check (daily_minutes between 10 and 600),
  schedule          text check (schedule is null or char_length(schedule) <= 120),  -- 언제 할 수 있는지
  note              text check (note is null or char_length(note) <= 300),
  context           text check (context is null or char_length(context) <= 1500),  -- 대화에서 코치가 더 알게 된 사정
  material_path     text,   -- 저장소 안의 파일 경로 (사용자 id/materials/…)
  material_summary  text,   -- 코치가 사진에서 읽은 내용
  plan              jsonb,  -- AI가 만든 계획: { summary, basis[], assumptions[], weeks[], days[] }
  plan_status       text not null default 'pending' check (plan_status in ('pending', 'ready', 'failed')),
  plan_generated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (kind <> 'dated' or deadline is not null)
);
create index goals_user_idx on public.goals (user_id, created_at desc);

-- 2) 인증 기록. 과제 하나에 가장 최근 인증 한 건을 둔다.
create table public.proofs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid not null references public.goals (id) on delete cascade,
  task_id     text not null,
  date        date not null,
  kind        text not null default 'photo' check (kind in ('photo', 'quiz', 'write')),
  passed      boolean not null,
  reason      text not null default '',
  image_path  text,   -- 사진 인증의 원본. 판정 7일 뒤 지운다.
  answer      text,   -- 글·퀴즈 인증에서 사용자가 쓴 답
  appeal      text,   -- 판정에 이의를 제기한 내용
  appealed_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (goal_id, task_id)
);
create index proofs_user_date_idx on public.proofs (user_id, date);

-- 3) 잠글 앱과 오늘의 잠금 상태. 사용자 한 명에게 한 줄.
create table public.app_settings (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  lock_targets text[] not null default '{}',
  lock_date    date,  -- '시작'을 누른 날. 그날 할 일을 모두 인증하면 풀린다.
  updated_at   timestamptz not null default now()
);

-- 4) 계획 조정 기록 (버거운 날 코치와 정한 것)
create table public.adjustments (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  reason     text not null,
  choice     text not null,
  impact     text not null,
  created_at timestamptz not null default now()
);

-- 5) 약관·개인정보 동의 기록
create table public.consents (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  version    text not null,
  agreed_at  timestamptz not null default now()
);

-- 6) AI 사용 기록 (사용자별 하루 사용 횟수 제한과 사용량 확인용)
create table public.ai_runs (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  purpose       text not null check (purpose in ('plan', 'chat', 'read', 'verify', 'adjust')),
  goal_id       uuid references public.goals (id) on delete set null,
  ok            boolean not null,
  model         text not null,
  input_tokens  integer,
  output_tokens integer,
  created_at    timestamptz not null default now()
);
create index ai_runs_user_idx on public.ai_runs (user_id, purpose, created_at desc);

-- 오늘 모든 사용자가 AI를 쓴 횟수. 다른 사람의 기록 내용은 보여 주지 않고 수만 돌려준다.
create or replace function public.ai_runs_since(since timestamptz)
returns integer
language sql
security definer
set search_path = public
stable
as $
  select count(*)::integer from public.ai_runs where created_at >= since;
$;
revoke all on function public.ai_runs_since(timestamptz) from public, anon;
grant execute on function public.ai_runs_since(timestamptz) to authenticated;

-- 7) 수정할 때마다 updated_at 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- 8) 접근 권한: 로그인한 사용자가 자기 줄만 읽고 쓴다 (RLS).
do $$
declare t text;
begin
  foreach t in array array['goals', 'proofs', 'app_settings', 'adjustments', 'consents', 'ai_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- 9) 탈퇴: 로그인한 사용자가 자기 계정을 지운다. 위 테이블의 줄은 함께 지워진다.
create or replace function public.delete_my_account()
returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 10) 사진 저장소(목차·범위 자료와 인증 사진): 비공개, 이미지 3종, 3MB 이하.
--     경로의 첫 폴더가 자기 사용자 id 인 파일만 읽고 쓴다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('goal-materials', 'goal-materials', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "goal-materials read" on storage.objects;
drop policy if exists "goal-materials insert" on storage.objects;
drop policy if exists "goal-materials update" on storage.objects;
drop policy if exists "goal-materials delete" on storage.objects;
drop policy if exists "goal-materials own files" on storage.objects;

create policy "goal-materials own files" on storage.objects
  for all to authenticated
  using (bucket_id = 'goal-materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'goal-materials' and (storage.foldername(name))[1] = auth.uid()::text);

-- 11) 방금 바꾼 구조를 API가 바로 알도록 한다.
notify pgrst, 'reload schema';
