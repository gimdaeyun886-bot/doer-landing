# Do-er 미션 6 작업 규칙

AI 코딩 도구와 사람이 함께 보는 규칙입니다. 기능 명세와 실행 방법은 README.md에 있습니다.

## 범위

- 미션 5에서 정한 문제(시작 직전에 폰을 집어 드는 사람)를 바탕으로, 핵심 데이터인 **목표**의 CRUD를 만든다.
- 이번 미션에는 로그인과 사용자별 권한이 없다. 개인정보(이메일, 이름, 연락처)는 받지 않는다.
- 사용자별 접근 제한(user_id + RLS 정책)은 미션 7에서 붙인다. 그때 `supabase/schema.sql`의 "mission6" 정책을 바꾼다.
- 목표는 시험에 한정하지 않는다. 종류는 날짜 있음(dated), 날짜 없이 완성(finish), 매주 반복(ongoing) 세 가지다.
- 잠글 앱 목록에 전화, 메신저, 검색은 넣지 않는다. '국내 최초', '우회 불가' 같은 표현을 쓰지 않는다.

## 구조

- `/`는 `next.config.ts`에서 `/goals`로 보낸다. 미션 5 랜딩과는 별개의 앱이다.
- `app/goals/page.tsx` — 목록(검색 `q`, 종류 `kind`, 페이지 `page`를 주소에 둔다).
- `app/goals/new/page.tsx` — 등록. `app/goals/[id]/page.tsx` — 상세. `app/goals/[id]/edit/page.tsx` — 수정.
- `app/goals/actions.ts` — 등록, 수정, 삭제(Server Actions). 데이터를 바꾸는 일은 여기서만 한다.
- `app/goals/loading.tsx`, `error.tsx`, `[id]/not-found.tsx`, `app/not-found.tsx` — 로딩, 오류, 없는 주소.
- `components/` — `GoalForm`(등록·수정 공용 폼), `GoalRow`(목록 한 줄), `DeleteGoalButton`(확인 창), `Pagination`, `ui.tsx`(버튼, 알림, 빈 상태, 구획).
- `lib/goals.ts` — 타입, 입력 규칙, 표시 형식. 서버와 브라우저가 함께 쓴다.
- `lib/supabase.ts` — Supabase 연결과 조회. 서버 전용.

## 데이터 (supabase/schema.sql)

`mission_goals` 한 테이블과 공개 버킷 `mission-materials`. 사진은 `goals/<무작위 id>.<확장자>`에 둔다.

구조를 바꿀 때는 `supabase/schema.sql`, `lib/goals.ts`, README, 이 문서를 함께 고친다.

## 데이터 처리 규칙

- 최종 저장소는 Supabase뿐이다. 조회는 서버 컴포넌트, 변경은 Server Action에서 한다. 브라우저에서 Supabase를 직접 부르지 않는다.
- 입력 규칙은 `lib/goals.ts`에 두고, 브라우저에서 먼저 보여 준 뒤 서버에서 반드시 다시 검사한다. DB에도 같은 범위의 check 제약을 둔다.
- 등록 화면은 열릴 때 요청 번호(`request_id`)를 받는다. 같은 번호로는 한 번만 저장한다(unique 제약).
- 이미지는 JPG, PNG, WEBP, 3MB 이하만 받는다. 브라우저, 서버, 버킷 설정 세 곳에서 막는다.
- 사진을 바꾸거나 빼면 저장이 끝난 뒤 예전 파일을 지운다. 목표를 지우면 사진도 지운다.
- Server Action이 끝나면 `revalidatePath` 후 `redirect`한다. `redirect`는 try/catch 밖에서 부른다.
- 오류 메시지는 사용자가 이해할 수 있는 한국어 문장으로 쓰고, 원인 상세는 서버 로그에만 남긴다.

## 환경 변수

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. 값은 `.env.local`과 Vercel에만 두고 저장소에 올리지 않는다. service_role 키는 쓰지 않는다.

## 화면 규칙

- 색과 글꼴은 `app/globals.css`의 변수를 쓴다. 흰 바탕에 회색 단계, 강조는 코랄 하나. 초록은 저장됨, 빨강은 문제.
- 말투는 해요체, 군더더기 없이, 이모지 없이. 사용자를 탓하지 않는다.
- 저장 중에는 입력칸과 버튼을 잠근다. 로딩, 오류, 빈 상태, 없는 주소를 각각 처리한다.
- 화면을 고친 뒤에는 `node scripts/e2e.mjs`로 등록부터 삭제까지 점검한다(`npm run dev`로 개발 서버를 띄운 뒤. 다른 주소는 첫 인자로 준다).
