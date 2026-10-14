# Do-er

**배포 URL:** https://doer-app-neon.vercel.app (첫 화면은 미션 5의 소개 페이지, 앱은 `/login`부터)

## 서비스 소개

Do-er는 해야 할 일을 정해 놓고도 휴대폰 때문에 시작을 미루는 사람을 위한 AI 실행 코치입니다. 자격시험, 어학, 운동, 독서, 포트폴리오처럼 목표가 있고 매일 조금씩 해야 하는 일이면 모두 대상입니다.

1. **계획**: 코치(AI)와 대화하며 목표와 사정을 말하면, 끝나는 날까지의 날짜별 계획을 짜고 계획을 그렇게 짠 근거를 보여 줍니다.
2. **잠금**: 오늘 할 일을 시작하면, 사용자가 직접 고른 앱이나 화면(릴스, 쇼츠 등)이 잠깁니다. 전화, 메신저, 검색은 잠그지 않습니다.
3. **맞춤 인증**: 과제마다 AI가 맞는 인증 방식(사진, 퀴즈, 글)을 골라 두고, 끝낸 것을 인증하면 잠금이 풀립니다.
4. **조정**: 잠금을 바로 푸는 길은 없습니다. 버거운 날은 코치와 대화해 조정안과 그 대가를 보고 고릅니다.

웹 앱(이 저장소의 Next.js 부분)이 서비스의 전부를 담고, 안드로이드 앱(`android/`)은 웹 화면을 띄우고 실제 앱 잠금만 맡는 얇은 껍데기입니다. **미션 6의 검사 대상은 웹 앱**이며, 브라우저만으로 잠금을 뺀 모든 기능을 확인할 수 있습니다.

## 핵심 기능 명세

CRUD 대상은 **목표(goals)** 이고, 파일 업로드는 **목표 자료 사진**과 **인증 사진**으로 연결했습니다. 모든 데이터는 로그인한 사용자 본인만 읽고 쓸 수 있습니다.

### 사용자 흐름

가입(필수 동의 3가지) → 코치와 대화 → 알아들은 내용 확인 → 계획 생성 → 목표 화면(달력) → 오늘 할 일 → 시작(잠금) → 인증 → 잠금 해제. 버거운 날은 코치 탭에서 조정합니다.

### 화면별 명세

| 화면 | 입력 | 사용자 행동 | 성공 결과 | 실패 결과 |
|---|---|---|---|---|
| 가입·로그인 `/login` | 이메일, 비밀번호, 필수 동의 3가지 / 구글·카카오 | 가입 또는 로그인 | 가입하면 코치와의 대화로, 로그인하면 오늘 화면으로 이동 | 동의 전에는 가입 버튼이 잠김. 틀린 정보는 안내 문구 |
| 코치와 대화(등록) `/goals/new` | 자유 대화, 선택지, 자료 사진(선택), 잠글 앱 | 목표와 사정을 말하고 "확인하러 가기" | 알아들은 내용을 확인 장에 채워 보여 줌. 대화는 이 기기에 저장돼 나갔다 와도 이어짐 | AI 응답 실패 시 안내 문구, 직접 적기로 넘어갈 수 있음 |
| 계획 확인(등록) | 목표, 기한 종류와 날짜, 가능한 시간, 하루 시간, 상황, 자료 사진, 잠글 앱 | "계획 만들기" | 저장 후 목표 화면으로 이동, 코치가 화면을 짚어 주는 첫 안내 | 항목별 오류 문구, 입력값 유지. 계획 생성 실패 시 목표는 저장하고 다시 시도 버튼 |
| 목록 `/goals` | 검색어, 종류 필터, 페이지 (5개씩, 목표가 6개 이상이면 검색 표시) | 목표 눌러 상세로 | 목표마다 D-day와 오늘 할 일 수 | 빈 상태 안내, 범위를 넘은 페이지는 마지막 페이지로 |
| 상세 `/goals/[id]` | 날짜 선택 | 달력에서 날짜를 눌러 그날 할 일 보기, 근거 화면으로, 수정·다시 만들기·삭제 | 달력, 고른 날의 할 일, 근거 요약 한 줄 | 없는 주소는 "목표를 찾을 수 없어요" 화면 |
| 근거 `/goals/[id]/why` | 없음 | 주차를 펼쳐 보기 | 코치의 근거, 가정한 것, 주마다 하는 일, 알려 준 것 | 계획이 없거나 없는 주소면 없는 화면 |
| 수정 `/goals/[id]/edit` | 등록 확인 장과 같음 | "저장하고 계획 맞추기" | 저장 후 오늘부터의 계획을 다시 짬 | 등록과 같음 |
| 삭제 (상세의 확인 창) | 없음 | 휴지통 → "지우기" 또는 "그대로 두기" | 목표, 계획, 관련 사진을 지우고 목록으로 | 확인 창 안에 오류 문구 |
| 오늘 `/today` | 없음 | 할 일 눌러 인증, "시작하기" | 시작 전 확인 창(잠기는 곳, 바로 풀 수 없음, 사진 보관 기간) 후 잠금 | 할 일이 없으면 쉬는 날 안내 |
| 인증 (오늘의 시트) | 사진(JPG·PNG·WEBP, 3MB 이하) / 퀴즈 답 / 40자 이상의 글 | 과제에 정해진 방식으로 인증 | AI가 판정과 이유를 돌려주고, 모두 통과하면 잠금 해제 | 통과하지 못하면 이유와 다시 인증, 판정 이의 제기 |
| 조정 `/goals/new?talk=adjust` | 사정 | 코치에게 말하고 조정안 고르기 | 조정안과 대가를 보고 고르면 오늘 할 일에 반영 | "그대로 할게요" 선택 가능. 할 일을 오래 하지 않으면 오늘 화면 아래에 코치의 한마디가 뜸 |
| 내 정보 `/settings` | 잠글 앱과 그 화면 | 저장, 로그아웃, 탈퇴 | 다음 시작부터 적용. 탈퇴 시 모든 기록과 사진 삭제 | 탈퇴는 "탈퇴"라고 적어야 진행 |

