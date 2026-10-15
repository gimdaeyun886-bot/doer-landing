# Do-er — 목표 관리 (미션 6)

- **배포 URL:** https://doer-mission6.vercel.app
- **GitHub:** https://github.com/gimdaeyun886-bot/doer-landing/tree/mission-6 (`mission-6` 브랜치. `main`은 미션 5)
- **처음 볼 곳:** 배포 URL의 `/goals`. 첫 화면 `/`는 미션 5의 소개 페이지이고 위쪽 메뉴의 "써 보기"로도 들어갈 수 있습니다.

로그인 없이 바로 등록, 목록, 상세, 수정, 삭제를 해 볼 수 있습니다. 모든 데이터는 Supabase에 저장됩니다.

## 서비스 소개

Do-er는 해야 할 일을 정해 두고도 시작하기 직전에 폰을 집어 드는 사람을 위한 실행 코치입니다. 미션 5에서는 이 문제를 소개하는 랜딩 페이지를 만들었습니다.

미션 6에서는 서비스의 출발점인 **목표**를 다룹니다. 사용자는 해내고 싶은 일, 끝나는 날, 할 수 있는 요일과 하루 시간, 실행할 때 잠글 앱, 참고할 자료 사진을 남깁니다. 앱은 이 값으로 목표일까지 몇 번, 몇 시간을 쓸 수 있는지 계산해 달력에 보여 줍니다. 다음 미션들에서는 이 목표를 바탕으로 코치가 날짜별 계획을 짭니다. 실행하는 동안에는 고른 앱을 잠급니다.

목표는 시험에 한정하지 않고 세 가지 종류를 받습니다.

| 종류 | 예 | 계산 방식 |
|---|---|---|
| 정한 날까지 (`dated`) | 자격시험, 공모전 마감 | 오늘부터 목표일까지 할 수 있는 날 수 × 하루 시간 |
| 날짜 없이 완성 (`finish`) | 책 한 권, 포트폴리오 | 한 주에 할 수 있는 날 수 × 하루 시간 |
| 매주 반복 (`ongoing`) | 운동, 영어 회화 | 한 주에 할 수 있는 날 수 × 하루 시간 |

## 핵심 기능 명세

사용자 흐름: **등록 → 목록 → 상세 → 수정 → 삭제**

| 화면 | 주소 | 입력 | 사용자 행동 | 성공하면 | 실패하면 |
|---|---|---|---|---|---|
| 목록 | `/goals` | 검색어, 종류, 정렬 | 목표를 찾아 고름 | 카드 5개씩. 왼쪽에 D-day 같은 표시, 날짜 있는 목표는 지나간 기간 막대 | 저장소 오류 화면과 "다시 시도" |
| 등록 | `/goals/new` | 7단계: 목표 → 끝나는 날 → 요일·하루 시간·시간대 → 지금 상황 → 잠글 앱 → 자료 사진 → 확인 장 | 단계마다 "다음", 마지막에 "목표 저장하기" | 상세로 이동하고 "목표를 저장했어요" 표시 | 그 단계에서 넘어가지 않고 칸 아래에 오류 문구. 서버가 막으면 그 칸이 있는 단계로 돌아감 |
| 상세 | `/goals/[id]` | 없음 | 내용 확인, 고치기, 지우기 | D-day, 지나간 기간 막대, 할 수 있는 날과 목표일을 표시한 달력, 쓸 수 있는 시간, 잠글 앱, 지금 상황, 자료 사진, 만든 때·고친 때 | 없는 id나 형식이 틀린 주소면 "목표를 찾을 수 없어요" |
| 수정 | `/goals/[id]/edit` | 등록과 같은 칸을 한 화면에. 사진 바꾸기·지우기 | "고친 내용 저장하기" | 상세로 이동하고 "고친 내용을 저장했어요" 표시 | 첫 오류 칸으로 이동. 이미 지워진 목표면 안내 |
| 삭제 | 상세 위쪽 휴지통 | 없음 | 확인 창에서 "지우기" | 목록으로 이동하고 "목표를 지웠어요" 표시. 사진도 함께 지움 | 확인 창 안에 오류 문구 |

