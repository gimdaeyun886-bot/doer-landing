# Do-er API 기능 명세서

Do-er의 서버 기능은 REST 주소 대신 **Next.js Server Actions**로 만들었습니다. 화면(폼, 버튼)이 서버 함수를 직접 부르고, 서버 함수가 로그인 확인 → 입력 검사 → Supabase 저장 → AI 호출을 차례로 합니다. 브라우저는 Supabase나 OpenAI를 직접 부르지 않습니다.

- 배포: https://doer-mission8.vercel.app (Vercel, 서버 지역 서울 `icn1`)
- 저장소: Supabase(Postgres + Auth + Storage). 모든 표에 `user_id`가 있고 RLS로 자기 줄만 읽고 씁니다.
- AI: OpenAI 호환 API. 키는 서버 환경 변수(`OPENAI_API_KEY`)에만 있습니다.
- 코드: 목표·오늘·코치 기능은 `app/goals/actions.ts`, 계정 기능은 `app/auth/actions.ts`, 외부 로그인 콜백은 `app/auth/callback/route.ts`.

## 공통 규칙

| 항목 | 내용 |
|---|---|
| 인증 | 로그인 쿠키(Supabase 세션). 로그인하지 않으면 `proxy.ts`가 `/login`으로 보내고, 서버 함수는 "로그인이 풀렸어요" 메시지를 돌려줍니다. |
| 응답 형태 | 성공하면 `revalidatePath` 후 다음 화면으로 `redirect`하거나 `{ ok: true }` 같은 값을 돌려줍니다. 실패하면 `{ message: "사용자가 읽을 한국어 문장" }`을 돌려주고, 원인 상세는 서버 로그에만 남깁니다. |
| 입력 검사 | 규칙은 `lib/goals.ts`에 두고 서버에서 반드시 다시 검사합니다. 브라우저가 보낸 대화 상태나 조정안은 믿지 않고 서버가 형태와 범위를 다시 맞춥니다. DB 제약(`supabase/schema.sql`)으로 한 번 더 막습니다. |
| 잠금 중 | 오늘 시작했고 인증하지 않은 할 일이 남았으면, 목표 수정·삭제, 계획 다시 만들기, 잠글 앱 저장을 막습니다(`LOCKED` 메시지). |
| AI 사용 제한 | `ai_runs` 기록으로 세 겹 제한: 사용자별 하루 횟수(계획 3, 대화 50, 사진 읽기 5, 인증 15, 조정 3, 놓친 날 3), 최근 7일 한 사람 금액, 최근 7일 전체 금액. |
| 파일 | JPG, PNG, WEBP, 3MB 이하. 비공개 버킷 `goal-materials`의 `사용자 id/materials|proofs/`에 저장. 인증 사진은 판정 7일 뒤 지웁니다. |

## 1. 계정 (`app/auth/actions.ts`)

| 기능 | 부르는 곳 | 입력 | 성공 | 실패 응답 예 |
|---|---|---|---|---|
| `signUp` 가입 | 시작 화면 → 이메일로 가입 | `email`, `password`(8자 이상), `agree_terms`, `agree_privacy`, `agree_age`(셋 다 필수) | 동의 기록 저장 후 `/start`(가입 안내)로 이동 | "필수 항목에 모두 동의해 주세요.", "비밀번호는 8자 이상으로 정해 주세요." |
| `signIn` 로그인 | 이미 계정이 있어요 → 이메일로 로그인 | `email`, `password` | `/today`로 이동 | "이메일과 비밀번호를 적어 주세요." |
| `signInWith` 외부 로그인 | 카카오·구글로 계속하기 | `provider`(`google`/`kakao`), `inApp`(앱 안에서 열었는지) | `{ url }` 외부 로그인 주소 | "로그인 화면을 열지 못했어요." |
| `agree` 동의 | 외부 로그인 뒤 동의 화면 | 동의 3가지 | 동의 기록 후 `/start` | "필수 항목에 모두 동의해 주세요." |
| `signOut` 로그아웃 | 내 정보 | 없음 | `/login` | - |
| `deleteAccount` 탈퇴 | 내 정보 → 탈퇴하기 | `confirm`에 "탈퇴" | DB 함수 `delete_my_account`로 계정·기록·사진 삭제 후 `/login?bye=1` | "확인 칸에 '탈퇴'라고 적어 주세요." |
| `GET /auth/callback` | 카카오·구글 로그인에서 돌아옴 | `code` | 세션 만든 뒤 `/today` | 실패하면 `/login?failed=1` |

## 2. 목표와 계획 (`app/goals/actions.ts`)

