# Do-er 프로젝트 컨텍스트

AI 코딩 도구와 사람이 함께 보는 작업 규칙입니다. 기능 명세와 실행 방법은 README.md에 있습니다.

## 제품 규칙 (바꾸지 않는다)

- 오늘 할 일은 AI가 만든다. 사용자가 직접 더하거나 고치지 않는다.
- 인증 방식(사진·퀴즈·글)은 과제마다 AI가 고른다. 사용자는 시작 전에 확인만 한다.
- 잠금을 바로 푸는 길은 없다. 버거운 날은 코치에게 사정을 말하고, 조정안과 그 대가를 본 뒤 고르거나 그대로 한다.
- 잠그는 것은 사용자가 고른 앱이나 그 앱의 화면(릴스·쇼츠 등)뿐이다. 전화·메신저·검색은 잠그지 않는다.
- 권한 해제나 앱 삭제를 막는다고 말하지 않는다. '국내 최초', '우회 불가' 같은 표현을 쓰지 않는다.
- 목표는 시험에 한정하지 않는다. 종류는 날짜 있음(dated), 날짜 없이 완성(finish), 매주 반복(ongoing) 세 가지다.

## 구조

- `public/` — 정적 랜딩. `next.config.ts`의 rewrite로 `/`에서 `public/index.html`을 보여 준다. Next.js 화면에서 `/`로 갈 때는 `<Link>`가 아니라 `<a>`를 쓴다.
- `proxy.ts` — 로그인 세션 갱신과 화면 보호(`/today`, `/goals`, `/records`, `/settings`).
- `app/login`, `app/auth/actions.ts` — 가입(필수 동의 3가지), 로그인, 로그아웃, 탈퇴.
- `app/goals/` — 코치와 대화(`new/`), 목록, 상세(`[id]/`, 달력 계획), 코치의 근거(`[id]/why/`), 수정(`[id]/edit/`).
- `app/today/` — 오늘 할 일, 연속 기록, 시작 전 확인, 인증, 다 해낸 순간의 축하(`components/Celebrate.tsx`).
- `app/records/` — 최근 일주일 기록(`components/RecordsView.tsx`). 하루 상태와 연속 기록 계산은 `lib/streak.ts`.
- `app/design/` — 개발할 때만 열리는 새 부품 미리보기. 배포에서는 404.
- `app/settings/` — 내 정보 목록과 잠글 앱 고르기(`locks/`, 고친 것이 있을 때만 위쪽 저장). `app/privacy/`, `app/terms/` — 처리방침, 약관.
- `app/goals/actions.ts` — 데이터 변경과 AI 호출은 여기(Server Actions)서만 한다.
- `lib/goals.ts` — 타입, 입력 규칙, 날짜 표시. 서버와 브라우저가 함께 쓴다.
- `lib/plan.ts` — AI 호출(대화, 사진 읽기, 계획, 인증 판정, 조정안). 서버 전용.
- `lib/supabase.ts` — 로그인한 사용자의 쿠키로 접속하는 Supabase 연결과 조회. 서버 전용.
- `lib/native.ts` — 안드로이드 앱이 열어 주는 기능(`window.DoerNative`).
- `android/` — 웹 화면을 감싸고 앱 잠금을 거는 안드로이드 앱(Java, Gradle).

## 데이터 (supabase/schema.sql)

`goals`(목표와 `plan` jsonb), `proofs`(인증 기록), `app_settings`(잠글 앱, 시작한 날), `adjustments`(조정 기록), `consents`(동의 기록), `ai_runs`(AI 사용 기록). 모든 테이블에 `user_id`가 있고 RLS로 자기 줄만 읽고 쓴다. 사진은 비공개 버킷 `goal-materials`의 `사용자 id/materials|proofs/` 아래에 둔다.

구조를 바꿀 때는 `supabase/schema.sql`, `lib/goals.ts`, README, 이 문서를 함께 고친다.

## 데이터 처리 규칙

