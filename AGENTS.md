# Do-er 프로젝트 컨텍스트

AI 코딩 도구와 사람이 함께 보는 작업 규칙입니다. 기능 명세와 실행 방법은 README.md에 있습니다.

## 구조

- `public/` — 미션 5의 정적 랜딩. `next.config.ts`의 rewrite로 `/`에서 `public/index.html`을 보여 준다. Next.js 화면에서 `/`로 갈 때는 `<Link>`가 아니라 `<a>`를 쓴다.
- `app/tasks/` — 할 일 CRUD 화면 (App Router). 목록 `page.tsx`, 등록 `new/`, 상세 `[id]/`, 수정 `[id]/edit/`.
- `app/tasks/actions.ts` — 등록·수정·삭제 Server Actions. 데이터 변경은 여기서만 한다.
- `lib/tasks.ts` — 타입, 입력 규칙, 날짜·시간 표시. 서버와 브라우저가 함께 쓴다.
- `lib/supabase.ts` — Supabase 연결과 조회. 서버에서만 불러 쓴다.
- `components/` — 재사용 UI. 새 화면을 만들 때 먼저 여기 있는 것을 쓴다.

## 테이블: public.tasks

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| id | uuid | 기본 키, 자동 생성 |
| title | text | 필수, 1~60자 |
| goal | text | 필수, 1~30자 |
| due_date | date | 필수 |
| estimated_minutes | integer | 필수, 5~600 |
| memo | text | 선택, 300자 이하 |
| proof_path | text | 선택. Storage 버킷 `task-proofs` 안의 경로 |
| created_at | timestamptz | 자동 |
| updated_at | timestamptz | 수정 시 트리거로 자동 갱신 |

구조를 바꿀 때는 `supabase/schema.sql`, `lib/tasks.ts`, README의 표, 이 표를 함께 고친다.

## 데이터 처리 규칙

- 최종 저장소는 Supabase뿐이다. Mock 데이터나 로컬 스토리지에 핵심 데이터를 두지 않는다.
- 조회는 서버 컴포넌트에서, 변경은 Server Action에서 한다. 브라우저에서 Supabase를 직접 호출하지 않는다.
- 입력 규칙은 `lib/tasks.ts`의 `validateValues`와 `proofError` 한 곳에 둔다. 서버에서 반드시 다시 검사한다.
- 인증 상태는 따로 저장하지 않는다. `proof_path`가 있으면 인증 완료다.
- 이미지를 바꾸거나 할 일을 삭제하면 Storage의 이전 파일도 지운다. 저장에 실패하면 방금 올린 파일을 지운다.
- 인증 이미지는 JPG, PNG, WEBP, 3MB 이하만 받는다. (Server Action 본문 한도 4MB, Vercel 한도 4.5MB)
- Server Action이 끝나면 `revalidatePath("/tasks")` 후 `redirect`한다. `redirect`는 try/catch 밖에서 부른다.
- 오류 메시지는 사용자가 이해할 수 있는 한국어 문장으로 쓰고, 원인 상세는 서버 로그에만 남긴다.
- 이번 미션에는 로그인과 RLS가 없다. 개인정보를 받는 입력칸을 만들지 않는다. (미션 7에서 적용)

## 환경 변수

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. 값은 `.env.local`과 Vercel에만 두고 저장소에 올리지 않는다. service_role 키는 쓰지 않는다.

## 화면 규칙

- 색과 글꼴은 `app/globals.css`의 변수(크림 배경, 코랄, 바이올렛, Gothic A1)를 쓴다.
- 로딩(`loading.tsx`), 오류(`error.tsx`), 빈 상태(`EmptyState`), 없는 주소(`not-found.tsx`)를 각각 처리한다.
- 저장 중에는 입력칸과 버튼을 잠근다.
