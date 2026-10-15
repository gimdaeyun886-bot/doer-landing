-- Do-er 미션 6: 목표·AI 계획·인증·조정·잠금 설정과 사진 저장소.
-- Supabase 대시보드 > SQL Editor에 전체를 붙여 넣고 한 번 실행한다. 여러 번 실행해도 결과는 같다.
--
-- 미션 6에는 로그인이 없다. 모든 방문자가 하나의 데모 공간을 함께 쓰고, 개인정보(이메일, 이름, 연락처)는 받지 않는다.
-- RLS는 켜 두고 미션 6 동안만 누구나 읽고 쓸 수 있게 연다. 사용자별 접근 제한(user_id + 자기 줄만 보는 정책)은 미션 7에서 붙인다.
-- 같은 Supabase 프로젝트의 다른 테이블과 섞이지 않게 이름 앞에 mission_ 을 붙였다.

-- 0) 앞 단계의 미션 6 테이블 정리 (점검용 데이터만 있던 것)
drop table if exists public.mission_ai_runs;
drop table if exists public.mission_adjustments;
drop table if exists public.mission_settings;
drop table if exists public.mission_proofs;
drop table if exists public.mission_goals;

-- 1) 목표와 AI 계획
create table public.mission_goals (
  id                uuid        primary key default gen_random_uuid(),
  request_id        uuid        unique,  -- 확인 장이 준 요청 번호. 같은 등록이 두 번 저장되지 않게 한다.
  title             text        not null check (char_length(title) between 1 and 40),
  kind              text        not null default 'dated' check (kind in ('dated', 'finish', 'ongoing')),
  deadline          date,                -- kind가 dated일 때만 값이 있다.
  daily_minutes     integer     not null check (daily_minutes between 10 and 600),
  schedule          text        check (schedule is null or char_length(schedule) <= 120),  -- 언제 할 수 있는지
  note              text        check (note is null or char_length(note) <= 300),          -- 지금 상황
  context           text        check (context is null or char_length(context) <= 1500),   -- 대화에서 코치가 더 알게 된 사정
  material_path     text,                -- 자료 사진 경로 (materials/…)
  material_summary  text,                -- 코치가 사진에서 읽은 내용
  plan              jsonb,               -- AI가 만든 계획: { summary, basis[], assumptions[], weeks[], days[] }
  plan_status       text        not null default 'pending' check (plan_status in ('pending', 'ready', 'failed')),
  plan_generated_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint mission_goals_deadline_matches_kind check ((kind = 'dated') = (deadline is not null))
);
create index mission_goals_created_idx on public.mission_goals (created_at desc, id);

-- 2) 인증 기록. 목표의 할 일 하나에 가장 최근 인증 한 건을 둔다.
create table public.mission_proofs (
  id          uuid        primary key default gen_random_uuid(),
  goal_id     uuid        not null references public.mission_goals (id) on delete cascade,
  task_id     text        not null,
  date        date        not null,
  kind        text        not null default 'photo' check (kind in ('photo', 'quiz', 'write')),
  passed      boolean     not null,
  reason      text        not null default '',
  image_path  text,        -- 사진 인증의 원본 (proofs/…). 판정 7일 뒤 지운다.
  answer      text,        -- 글·퀴즈 인증에서 적은 답
  appeal      text,        -- 판정에 이의를 제기한 내용
  appealed_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (goal_id, task_id)
);
create index mission_proofs_date_idx on public.mission_proofs (date);

-- 3) 잠글 앱과 오늘의 잠금 상태. 데모 공간에 한 줄(id = 1)만 둔다.
create table public.mission_settings (
  id           integer     primary key default 1 check (id = 1),
  lock_targets text[]      not null default '{}',
  lock_date    date,       -- '시작'을 누른 날
  updated_at   timestamptz not null default now()
);

-- 4) 계획 조정 기록 (버거운 날 코치와 정한 것)
create table public.mission_adjustments (
  id         bigint      generated always as identity primary key,
  date       date        not null,
  reason     text        not null,
  choice     text        not null,
  impact     text        not null,
  created_at timestamptz not null default now()
);

