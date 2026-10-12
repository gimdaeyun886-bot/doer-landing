-- Do-er: 목표(goals)와 AI 계획, 목차·범위 자료 저장소.
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
  note              text check (note is null or char_length(note) <= 300),
  lock_targets      text[] not null default '{}',  -- 잠글 화면 (릴스, 쇼츠 등)
  material_path     text,   -- goal-materials 버킷 안의 파일 경로
  plan              jsonb,  -- AI가 만든 계획: { summary, weeks[], today[] }
  plan_status       text not null default 'pending' check (plan_status in ('pending', 'ready', 'failed')),
  plan_generated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (kind <> 'dated' or deadline is not null)
);

create index if not exists goals_created_at_idx on public.goals (created_at desc);

-- 2) AI 사용 기록 (하루 사용 횟수 제한과 사용량 확인용)
create table if not exists public.ai_runs (
  id            bigint generated always as identity primary key,
  purpose       text not null check (purpose in ('plan', 'chat')),
  goal_id       uuid references public.goals (id) on delete set null,
  ok            boolean not null,
  model         text not null,
  input_tokens  integer,
  output_tokens integer,
  created_at    timestamptz not null default now()
);

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
grant select, insert, update, delete on public.goals to anon, authenticated;
grant select, insert on public.ai_runs to anon, authenticated;

-- 5) 자료 저장소: 공개 읽기, 이미지 3종, 3MB 이하
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
