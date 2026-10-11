-- Do-er 미션 6: 할 일(tasks) 테이블과 인증 자료 저장소.
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여 넣고 한 번 실행합니다. 다시 실행해도 안전합니다.

-- 1) 테이블
create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(title) between 1 and 60),
  goal              text not null check (char_length(goal) between 1 and 30),
  due_date          date not null,
  estimated_minutes integer not null check (estimated_minutes between 5 and 600),
  memo              text check (memo is null or char_length(memo) <= 300),
  proof_path        text,  -- task-proofs 버킷 안의 파일 경로. null이면 인증 전.
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists tasks_due_date_idx on public.tasks (due_date desc, created_at desc);

-- 2) 수정할 때마다 updated_at 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- 3) 접근 권한
-- 이번 미션은 로그인 없이 진행하므로 RLS를 끄고 공개 키(anon)에 읽기·쓰기를 허용합니다.
-- 사용자별 접근 제어와 RLS 정책은 미션 7에서 적용합니다. 개인정보는 저장하지 않습니다.
alter table public.tasks disable row level security;
grant select, insert, update, delete on public.tasks to anon, authenticated;

-- 4) 인증 자료 저장소: 공개 읽기, 이미지 3종, 3MB 이하
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-proofs', 'task-proofs', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "task-proofs read" on storage.objects;
drop policy if exists "task-proofs insert" on storage.objects;
drop policy if exists "task-proofs delete" on storage.objects;

create policy "task-proofs read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'task-proofs');
create policy "task-proofs insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'task-proofs');
create policy "task-proofs delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'task-proofs');