입력 규칙은 `lib/goals.ts` 한 곳에 있습니다. 브라우저와 서버가 같은 규칙으로 검사하고 DB에도 같은 범위의 제약을 걸었습니다.

| 칸 | 규칙 |
|---|---|
| 목표 | 필수, 40자 이하 |
| 목표 날짜 | "정한 날까지"일 때 필수, 오늘부터 2년 이내 |
| 할 수 있는 요일 | 필수, 하루 이상 |
| 하루에 낼 시간 | 필수, 10분에서 600분 사이의 정수 |
| 시간대 메모 / 지금 상황 | 선택, 120자 / 300자 이하 |
| 잠글 앱 | 선택. 인스타그램, 유튜브, 틱톡, 페이스북, X, 네이버 웹툰, 넷플릭스 가운데 고름. 전화·메신저·검색은 목록에 없음 |
| 자료 사진 | 선택. JPG, PNG, WEBP, 3MB 이하. 고르는 순간, 서버, Storage 버킷 설정에서 세 번 막음 |

그 밖의 처리

- **중복 제출 방지:** 저장하는 동안 입력칸과 버튼을 잠그고 "저장하는 중…"을 보여 줍니다. 등록 화면은 열릴 때마다 요청 번호(`request_id`)를 받고 DB의 unique 제약 때문에 같은 번호로는 한 번만 저장됩니다.
- **로딩, 오류, 빈 상태:** 불러오는 동안에는 자리표시(skeleton)를 보여 줍니다. 저장소 오류가 나면 "불러오지 못했어요"와 다시 시도 버튼을 띄웁니다. 목표가 하나도 없을 때와 검색 결과가 없을 때는 각각 다른 안내를 보여 줍니다.
- **없는 주소:** 형식이 틀린 id(`/goals/abc`), 없는 id, 지운 목표의 주소, 없는 페이지는 모두 안내 화면으로 이어집니다. 범위를 넘는 페이지 번호는 마지막 페이지로 보냅니다.
- **검색, 필터, 정렬(심화):** 검색어 `q`, 종류 `kind`, 정렬 `sort`(최근 등록 순 / 목표일 가까운 순), 페이지 `page`를 주소에 남깁니다. 새로고침하거나 주소를 공유해도 같은 목록이 보입니다.
- **업로드(심화):** 저장하기 전에 미리보기를 보여 주고 수정 화면에서 사진을 바꾸거나 지울 수 있습니다. 바꾸거나 지운 예전 파일은 Storage에서도 지웁니다.
- **상세 메타데이터(심화):** 목표마다 이름과 요약을 페이지 제목, 설명, 공유 미리보기에 씁니다.

## 테이블 구조

`supabase/schema.sql` 한 파일에 테이블, 제약, 인덱스, RLS 정책, Storage 버킷이 모두 들어 있습니다.

### `mission_goals`

| 컬럼 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | uuid | 필수 (기본값 `gen_random_uuid()`) | 고유 식별자 |
| `request_id` | uuid | 필수, unique | 등록 화면이 준 요청 번호. 중복 저장 방지 |
| `title` | text | 필수 | 1~40자 |
| `kind` | text | 필수 | `dated`, `finish`, `ongoing` 가운데 하나 |
| `deadline` | date | `kind = dated`일 때만 | 목표 날짜. `kind`와 맞는지 check 제약으로 확인 |
| `weekdays` | smallint[] | 필수 (기본값 월~금) | 할 수 있는 요일. 0(일)~6(토), 1~7개 |
| `daily_minutes` | integer | 필수 | 10~600 |
| `schedule` | text | 선택 | 시간대 메모, 120자 이하 |
| `note` | text | 선택 | 지금 상황, 300자 이하 |
| `lock_apps` | text[] | 필수 (기본값 빈 배열) | 실행할 때 잠글 앱, 7개 이하 |
| `material_path` | text | 선택 | Storage 버킷 안의 사진 경로 |
| `created_at` | timestamptz | 필수 (기본값 `now()`) | 만든 때 |
| `updated_at` | timestamptz | 필수 (기본값 `now()`) | 고친 때. 수정할 때 트리거가 갱신 |

