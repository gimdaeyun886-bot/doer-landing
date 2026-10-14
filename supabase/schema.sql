-- Do-er 미션 6: 목표(mission_goals) 테이블과 자료 사진 버킷.
-- Supabase 대시보드 > SQL Editor에 붙여 넣고 한 번 실행한다. 여러 번 실행해도 결과는 같다.
--
-- 미션 6에는 로그인이 없다. 그래서 개인정보(이메일, 이름, 연락처)는 받지 않고,
-- 누구나 목표를 읽고 쓸 수 있게 열어 둔다. 사용자별 접근 제한(user_id + RLS 정책)은 미션 7에서 붙인다.

create table if not exists public.mission_goals (
  id            uuid        primary key default gen_random_uuid(),
  request_id    uuid        not null unique,                 -- 등록 화면이 준 요청 번호. 같은 등록이 두 번 저장되지 않게 한다.
  title         text        not null check (char_length(title) between 1 and 40),
  kind          text        not null check (kind in ('dated', 'finish', 'ongoing')),
  deadline      date,                                        -- kind가 dated일 때만 있다.
  daily_minutes integer     not null check (daily_minutes between 10 and 600),
  schedule      text        check (char_length(schedule) <= 120),
  note          text        check (char_length(note) <= 300),
  lock_apps     text[]      not null default '{}' check (cardinality(lock_apps) <= 7),
  material_path text,                                        -- mission-materials 버킷 안의 파일 경로
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint mission_goals_deadline_matches_kind check ((kind = 'dated') = (deadline is not null))
);

-- 목록은 최근 것부터, 종류로 거른다.
create index if not exists mission_goals_created_idx on public.mission_goals (created_at desc, id);
create index if not exists mission_goals_kind_idx on public.mission_goals (kind, created_at desc);

-- 고칠 때마다 수정 시각을 서버가 적는다.
create or replace function public.mission_goals_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists mission_goals_touch on public.mission_goals;
create trigger mission_goals_touch before update on public.mission_goals
  for each row execute function public.mission_goals_touch();

-- RLS는 켜 두고, 미션 6 동안만 모두에게 연다. 미션 7에서 이 정책들을 자기 줄만 다루는 정책으로 바꾼다.
alter table public.mission_goals enable row level security;
drop policy if exists "mission6 goals read" on public.mission_goals;
drop policy if exists "mission6 goals insert" on public.mission_goals;
drop policy if exists "mission6 goals update" on public.mission_goals;
drop policy if exists "mission6 goals delete" on public.mission_goals;
create policy "mission6 goals read" on public.mission_goals for select to anon, authenticated using (true);
create policy "mission6 goals insert" on public.mission_goals for insert to anon, authenticated with check (true);
create policy "mission6 goals update" on public.mission_goals for update to anon, authenticated using (true) with check (true);
create policy "mission6 goals delete" on public.mission_goals for delete to anon, authenticated using (true);

-- 자료 사진 버킷. 공개 주소로 보여 주고, 형식과 크기는 저장소에서도 한 번 더 막는다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mission-materials', 'mission-materials', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mission6 materials read" on storage.objects;
drop policy if exists "mission6 materials insert" on storage.objects;
drop policy if exists "mission6 materials delete" on storage.objects;
create policy "mission6 materials read" on storage.objects for select to anon, authenticated using (bucket_id = 'mission-materials');
create policy "mission6 materials insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'mission-materials' and (storage.foldername(name))[1] = 'goals');
create policy "mission6 materials delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'mission-materials');
