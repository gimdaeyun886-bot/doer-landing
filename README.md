# Do-er (미션 6)

- **배포 URL:** https://doer-mission6.vercel.app
- **GitHub:** https://github.com/gimdaeyun886-bot/doer-landing/tree/mission-6 (`mission-6` 브랜치. `main`은 미션 5)
- **처음 볼 곳:** 배포 URL을 열면 "오늘" 화면이 나옵니다. 아래 탭의 **목표**가 이번 미션의 CRUD 화면입니다.

로그인 없이 모든 방문자가 하나의 **공용 데모 공간**을 함께 씁니다. 이름, 연락처 같은 개인정보는 적지 마세요.

## 서비스 소개

Do-er는 해야 할 일을 정해 두고도 시작하기 직전에 폰을 집어 드는 사람을 위한 실행 코치입니다. 미션 5에서 이 문제와 사용자 흐름을 랜딩 페이지로 소개했고, 미션 6에서는 그 흐름을 실제 데이터로 동작하는 MVP로 만들었습니다.

1. 해내고 싶은 일을 코치(AI)에게 말하면, 코치가 되물어 가며 목표·기한·시간을 정리합니다.
2. 확인 장에서 내용을 고쳐 저장하면, 코치가 목표일까지 날짜별 할 일을 짭니다.
3. "오늘" 화면에서 오늘 할 일을 확인하고 시작합니다. 할 일마다 코치가 고른 방식(사진·퀴즈·글)으로 인증합니다.
4. 버거운 날에는 코치에게 사정을 말하고, 조정안과 그 대가를 본 뒤 고릅니다.

목표는 시험에 한정하지 않고 세 가지 종류를 받습니다: 정한 날까지(`dated`), 날짜 없이 완성(`finish`), 매주 반복(`ongoing`).

### 이번 미션에서 준비 중인 것

- **실제 앱 잠금:** 고른 앱을 잠그는 기능은 Do-er 안드로이드 앱에서 동작합니다. 웹에서는 "준비 중이에요"로 안내하고, 시작한 기록과 인증 기록만 저장합니다.
- **로그인과 내 데이터만 보기:** 미션 7에서 붙입니다.

## 핵심 기능: 목표 CRUD

CRUD 대상은 **목표**(`mission_goals`)입니다. 목표마다 인증 기록(`mission_proofs`)이 연결됩니다.

사용자 흐름: **목록 → 상세 → 등록·수정 → 삭제**

| 화면 | 주소 | 입력 | 사용자 행동 | 성공하면 | 실패하면 |
|---|---|---|---|---|---|
| 목록 | `/goals` | 검색어, 종류 | 목표를 찾아 고름 | 최근 것부터 5개씩. 목표마다 D-day와 오늘 할 일 수 | 저장소 오류 화면과 "다시 시도". 목표가 없으면 빈 화면 안내 |
| 등록 | `/goals/new` | 코치와 대화(자유롭게 말하기, 선택지, 자료 사진) → **확인 장(입력 폼)**: 목표, 기한 종류, 날짜, 언제, 하루 시간, 지금 상황, 코치가 알게 된 것, 자료 사진, 잠글 앱 | 확인 장에서 고치고 "계획 만들기". 대화 없이 "직접 적기"도 가능 | 저장 후 코치가 계획을 짜고(약 1분) 상세로 이동, "계획을 다 짰어요" | 칸마다 오류 문구, 적은 값 유지. 계획을 못 짜도 목표는 저장되고 상세에서 다시 만들 수 있음 |
| 상세 | `/goals/[id]` | 없음 | 달력에서 날짜별 할 일 보기, 근거 보기, 고치기, 계획 다시 만들기, 지우기 | 계획 달력, 코치가 이렇게 짠 이유, 올린 자료 사진, 관리 메뉴 | 없는 id나 형식이 틀린 주소면 "목표를 찾을 수 없어요" |
| 근거 | `/goals/[id]/why` | 없음 | 코치의 근거와 주별 흐름 확인 | 근거, 가정, 주별 흐름, 알려 준 내용 | 위와 같음 |
| 수정 | `/goals/[id]/edit` | 확인 장과 같은 폼. 기존 값이 채워져 있음. 사진 바꾸기·지우기 | "저장하고 계획 맞추기" | 상세로 이동. 계획에 영향을 주는 값이 바뀌면 오늘부터의 계획을 다시 짬 | 첫 오류 칸 안내. 이미 지운 목표면 안내 |
| 삭제 | 상세 위쪽 휴지통 | 없음 | 확인 창에서 "지우기" | 목록으로 이동, "목표를 지웠어요". 인증 기록과 사진도 함께 지움 | 확인 창 안에 오류 문구 |

함께 쓰는 화면