-- 5) AI 사용 기록. 공개 키로는 직접 읽고 쓸 수 없고, 아래 두 함수로만 기록하고 센다.
create table public.mission_ai_runs (
  id            bigint      generated always as identity primary key,
  purpose       text        not null check (purpose in ('plan', 'chat', 'read', 'verify', 'adjust')),
  goal_id       uuid        references public.mission_goals (id) on delete set null,
  ok            boolean     not null,
  model         text        not null,
  input_tokens  integer,
  output_tokens integer,
  created_at    timestamptz not null default now()
);
create index mission_ai_runs_idx on public.mission_ai_runs (purpose, created_at desc);

create or replace function public.mission_ai_log(purpose text, ok boolean, goal_id uuid, model text, input_tokens integer, output_tokens integer)
returns void language sql security definer set search_path = '' as $$
  insert into public.mission_ai_runs (purpose, ok, goal_id, model, input_tokens, output_tokens)
  values (purpose, ok, goal_id, left(model, 60), greatest(input_tokens, 0), greatest(output_tokens, 0));
$$;

-- 오늘 그 종류로 몇 번 썼는지와, 최근 7일 동안 쓴 토큰 수의 합만 돌려준다.
create or replace function public.mission_ai_usage(purpose text, day_start timestamptz, week_start timestamptz)
returns table (today_runs integer, week_input bigint, week_output bigint)
language sql security definer set search_path = '' stable as $$
  select
    (select count(*)::integer from public.mission_ai_runs r where r.purpose = mission_ai_usage.purpose and r.created_at >= day_start),
    (select coalesce(sum(r.input_tokens), 0)::bigint from public.mission_ai_runs r where r.created_at >= week_start),
    (select coalesce(sum(r.output_tokens), 0)::bigint from public.mission_ai_runs r where r.created_at >= week_start);
$$;

revoke all on function public.mission_ai_log(text, boolean, uuid, text, integer, integer) from public;
revoke all on function public.mission_ai_usage(text, timestamptz, timestamptz) from public;
grant execute on function public.mission_ai_log(text, boolean, uuid, text, integer, integer) to anon, authenticated;
grant execute on function public.mission_ai_usage(text, timestamptz, timestamptz) to anon, authenticated;

-- 6) 고칠 때마다 수정 시각을 서버가 적는다.
create or replace function public.mission_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger mission_goals_touch before update on public.mission_goals for each row execute function public.mission_touch();
create trigger mission_settings_touch before update on public.mission_settings for each row execute function public.mission_touch();

-- 7) 접근 권한. RLS를 켜고, 미션 6 동안만 데모 공간을 누구나 읽고 쓰게 연다. AI 사용 기록은 정책이 없어 직접 접근할 수 없다.
do $$
declare t text;
begin
  foreach t in array array['mission_goals', 'mission_proofs', 'mission_settings', 'mission_adjustments', 'mission_ai_runs'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  foreach t in array array['mission_goals', 'mission_proofs', 'mission_settings', 'mission_adjustments'] loop
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    execute format('create policy "mission6 open" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
  execute 'revoke all on public.mission_ai_runs from anon, authenticated';
end $$;

-- 8) 사진 저장소(자료 사진과 인증 사진): 이미지 3종, 3MB 이하. materials/ 와 proofs/ 폴더에만 올린다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mission-materials', 'mission-materials', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mission6 materials read" on storage.objects;
drop policy if exists "mission6 materials insert" on storage.objects;
drop policy if exists "mission6 materials delete" on storage.objects;
create policy "mission6 materials read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'mission-materials');
create policy "mission6 materials insert" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'mission-materials' and (storage.foldername(name))[1] in ('materials', 'proofs'));
create policy "mission6 materials delete" on storage.objects for delete to anon, authenticated
  using (bucket_id = 'mission-materials');