| 기능 | 부르는 곳 | 입력 | 성공 | 실패 응답 예 |
|---|---|---|---|---|
| `askCoach` 코치 대화 한 턴 | 코치 탭 → 새 목표 대화 | 지난 대화, 지금까지 정리한 칸(목표, 종류, 날짜, 하루 시간, 사정, 잠글 앱), 사진(선택) | 코치의 답, 선택지, 갱신된 칸, 다 모였는지(`ready`) | AI 실패나 하루 횟수 초과 시 안내 문장 |
| `createGoal` 목표 만들기 | 대화 끝의 확인 장 → 계획 만들기 | 목표 이름(1~40자), 종류(`dated`/`finish`/`ongoing`), 날짜(dated일 때 오늘~2년), 하루 시간(10~600분), 언제 할 수 있는지, 사정, 자료 사진, 잠글 앱 | 저장 → AI가 날짜별 계획과 근거를 만듦 → `/goals/{id}?notice=created` | 칸별 오류(`errors`)와 "표시한 곳을 다시 확인해 주세요." 계획만 실패하면 목표는 저장하고 `created-noplan` |
| `updateGoal` 목표 고치기 | 목표 화면 → 목표 고치기 | 위와 같음 + `remove_material` | 계획에 영향 있는 값이 바뀌면 계획을 다시 짬. 지난 날 계획과 기록은 그대로 | "이미 지운 목표예요.", 잠금 중 `LOCKED` |
| `regeneratePlan` 계획 다시 만들기 | 목표 화면, 오늘 화면의 빈 상태, 다음 계획 대화 | 목표 id | 오늘 이후 계획만 새로 짬 → `/goals/{id}?notice=replanned` | "목표일이 지났어요. 목표 고치기에서 새 날짜를 정하면 다시 짜요." |
| `deleteGoal` 휴지통으로 | 목표 화면 오른쪽 위 휴지통 | 목표 id | `deleted_at` 기록(30일 보관) → `/goals?notice=deleted` | 잠금 중 `LOCKED` |
| `restoreGoal` 되살리기 | 휴지통 화면 | 목표 id | `deleted_at` 비움 → `/goals/{id}?notice=restored` | "이미 완전히 지워졌을 수 있어요." |
| `purgeGoal` 완전히 지우기 | 휴지통 화면(한 번 더 확인) | 목표 id | 목표·인증 기록·사진 파일 삭제 → `/goals/trash?notice=purged` | "휴지통에서 찾지 못했어요." |

화면을 열 때 서버가 하는 정리(`lib/supabase.ts`의 `sweepGoals`): 휴지통에 30일 넘게 있던 목표를 완전히 지우고, 목표일까지 인증이 하나도 없이 끝난 계획은 계획만 지웁니다(`plan_status = expired`, 목표는 남김).

## 3. 오늘 할 일과 인증

| 기능 | 부르는 곳 | 입력 | 성공 | 실패 응답 예 |
|---|---|---|---|---|
| `startToday` 시작 | 오늘 화면 → 시작 전 확인 → 시작 | 없음 | 오늘 날짜를 `app_settings.lock_date`에 기록, 안드로이드 앱이 고른 앱을 잠금 | `{ ok: false }` |
| `startQuiz` 퀴즈 받기 | 할 일 → 인증(퀴즈 방식) | 목표 id, 할 일 id | `{ questions: [3문제] }` | "오늘 할 일에서만 인증할 수 있어요." |
| `verifyTask` 인증 | 할 일 → 인증 | 목표 id, 할 일 id + 방식별 값: 사진 `photo` / 퀴즈 `question`·`answer` 3쌍 / 글 `text`(40자 이상) | AI 판정 저장 → `{ passed, reason }`. 모두 인증하면 잠금 해제 | "인증할 사진을 골라 주세요.", "세 문제 모두 답을 적어 주세요." |
| `appealProof` 이의 제기 | 판정 결과 → 판정이 틀렸어요 | 목표 id, 할 일 id, `appeal`(5자 이상) | 운영자가 볼 수 있게 사유 저장 → `{ sent: true }` | "어떤 점이 틀렸는지 한 줄만 적어 주세요." |
| `saveLocks` 잠글 앱 저장 | 내 정보 → 잠글 앱 | `lock`(여러 개, 정해 둔 목록 안에서만) | `{ saved: true }` | 잠금 중 `LOCKED` |

## 4. 코치의 조정 (OpenAI 활용 고도화)

| 기능 | 부르는 곳 | 입력 | 성공 | 실패 응답 예 |
|---|---|---|---|---|
| `requestAdjustment` 오늘 조정안 받기 | 코치 탭 → 오늘이 버거워요 | 사정(한 줄) | 조정안 2~3개(무엇이 바뀌고 어떤 대가가 있는지) | AI 실패·횟수 초과 안내 |
| `applyAdjustment` 조정안 고르기 | 조정 대화 | 사정, 고른 안 | 서버가 안을 다시 검사한 뒤 계획 반영, `adjustments`에 기록 → `{ ok: true }` | "적용할 수 있는 내용이 없었어요. 다시 말해 주세요." (오늘 할 일을 모두 비우는 안은 서버가 거름) |
| `requestRecovery` 놓친 날 정리안 받기 | 오늘 화면의 "어제 못 한 일" 줄 | 사정(선택) | 코드가 만든 기본안 + AI 안(무엇을 살릴지) | AI가 실패해도 기본안은 나옴 |
| `applyRecovery` 놓친 날 정리 | 놓친 날 대화 | 사정, 고른 안 | 옮길 일의 사본을 받는 날 계획에 더함, `adjustments`에 `kind=recover`로 기록 → `{ ok, impact }` | "이미 정리했어요.", "그사이 계획이 바뀌어 이 방법은 쓸 수 없어요." |

## 5. 데이터 (`supabase/schema.sql`)

| 표 | 내용 |
|---|---|
| `goals` | 목표, AI가 만든 계획(`plan` jsonb), 계획 상태(`pending`/`ready`/`failed`/`expired`), 휴지통에 넣은 때(`deleted_at`) |
| `proofs` | 인증 기록(방식, 통과 여부, 판정 이유, 사진 경로, 이의 제기) |
| `app_settings` | 잠글 앱, 오늘 시작한 날 |
| `adjustments` | 조정 기록(`adjust`: 오늘 조정, `recover`: 놓친 날 정리) |
| `consents` | 가입 동의 기록 |
| `ai_runs` | AI 사용 기록(목적, 토큰 수). 사용 제한 계산에 씀 |

DB 함수: `delete_my_account()`(탈퇴), `ai_usage_since()`(최근 7일 전체 사용 금액).