| 화면 | 주소 | 하는 일 |
|---|---|---|
| 오늘 | `/today` | 오늘 할 일과 인증 방식, 시작 전 확인(잠기는 곳, 바로 풀 수 없음, 사진 보관 7일), 과제별 인증(사진 올리기·퀴즈·글), 판정 이의 제기. 오래 하지 않으면 아래에 코치의 한마디 |
| 조정 | `/goals/new?talk=adjust` | 사정을 말하면 조정안과 각각의 대가를 보여 주고, 고른 안을 계획과 기록에 반영 |
| 내 정보 | `/settings` | 잠글 앱 고르기, 공용 데모 안내 |

### 입력 규칙

규칙은 `lib/goals.ts` 한 곳에 있고, 브라우저와 서버가 같은 규칙으로 검사합니다. DB에도 같은 범위의 제약을 걸었습니다.

| 칸 | 규칙 |
|---|---|
| 목표 | 필수, 40자 이하 |
| 날짜 | "정한 날까지"일 때 필수, 오늘부터 2년 이내 |
| 하루에 낼 시간 | 필수, 10분에서 600분 사이의 정수 |
| 언제 / 지금 상황 / 코치가 알게 된 것 | 선택, 120자 / 300자 / 1500자 이하 |
| 잠글 앱 | 선택. 전화, 메신저, 검색은 목록에 없음 |
| 자료 사진, 인증 사진 | JPG, PNG, WEBP, 3MB 이하. 고르는 순간, 서버, Storage 버킷 설정에서 세 번 막음 |
| 글 인증 / 이의 제기 | 40자 이상 1000자 이하 / 300자 이하 |

### 그 밖의 처리

- **중복 제출 방지:** 저장하는 동안 입력칸과 버튼을 잠그고 진행 상태를 보여 줍니다. 확인 장은 열릴 때 요청 번호(`request_id`)를 받고, DB의 unique 제약 때문에 같은 번호로는 한 번만 저장됩니다.
- **로딩, 오류, 빈 상태:** 화면마다 자리표시(skeleton), 오류 화면과 다시 시도, 빈 상태 안내가 있습니다. 계획을 짜는 동안에는 단계별 진행 화면을 보여 줍니다.
- **없는 주소:** 형식이 틀린 id, 없는 id, 지운 목표, 없는 페이지 모두 안내 화면으로 이어집니다.
- **AI 사용 상한:** 로그인이 없어 누구나 AI를 부를 수 있으므로, 데모 전체 기준으로 하루 횟수(계획 30회, 대화 300회 등)와 최근 7일 금액(기본 10달러)을 넘으면 AI를 멈춥니다. AI가 멈춰도 "직접 적기"로 목표를 등록할 수 있습니다.
- **공용 데모 정리:** 목표를 모두 지우면 잠글 앱과 시작 기록도 처음 상태로 돌아갑니다.
- **심화:** 목록 검색과 종류 필터를 주소(`q`, `kind`, `page`)에 남깁니다. 사진 업로드 미리보기와 삭제를 지원합니다. 인증 기록은 목표와 관계 테이블로 연결됩니다.

## 테이블 구조

`supabase/schema.sql` 한 파일에 테이블, 제약, 인덱스, RLS 정책, DB 함수, Storage 버킷이 모두 들어 있습니다. 같은 Supabase 프로젝트의 다른 데이터와 섞이지 않게 이름 앞에 `mission_`을 붙였습니다.

### `mission_goals` (CRUD 대상)

| 컬럼 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | uuid | 필수 (기본값 `gen_random_uuid()`) | 고유 식별자 |
| `request_id` | uuid | unique | 확인 장이 준 요청 번호. 중복 저장 방지 |
| `title` | text | 필수 | 1~40자 |
| `kind` | text | 필수 | `dated`, `finish`, `ongoing` |
| `deadline` | date | `kind = dated`일 때만 | check 제약으로 `kind`와 맞춤 |
| `daily_minutes` | integer | 필수 | 10~600 |
| `schedule` | text | 선택 | 언제 할 수 있는지, 120자 이하 |
| `note` | text | 선택 | 지금 상황, 300자 이하 |
| `context` | text | 선택 | 대화에서 코치가 알게 된 사정, 1500자 이하 |
| `material_path` | text | 선택 | 자료 사진 경로 (`materials/…`) |
| `material_summary` | text | 선택 | 코치가 사진에서 읽은 내용 |
| `plan` | jsonb | 선택 | AI가 만든 계획 (근거, 가정, 주별 흐름, 날짜별 할 일) |
| `plan_status` | text | 필수 | `pending`, `ready`, `failed` |
| `plan_generated_at` | timestamptz | 선택 | 계획을 만든 때 |
| `created_at` | timestamptz | 필수 (기본값 `now()`) | 만든 때 |
| `updated_at` | timestamptz | 필수 (기본값 `now()`) | 고친 때. 수정할 때 트리거가 갱신 |

### 함께 쓰는 테이블

