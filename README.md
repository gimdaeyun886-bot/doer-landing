# Do-er — 목표 관리 (미션 6)

**배포 URL:** 배포 후 적음
**처음 볼 곳:** 배포 URL의 `/goals` (첫 화면 `/`는 미션 5의 소개 페이지이고, 위쪽 메뉴의 "써 보기"로도 들어갈 수 있어요)

로그인 없이 바로 등록, 목록, 상세, 수정, 삭제를 해 볼 수 있어요. 모든 데이터는 Supabase에 저장됩니다.

## 서비스 소개

Do-er는 해야 할 일을 정해 놓고도 시작 직전에 폰을 집어 드는 사람을 위한 실행 코치입니다. 미션 5에서 이 문제를 소개하는 랜딩 페이지를 만들었습니다.

미션 6에서는 서비스의 출발점인 **목표**를 다룹니다. 사용자는 해내고 싶은 일, 기한, 하루에 낼 시간, 실행할 때 잠글 앱, 참고할 자료 사진을 적어 둡니다. 이후 미션에서 이 목표를 바탕으로 코치가 날짜별 계획을 짜고, 실행하는 동안 고른 앱을 잠그게 됩니다.

목표는 시험에 한정하지 않습니다. 세 가지 종류를 받습니다.

| 종류 | 예 | 저장하는 값 |
|---|---|---|
| 정한 날까지 (`dated`) | 자격시험, 공모전 마감 | 목표 날짜가 꼭 있음 |
| 날짜 없이 완성 (`finish`) | 책 한 권, 포트폴리오 | 날짜 없음 |
| 매주 반복 (`ongoing`) | 운동, 영어 회화 | 날짜 없음 |

## 핵심 기능 명세

사용자 흐름: **등록 → 목록 → 상세 → 수정 → 삭제**

| 화면 | 주소 | 입력 | 사용자 행동 | 성공하면 | 실패하면 |
|---|---|---|---|---|---|
| 목록 | `/goals` | 검색어, 종류 | 목표를 찾고 고름 | 최근 것부터 5개씩, 종류 표시(D-day 등)와 함께 보임 | 저장소 오류 화면과 "다시 시도" |
| 등록 | `/goals/new` | 목표(필수), 기한 종류(필수), 날짜(정한 날까지일 때 필수), 하루 시간(필수), 언제, 지금 상황, 잠글 앱, 자료 사진 | "목표 저장하기" | 상세로 가고 "목표를 저장했어요" | 칸마다 오류 문구, 적은 값은 그대로, 첫 오류 칸으로 이동 |
| 상세 | `/goals/[id]` | — | 내용 확인, 고치기, 지우기 | 한눈에(기한, 쓸 수 있는 시간, 언제), 지금 상황, 잠글 앱, 자료 사진, 만든 때와 고친 때 | 없는 id나 틀린 형식이면 "목표를 찾을 수 없어요" |
| 수정 | `/goals/[id]/edit` | 등록과 같음. 사진 바꾸기·지우기 | "고친 내용 저장하기" | 상세로 가고 "고친 내용을 저장했어요" | 등록과 같음. 이미 지워진 목표면 안내 |
| 삭제 | 상세의 휴지통 | — | 확인 창에서 "지우기" | 목록으로 가고 "목표를 지웠어요", 사진도 함께 지움 | 확인 창 안에 오류 문구 |

입력 규칙 (`lib/goals.ts`, 브라우저와 서버가 같은 규칙을 쓰고 DB에도 같은 제약을 둠)

| 칸 | 규칙 |
|---|---|
| 목표 | 필수, 40자 이하 |
| 날짜 | "정한 날까지"일 때 필수. 오늘부터 2년 이내 |
| 하루에 낼 시간 | 필수, 10분에서 600분 사이의 정수 |
| 언제 할 수 있는지 / 지금 상황 | 선택, 120자 / 300자 이하 |
| 잠글 앱 | 선택. 인스타그램, 유튜브, 틱톡, 페이스북, X, 네이버 웹툰, 넷플릭스 중에서 고름. 전화·메신저·검색은 목록에 없음 |
| 자료 사진 | 선택. JPG, PNG, WEBP, 3MB 이하. 고르는 순간, 서버, Storage 버킷에서 세 번 막음 |

그 밖의 처리