### 입력 규칙 (서버에서 다시 검사하고, DB 제약으로 한 번 더 막음)

| 항목 | 필수 | 규칙 |
|---|---|---|
| 목표 | 필수 | 1~40자 |
| 기한 종류 | 필수 | 정한 날까지(dated), 날짜 없이 완성(finish), 매주 반복(ongoing) |
| 날짜 | 정한 날까지일 때 필수 | 오늘 이후의 실제 날짜 |
| 하루 시간 | 필수 | 10~600분 |
| 가능한 시간 | 선택 | 120자 이하 |
| 지금 상황 | 선택 | 300자 이하 |
| 코치가 더 알게 된 것 | 선택 | 1,500자 이하 |
| 사진 | 선택 | JPG, PNG, WEBP, 3MB 이하 |

저장하는 동안에는 입력칸과 버튼을 잠가 중복 제출을 막습니다.

## 테이블 구조

Supabase(PostgreSQL)에 표 6개가 있고, 모든 표에 `user_id`와 행 단위 접근 제한(RLS)이 걸려 있어 본인 행만 읽고 씁니다. 전체 SQL은 [supabase/schema.sql](supabase/schema.sql)에 있습니다.

### goals: 목표와 AI가 만든 계획

| 컬럼 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | uuid | 자동 | 기본 키 |
| `user_id` | uuid | 자동 | 주인 (auth.users) |
| `title` | text | 필수 | 목표, 1~40자 |
| `kind` | text | 필수 | dated / finish / ongoing |
| `deadline` | date | dated일 때 | 끝나는 날 |
| `daily_minutes` | integer | 필수 | 하루 시간, 10~600 |
| `schedule` | text | 선택 | 언제 할 수 있는지 |
| `note` | text | 선택 | 지금 상황 |
| `context` | text | 선택 | 대화에서 코치가 더 알게 된 사정 |
| `material_path` | text | 선택 | 자료 사진의 저장소 경로 |
| `material_summary` | text | 선택 | AI가 사진에서 읽은 내용 |
| `plan` | jsonb | 선택 | 계획 (요약, 근거, 가정, 주별 흐름, 날짜별 할 일과 인증 방식) |
| `plan_status` | text | 필수 | pending / ready / failed |
| `plan_generated_at` | timestamptz | 선택 | 계획을 만든 시각 |
| `created_at`, `updated_at` | timestamptz | 자동 | 만든·고친 시각 (트리거로 갱신) |

### 나머지 표

| 표 | 하는 일 | 주요 컬럼 |
|---|---|---|
| `proofs` | 인증 기록 (과제마다 가장 최근 한 건) | `goal_id`, `task_id`, `date`, `kind`(photo/quiz/write), `passed`, `reason`, `image_path`, `answer`, `appeal` |
| `app_settings` | 잠글 앱과 오늘의 잠금 상태 (사용자당 한 줄) | `lock_targets`(text[]), `lock_date` |
| `adjustments` | 계획 조정 기록 | `date`, `reason`, `choice`, `impact` |
| `consents` | 약관·개인정보 동의 기록 | `version`, `agreed_at` |
| `ai_runs` | AI 사용 기록 (사용량 제한용) | `purpose`, `ok`, `model`, `input_tokens`, `output_tokens` |