| 테이블 | 하는 일 | 주요 컬럼 |
|---|---|---|
| `mission_proofs` | 할 일마다 가장 최근 인증 한 건 | `goal_id`(→ `mission_goals`, 지우면 함께 삭제), `task_id`, `date`, `kind`, `passed`, `reason`, `image_path`, `answer`, `appeal`, `created_at` / unique(`goal_id`, `task_id`) |
| `mission_settings` | 데모 공간의 잠글 앱과 시작한 날 (한 줄) | `id = 1`, `lock_targets`, `lock_date`, `updated_at` |
| `mission_adjustments` | 고른 조정안 기록 | `date`, `reason`, `choice`, `impact`, `created_at` |
| `mission_ai_runs` | AI 사용 기록 (사용량 상한용) | `purpose`, `goal_id`, `ok`, `model`, `input_tokens`, `output_tokens`, `created_at` |

### Storage 버킷 `mission-materials`

비공개 버킷입니다. 자료 사진은 `materials/`, 인증 사진은 `proofs/` 폴더에 저장되고, 화면에는 한 시간 동안 쓸 수 있는 주소로 보여 줍니다. 버킷 설정에서 3MB 이하의 JPG·PNG·WEBP만 받습니다. 인증 사진 원본은 판정 7일 뒤 지웁니다.

### 권한

이번 미션에는 로그인이 없어서 개인정보를 받지 않습니다. 모든 테이블에 RLS를 켜 두고, 미션 6 동안은 데모 공간을 누구나 읽고 쓸 수 있는 정책을 둡니다. 예외로 AI 사용 기록(`mission_ai_runs`)은 정책이 없어 직접 읽거나 고칠 수 없고, 기록과 합계는 DB 함수(`mission_ai_log`, `mission_ai_usage`)로만 다룹니다. 미션 7에서 `user_id`를 더하고 자기 줄만 다루는 정책으로 바꿉니다.

## 기술 스택

- Next.js 16 (App Router, Server Actions), React 19, TypeScript, zod
- Supabase (Postgres, Storage), `@supabase/supabase-js`
- AI: OpenAI 호환 API (`openai` SDK). 대화·인증 판정·조정과 계획 생성에 다른 모델을 씁니다
- Vercel (서울 리전 `icn1`)
- 점검: Playwright로 실제 브라우저(Edge)를 띄워 화면을 눌러 보는 자동 점검 `scripts/e2e.mjs`

## 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에 아래 환경 변수 값을 채운 뒤 `npm run dev`를 실행하면 http://localhost:3000 에서 열립니다. 처음 한 번은 Supabase 대시보드의 SQL Editor에서 `supabase/schema.sql`을 실행해야 합니다.

자동 점검은 개발 서버를 띄운 상태에서 돌립니다. 주소를 주면 배포 환경도 같은 방식으로 점검합니다. 데모 공간에 목표가 없을 때만 돌고, 만든 목표는 끝나면 지웁니다. 실제 AI를 쓰므로 한 번에 몇 분이 걸립니다.

```bash
node scripts/e2e.mjs
node scripts/e2e.mjs https://배포주소
```

## 환경 변수

| 이름 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 공개 키 (publishable / anon) |
| `OPENAI_API_KEY` | AI 키 |
| `OPENAI_BASE_URL` | (선택) 중계 서비스를 쓸 때의 주소 |
| `AI_BUDGET_USD`, `AI_PRICE_IN`, `AI_PRICE_OUT` | (선택) 7일 금액 상한과 토큰 값 |

값은 `.env.local`과 Vercel 프로젝트 설정에만 두고 저장소에는 올리지 않습니다(`.gitignore`의 `.env*`). service_role 키는 쓰지 않습니다.

## 폴더 구조

```
app/
  today/                      오늘 할 일, 시작, 인증
  goals/page.tsx              목록 (검색, 종류 필터, 페이지)
  goals/new/page.tsx          코치 대화 → 확인 장(등록), 조정 대화
  goals/[id]/page.tsx         상세 (계획 달력)
  goals/[id]/why/page.tsx     코치의 근거
  goals/[id]/edit/page.tsx    수정
  goals/actions.ts            등록·수정·삭제·인증·조정 Server Actions
  settings/                   내 정보 (잠글 앱)
components/                   CoachChat, ConfirmForm, GoalDetail, PlanCalendar, TodayView, TaskVerify, AdjustChat 등
lib/goals.ts                  타입, 입력 규칙, 날짜 계산
lib/plan.ts                   AI 호출과 사용량 상한 (서버 전용)
lib/supabase.ts               Supabase 연결과 조회 (서버 전용)
supabase/schema.sql           테이블, 정책, DB 함수, 버킷
scripts/e2e.mjs               자동 점검
docs/QA.md                    QA 체크리스트와 결과
```

## QA 결과

로컬과 배포 환경에서 자동 점검 39개 항목을 모두 통과했습니다. 시나리오별 결과는 [docs/QA.md](docs/QA.md)에 있습니다.