### Storage 버킷 `mission-materials`

공개 버킷입니다. 파일은 `goals/<무작위 id>.<확장자>`에 저장되고 버킷 설정에서 3MB 이하의 JPG·PNG·WEBP만 받습니다.

### 권한

이번 미션에는 로그인이 없어서 이메일, 이름, 연락처 같은 개인정보를 받지 않습니다. RLS는 켜 두되, 미션 6 동안은 누구나 읽고 쓸 수 있는 정책을 둡니다. 미션 7에서 `user_id` 컬럼을 더하고 이 정책들을 자기 줄만 다룰 수 있는 정책으로 바꿉니다.

## 기술 스택

- Next.js 16 (App Router, Server Actions), React 19, TypeScript
- Supabase (Postgres, Storage), `@supabase/supabase-js`
- Vercel (서울 리전 `icn1`), GitHub 저장소와 연결해 배포
- 점검: Playwright로 실제 브라우저(Edge)를 띄워 화면을 눌러 보는 자동 점검 `scripts/e2e.mjs`

## 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에 아래 환경 변수 값을 채운 뒤 `npm run dev`를 실행하면 http://localhost:3000 에서 열립니다. 처음 한 번은 Supabase 대시보드의 SQL Editor에서 `supabase/schema.sql`을 실행해야 합니다.

자동 점검은 개발 서버를 띄운 상태에서 돌립니다. 주소를 주면 배포 환경도 같은 방식으로 점검합니다.

```bash
node scripts/e2e.mjs
node scripts/e2e.mjs https://배포주소
```

점검용 목표는 이름 앞에 "점검 <번호>"를 붙여 만들고 끝나면 모두 지웁니다. Edge가 설치되어 있어야 합니다.

## 환경 변수

| 이름 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 공개 키 (publishable / anon) |

값은 `.env.local`과 Vercel 프로젝트 설정에만 두고 저장소에는 올리지 않습니다(`.gitignore`의 `.env*`). service_role 키는 쓰지 않습니다.

## 폴더 구조

```
app/
  goals/page.tsx              목록 (검색, 종류 필터, 정렬, 페이지)
  goals/new/page.tsx          등록 (단계별)
  goals/[id]/page.tsx         상세
  goals/[id]/edit/page.tsx    수정
  goals/actions.ts            등록·수정·삭제 Server Actions
  goals/loading.tsx, error.tsx, [id]/not-found.tsx, not-found.tsx
components/
  GoalWizard.tsx              등록 단계와 확인 장
  GoalEditForm.tsx            수정 폼
  fields.tsx                  등록과 수정이 함께 쓰는 입력칸
  GoalCard.tsx, MonthCalendar.tsx, AppTile.tsx, DeleteGoalButton.tsx, Pagination.tsx, ui.tsx
lib/goals.ts                  타입, 입력 규칙, 날짜 계산, 표시 형식
lib/supabase.ts               Supabase 연결과 조회 (서버 전용)
supabase/schema.sql           테이블, 정책, 버킷
public/                       미션 5 랜딩 (첫 화면)
scripts/e2e.mjs               자동 점검
docs/QA.md                    QA 체크리스트와 결과
```

## QA 결과

로컬과 배포 환경에서 자동 점검 45개 항목을 모두 통과했습니다. 시나리오별 결과는 [docs/QA.md](docs/QA.md)에 있습니다.