- 최종 저장소는 Supabase뿐이다. 조회는 서버 컴포넌트, 변경은 Server Action에서 한다. 브라우저에서 Supabase나 AI를 직접 부르지 않는다.
- 입력 규칙은 `lib/goals.ts`에 두고 서버에서 반드시 다시 검사한다. 브라우저가 돌려보낸 값(대화 상태, 조정안)은 믿지 않고 서버에서 형태와 범위를 다시 맞춘다.
- 사용자 글과 사진은 AI에게 자료로만 준다. 그 안의 지시문을 따르지 않도록 시스템 지시에 적는다.
- 인증 사진 원본은 판정 7일 뒤 지운다. 목표를 지우거나 탈퇴하면 관련 사진을 함께 지운다.
- 이미지는 JPG, PNG, WEBP, 3MB 이하만 받는다.
- Server Action이 끝나면 `revalidatePath` 후 `redirect`한다. `redirect`는 try/catch 밖에서 부른다.
- 오류 메시지는 사용자가 이해할 수 있는 한국어 문장으로 쓰고, 원인 상세는 서버 로그에만 남긴다.
- AI 사용은 `ai_runs`로 세 겹으로 제한한다(`lib/plan.ts`의 `blockedBy`). 사용자별 하루 횟수, 최근 7일 한 사람의 금액(`AI_USER_BUDGET_USD`), 최근 7일 전체 금액(`AI_BUDGET_USD`, DB 함수 `ai_usage_since`). 금액은 토큰 수에 `AI_PRICE_IN`·`AI_PRICE_OUT`을 곱해 어림한다.

## 환경 변수

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`(중계 서비스를 쓸 때만). 값은 `.env.local`과 Vercel에만 두고 저장소에 올리지 않는다. service_role 키는 쓰지 않는다.

## 화면 규칙

- 디자인은 "따뜻한 고급스러움"이다. 아이보리 바탕(#FAF7F2) 위에 흰 카드, 갈색 기운의 옅은 그림자, 테라코타 코랄 하나, 세이지 초록, 글꼴은 Pretendard. 푸른 회색을 쓰지 않는다. 값은 `app/globals.css` 맨 아래 "따뜻한 고급스러움"과 `replica/design/tokens.json`이 기준이다.
- 코랄 채움은 화면당 한 곳, 평평하게(그라데이션·색 그림자 없이). 흰 글자를 올릴 때는 18.7px 이상 굵게.
- 그림은 `public/art`의 점토 오브제만 쓴다(`components/ui.tsx`의 `Art`). GPT(gpt-image-2)로 만들고 `design-preview/concepts/style.txt`의 스타일을 지킨다. 새로 만들면 `scripts/art-trim.mjs`로 여백을 자르고, 바꿀 때는 `ART_VERSION`과 파일 이름의 판 번호를 올린다.
- 새 화면은 `components/ui.tsx`의 부품(`Section`, `RowLink`, `Button`, `Notice`, `EmptyState`)과 `globals.css` 맨 아래 "새 화면 규칙"의 클래스(`.section`, `.rows`, `.row`, `.status`, `.facts`, `.bullets`)로 만든다. 카드 안에 카드를 넣지 않는다.
- 한 화면에는 지금 할 일에 필요한 것만 둔다. 설명 문단을 붙이지 않고, 길어지는 내용은 다른 화면이나 접힌 줄로 보낸다.
- 줄이지 않는 고지: 잠금을 바로 풀 수 없다는 것, 조정의 대가, 접근성 권한이 보는 범위, 인증 사진 보관 기간(7일), 가입 동의 3가지. 시작 전 확인 창과 동의 화면에 그대로 둔다.
- 목표 화면의 달력 아래에는 코치의 근거 요약 한 줄과 근거 화면(`/goals/[id]/why`)으로 가는 줄을 둔다.
- 색 값은 `replica/design/tokens.json`이 기준이고 WCAG AA를 넘는다. 바꿀 때는 `python replica-design의 contrast.py`로 확인하고 `globals.css` 맨 아래 "읽기 쉬운 색"을 함께 고친다.
- 참고 앱 조사와 적용 목록은 `replica/recon.md`, `replica/features.csv`. 남의 로고·아이콘·문구는 쓰지 않는다.
- 말투는 해요체, 군더더기 없이, 이모지 없이. 사용자를 탓하지 않는다.
- 화면을 고친 뒤에는 `node scripts/e2e.mjs`로 가입부터 탈퇴까지의 흐름을 점검한다(개발 서버가 3100번에서 떠 있어야 한다).
- 로딩, 오류, 빈 상태, 없는 주소를 각각 처리한다. 저장 중에는 입력칸과 버튼을 잠근다.