- **중복 제출 방지:** 저장하는 동안 입력칸과 버튼을 잠그고 "저장하는 중…"을 보여 줍니다. 등록 화면은 열릴 때마다 요청 번호(`request_id`)를 받고, 같은 번호로는 DB에 한 번만 저장됩니다.
- **로딩, 오류, 빈 상태:** 불러오는 동안 자리표시(skeleton), 저장소 오류 시 "불러오지 못했어요"와 다시 시도, 목표가 없을 때와 검색 결과가 없을 때 각각 다른 안내를 보여 줍니다.
- **없는 주소:** 형식이 틀린 id(`/goals/abc`), 없는 id, 지운 목표의 주소, 없는 페이지 모두 안내 화면을 보여 줍니다. 범위를 넘는 페이지 번호는 마지막 페이지로 보냅니다.
- **검색과 필터(심화):** 검색어 `q`, 종류 `kind`, 페이지 `page`를 주소에 남겨서 새로고침하거나 주소를 공유해도 같은 목록이 보입니다.
- **업로드(심화):** 저장 전에 미리보기를 보여 주고, 수정에서 사진을 바꾸거나 지울 수 있습니다. 바꾸거나 지운 예전 파일은 Storage에서도 지웁니다.
- **상세 메타데이터(심화):** 상세 화면마다 목표 이름과 요약을 페이지 제목과 설명으로 씁니다.

## 테이블 구조

`supabase/schema.sql` 한 파일에 테이블, 제약, 인덱스, RLS 정책, Storage 버킷이 모두 있습니다.

### `mission_goals`

| 컬럼 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | uuid | 필수 (기본값 `gen_random_uuid()`) | 고유 식별자 |
| `request_id` | uuid | 필수, unique | 등록 화면이 준 요청 번호. 중복 저장 방지 |
| `title` | text | 필수 | 1~40자 |
| `kind` | text | 필수 | `dated`, `finish`, `ongoing` 중 하나 |
| `deadline` | date | `kind = dated`일 때만 | 목표 날짜 (`kind`와 맞는지 check 제약) |
| `daily_minutes` | integer | 필수 | 10~600 |
| `schedule` | text | 선택 | 언제 할 수 있는지, 120자 이하 |
| `note` | text | 선택 | 지금 상황, 300자 이하 |
| `lock_apps` | text[] | 필수 (기본값 빈 배열) | 실행할 때 잠글 앱, 7개 이하 |
| `material_path` | text | 선택 | Storage 버킷 안의 사진 경로 |
| `created_at` | timestamptz | 필수 (기본값 `now()`) | 만든 때 |
| `updated_at` | timestamptz | 필수 (기본값 `now()`) | 고친 때. 수정할 때 트리거가 갱신 |

### Storage 버킷 `mission-materials`

공개 버킷. 파일은 `goals/<무작위 id>.<확장자>`에 둡니다. 버킷 설정으로 3MB, JPG·PNG·WEBP만 받습니다.

### 권한

이번 미션에는 로그인이 없으므로 개인정보(이메일, 이름, 연락처)를 받지 않습니다. RLS는 켜 두고, 미션 6 동안만 누구나 읽고 쓸 수 있는 정책을 둡니다. 사용자별 접근 제한(`user_id` 컬럼과 자기 줄만 다루는 정책)은 미션 7에서 이 정책들을 바꿔 적용합니다.

## 기술 스택

- Next.js 16 (App Router, Server Actions), React 19, TypeScript
- Supabase (Postgres, Storage), `@supabase/supabase-js`
- Vercel (서울 리전 `icn1`), GitHub 저장소와 연결해 배포
- 점검: Playwright로 실제 브라우저(Edge)를 띄워 화면을 누르는 자동 점검 `scripts/e2e.mjs`

## 실행 방법

```bash
npm install
cp .env.example .env.local      # 값 채우기 (아래 환경 변수)
npm run dev                     # http://localhost:3000
```

처음 한 번, Supabase 대시보드의 SQL Editor에서 `supabase/schema.sql`을 실행합니다.

점검: 개발 서버를 띄운 상태에서

```bash
node scripts/e2e.mjs                          # 로컬 (http://localhost:3000)
node scripts/e2e.mjs https://배포주소          # 배포 환경
```

점검용 목표는 이름에 "점검 <번호>"를 붙여 만들고, 끝나면 모두 지웁니다. Edge가 설치되어 있어야 합니다.

## 환경 변수

| 이름 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 공개 키 (publishable / anon) |

값은 `.env.local`과 Vercel 프로젝트 설정에만 두고 저장소에 올리지 않습니다(`.gitignore`에 `.env*`). service_role 키는 쓰지 않습니다.

## 폴더 구조

```
app/
  goals/page.tsx              목록 (검색, 종류 필터, 페이지)
  goals/new/page.tsx          등록
  goals/[id]/page.tsx         상세
  goals/[id]/edit/page.tsx    수정
  goals/actions.ts            등록·수정·삭제 Server Actions
  goals/loading.tsx, error.tsx, [id]/not-found.tsx, not-found.tsx
components/                   GoalForm, GoalRow, DeleteGoalButton, Pagination, ui
lib/goals.ts                  타입, 입력 규칙, 표시 형식
lib/supabase.ts               Supabase 연결과 조회 (서버 전용)
supabase/schema.sql           테이블, 정책, 버킷
public/                       미션 5 랜딩 (첫 화면)
scripts/e2e.mjs               자동 점검
docs/QA.md                    QA 체크리스트와 결과
```

## QA 결과

자세한 시나리오와 결과는 [docs/QA.md](docs/QA.md)에 있습니다.