사진은 Supabase Storage의 **비공개** 버킷 `goal-materials`에 `사용자 id/materials/` 또는 `사용자 id/proofs/` 경로로 저장하고, 화면에는 기한이 있는 서명 주소로 보여 줍니다. 인증 사진 원본은 판정 7일 뒤 지우고, 목표를 지우거나 탈퇴하면 관련 사진을 함께 지웁니다.

## 기술 스택

| 영역 | 쓰는 것 |
|---|---|
| 웹 앱 | Next.js 16 (App Router, Server Actions), React 19, TypeScript, zod |
| 데이터·로그인·파일 | Supabase (PostgreSQL + RLS, Auth, Storage) |
| AI | OpenAI 방식 SDK(`openai`)로 GPT 모델 호출. 응답 형식을 zod로 고정 |
| 배포 | Vercel (서울 지역) |
| 안드로이드 껍데기 | Java, WebView, 접근성 서비스(앱 잠금) |
| 점검 | playwright-core로 실제 브라우저(Edge)를 띄워 가입부터 탈퇴까지 자동 점검 |

데이터 변경과 AI 호출은 모두 서버(Server Actions)에서만 하고, 브라우저가 데이터베이스나 AI를 직접 부르지 않습니다.

## 실행 방법

1. 패키지를 설치합니다.

   ```bash
   npm install
   ```

2. Supabase 프로젝트를 만들고, SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다. Authentication 설정에서 이메일 확인(Confirm email)은 꺼 둡니다.
3. `.env.example`을 `.env.local`로 복사한 뒤 값을 채웁니다.
4. 개발 서버를 실행하고 `http://localhost:3000/login`을 엽니다.

   ```bash
   npm run dev
   ```

5. (선택) 자동 점검: 개발 서버를 3100번에서 띄운 뒤 실행합니다. 점검용 계정을 만들고 마지막에 탈퇴합니다.

   ```bash
   node scripts/e2e.mjs
   ```

## 환경 변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 필수 | Supabase 공개 키 (예전 이름 anon). service_role 키는 쓰지 않습니다 |
| `OPENAI_API_KEY` | 필수 | AI 키 (서버에서만 씀) |
| `OPENAI_BASE_URL` | 선택 | 중계 서비스를 거칠 때의 주소 |
| `OPENAI_CHAT_MODEL`, `OPENAI_PLAN_MODEL`, `OPENAI_DAYS_MODEL`, `OPENAI_JUDGE_MODEL`, `OPENAI_PLAN_EFFORT` | 선택 | 용도별 모델과 계획의 생각 깊이 |
| `NEXT_PUBLIC_AUTH_PROVIDERS` | 선택 | 가입 화면에 보여 줄 소셜 로그인 (예: `google,kakao`) |
| `AI_BUDGET_USD`, `AI_USER_BUDGET_USD` | 선택 | 최근 7일 AI 예산, 전체와 한 사람 몫 (기본 70, 10달러) |
| `AI_PRICE_IN`, `AI_PRICE_OUT` | 선택 | 토큰 백만 개의 값 (기본 5, 20달러) |

로컬은 `.env.local`에, 배포는 Vercel의 Project Settings → Environment Variables에 같은 이름으로 넣습니다. 실제 값은 저장소에 올리지 않습니다.

## 폴더 구조

```
app/login, app/consent    가입·로그인, 소셜 로그인 뒤 동의
app/goals/                코치와 대화(new), 목록, 상세([id]), 근거([id]/why), 수정([id]/edit)
app/goals/actions.ts      데이터 변경과 AI 호출 Server Actions
app/today/                오늘 할 일, 시작, 인증
app/settings, privacy, terms   내 정보, 개인정보 처리방침, 이용약관
components/               화면 부품 (ui.tsx의 공통 부품, 대화, 달력, 인증 등)
lib/goals.ts              데이터 형태와 입력 규칙 (서버와 브라우저가 함께 씀)
lib/plan.ts               AI 호출과 사용량 제한 (서버 전용)
lib/supabase.ts           Supabase 연결과 조회 (서버 전용)
proxy.ts                  로그인 세션 갱신과 화면 보호
supabase/                 전체 SQL과 추가 SQL
scripts/e2e.mjs           가입부터 탈퇴까지 자동 점검
android/                  안드로이드 껍데기 (웹 화면 + 앱 잠금)
public/                   미션 5 소개 페이지
```

## QA 결과

체크리스트와 점검 결과는 [docs/QA.md](docs/QA.md)에 있습니다.
