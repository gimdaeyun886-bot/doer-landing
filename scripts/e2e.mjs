// 목표 CRUD를 실제 브라우저(Edge)로 처음부터 끝까지 눌러 보는 점검.
// 사용: node scripts/e2e.mjs [주소] [캡처 폴더]
//   로컬: node scripts/e2e.mjs                       (npm run dev 로 3000번에 띄운 뒤)
//   배포: node scripts/e2e.mjs https://배포주소
// 점검용 목표는 이름에 "점검 <번호>"를 붙여 만들고, 마지막에 모두 지운다. 개인정보는 넣지 않는다.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = process.argv[3] ?? "design-preview/e2e";
mkdirSync(OUT, { recursive: true });

const TAG = `점검 ${Date.now().toString(36).slice(-5)}`;
const results = [];
const check = (name, ok, note = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "ko-KR" });
page.setDefaultTimeout(15000);
const shot = (name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
const settle = async () => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
};
const body = () => page.locator("body").innerText();
const UUID_URL = /\/goals\/[0-9a-f]{8}-[0-9a-f-]{27}/;
const inDays = (days) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(Date.now() + days * 86_400_000));
const stepNow = async () => (await page.locator(".steps-count").innerText()).split("/")[0].trim();
const next = () => page.locator(".dock").getByRole("button", { name: "다음" }).click();

// 등록 단계를 차례로 채워 확인 장까지 간다.
async function toConfirm({ title, kind = "dated", deadline = inDays(30), preset, minutes = "60", schedule = "", note = "", apps = [], photo } = {}) {
  await page.goto(BASE + "/goals/new");
  await settle();
  await page.fill("#title", title);
  await next();
  await page.locator(`input[name="kind"][value="${kind}"]`).check({ force: true });
  if (kind === "dated") await page.fill("#deadline", deadline);
  await next();
  if (preset) await page.locator(".presets").getByRole("button", { name: preset }).click();
  await page.fill("#daily_minutes", minutes);
  if (schedule) await page.fill("#schedule", schedule);
  await next();
  if (note) await page.fill("#note", note);
  await next();
  for (const app of apps) await page.locator(`input[name="lock_apps"][value="${app}"]`).check({ force: true });
  await next();
  if (photo) await page.locator("#material").setInputFiles(photo);
  await next();
  await page.locator(".summary").waitFor();
}

async function create(values) {
  await toConfirm(values);
  await page.getByRole("button", { name: "목표 저장하기" }).click();
  await page.waitForURL(UUID_URL, { timeout: 30000 });
  await settle();
  return page.url().split("?")[0];
}

async function remove(url) {
  await page.goto(url);
  await settle();
  if (!(await page.getByRole("button", { name: "이 목표 지우기" }).count())) return false;
  await page.getByRole("button", { name: "이 목표 지우기" }).click();
  await page.locator("dialog[open]").waitFor();
  await page.getByRole("button", { name: "지우기", exact: true }).click();
  await page.waitForURL(/notice=deleted/, { timeout: 30000 });
  return true;
}

const created = [];
try {
  // 0. 첫 화면(미션 5 랜딩)에서 목표 화면으로
  console.log(`\n[0] 시작 — ${BASE}`);
  await page.goto(BASE + "/");
  await settle();
  check("첫 화면은 미션 5 랜딩이고 '써 보기'로 목표 화면에 갈 수 있음", (await page.locator('a[href="/goals"]').count()) > 0);
  await page.goto(BASE + "/goals");
  await settle();
  await shot("0-list");
  check("목록 화면이 열림", /내 목표|하나만 적어 볼까요/.test(await body()));

  // 1. 등록: 단계마다 검사, 잘못된 파일, 확인 장, 서버 검사
  console.log("\n[1] 등록");
  await page.goto(BASE + "/goals/new");
  await settle();
  await shot("1-step-title");
  await next();
  await page.locator("#title-error").waitFor();
  check("목표를 비우고 '다음'을 누르면 넘어가지 않고 오류 문구가 뜸", (await stepNow()) === "1" && /적어 주세요/.test(await page.locator("#title-error").innerText()));
  await page.getByRole("button", { name: "토익 850점" }).click();
  check("예시를 누르면 목표 칸에 들어감", (await page.inputValue("#title")) === "토익 850점");
  await page.fill("#title", `${TAG} 정보처리기사 실기`);
  await next();
  await next();
  await page.locator("#deadline-error").waitFor();
  await shot("1-step-kind-error");
  check("'정한 날까지'에서 날짜 없이 넘어가려 하면 막음", (await stepNow()) === "2" && /날짜/.test(await page.locator("#deadline-error").innerText()));
  await page.fill("#deadline", inDays(30));
  await next();
  await page.fill("#daily_minutes", "5");
  while (await page.locator('input[name="weekdays"]:checked').count()) await page.locator('input[name="weekdays"]:checked').first().click({ force: true });
  await next();
  await page.locator("#weekdays-error").waitFor();
  await shot("1-step-when-error");
  check("요일을 하나도 고르지 않거나 10분 미만이면 막음", (await stepNow()) === "3" && (await page.locator("#daily_minutes-error").count()) === 1);
  await page.locator(".presets").getByRole("button", { name: "평일" }).click();
  await page.locator(".quick").getByRole("button", { name: "1시간", exact: true }).click();
  check("요일·시간 빠른 선택이 칸에 반영됨", (await page.locator('input[name="weekdays"]:checked').count()) === 5 && (await page.inputValue("#daily_minutes")) === "60");
  check("고른 요일과 시간으로 한 주 분량을 바로 보여 줌", /한 주에 5번, 약 5시간/.test(await page.locator("#daily_minutes-hint").innerText()));
  await page.fill("#schedule", "퇴근하고 밤 9시 이후");
  await next();
  await page.fill("#note", "필기 합격, 실기 기출 1회독\nSQL이 약해요");
  await next();
  await page.locator('input[name="lock_apps"][value="인스타그램"]').check({ force: true });
  await page.locator('input[name="lock_apps"][value="유튜브"]').check({ force: true });
  await shot("1-step-lock");
  await next();
  await page.locator("#material").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  const typeError = await page.locator("#material-error").innerText().catch(() => "");
  await page.locator("#material").setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(3 * 1024 * 1024 + 10) });
  const sizeError = await page.locator("#material-error").innerText().catch(() => "");
  await shot("1-step-file-error");
  check("PDF는 고르는 순간 막음", /JPG, PNG, WEBP/.test(typeError), typeError);
  check("3MB가 넘는 사진은 고르는 순간 막음", /3MB/.test(sizeError), sizeError);
  await next();
  await page.locator(".summary").waitFor();
  await page.waitForTimeout(400);
  await shot("1-confirm", true);
  check("확인 장에 모은 답과 목표일까지의 분량이 보임", /번, 약/.test(await page.locator(".outlook-card").innerText()) && /퇴근하고 밤 9시 이후/.test(await page.locator(".answers").innerText()));
  check("'다음'을 눌러 확인 장에 와도 저장되지 않음 (저장은 따로 눌러야 함)", /\/goals\/new$/.test(page.url()));

  // 브라우저의 글자 수 제한을 지우고 보내도 서버가 다시 막고, 그 칸이 있는 단계로 돌려보낸다.
  await page.evaluate(() => {
    const input = document.querySelector("#title");
    input.removeAttribute("maxlength");
    input.value = "가".repeat(41);
  });
  await page.getByRole("button", { name: "목표 저장하기" }).click();
  await page.waitForFunction(() => /40자 이하/.test(document.querySelector("#title-error")?.textContent ?? ""), null, { timeout: 15000 });
  check("브라우저 검사를 건너뛰어도 서버가 막고 그 단계로 돌려보냄", /\/goals\/new$/.test(page.url()) && (await stepNow()) === "1");
  await page.fill("#title", `${TAG} 정보처리기사 실기`);
  for (let i = 0; i < 6; i++) await next();
  await page.locator(".summary").waitFor();
  check("서버 오류 뒤에도 다른 답은 그대로 남아 있음", /퇴근하고 밤 9시 이후/.test(await page.locator(".answers").innerText()) && /인스타그램, 유튜브/.test(await page.locator(".answers").innerText()));
  await page.getByRole("button", { name: "목표 저장하기" }).click();
  const pendingSeen = await page.locator(".dock .btn[disabled]").count().catch(() => 0);
  await page.waitForURL(UUID_URL, { timeout: 30000 });
  await settle();
  const firstUrl = page.url().split("?")[0];
  created.push(firstUrl);
  await shot("1-created", true);
  check("저장하는 동안 버튼이 잠김", pendingSeen > 0);
  check("저장하면 상세로 가고 '목표를 저장했어요'가 뜸", /notice=created/.test(page.url()) && /목표를 저장했어요/.test(await body()));
  check("상세에 D-30, 남은 기간 막대, 할 수 있는 날 달력이 보임", /D-30/.test(await page.locator(".hero").innerText()) && (await page.locator(".hero-progress").count()) === 1 && (await page.locator(".cal-cell[data-open]").count()) > 0);
  check("상세에 적은 값이 보임 (평일 하루 1시간, 시간대, 잠글 앱 2개, 지금 상황)", /평일 · 하루 1시간/.test(await body()) && /퇴근하고 밤 9시 이후/.test(await body()) && (await page.locator(".app-list li").count()) === 2 && /SQL이 약해요/.test(await body()));
  for (let i = 0; i < 3 && !(await page.locator(".cal-cell[data-goal]").count()); i++) await page.getByRole("button", { name: "다음 달" }).click();
  check("달력에서 목표일이 표시됨", (await page.locator(".cal-cell[data-goal]").count()) === 1);
  check("사진 없이 등록하면 '올린 사진이 없어요'가 보임", /올린 사진이 없어요/.test(await page.locator(".material-empty").innerText()));

  // 2. 조회: 새로고침, 목록, 검색, 필터, 정렬
  console.log("\n[2] 조회");
  await page.goto(firstUrl);
  await page.reload();
  await settle();
  check("새로고침해도 상세 데이터가 그대로임", (await page.locator(".hero h1").innerText()) === `${TAG} 정보처리기사 실기`);
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG)}`);
  await page.reload();
  await settle();
  await shot("2-search");
  check("목록에 새 목표가 보이고, 새로고침해도 그대로임", (await page.locator(".goal-card").count()) === 1 && /D-30/.test(await page.locator(".goal-card").innerText()));
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG)}&kind=ongoing`);
  await settle();
  check("종류 필터(매주 반복)를 고르면 날짜 있는 목표는 빠짐", /조건에 맞는 목표가 없어요/.test(await body()));
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG)}&kind=dated`);
  await settle();
  check("종류 필터(날짜 있음)를 고르면 다시 보임", (await page.locator(".goal-card").count()) === 1);

  // 3. 중복 제출: 확인 장에서 두 번 연달아 보내도 한 번만 저장된다.
  console.log("\n[3] 중복 제출");
  await toConfirm({ title: `${TAG} 중복 확인`, kind: "finish", minutes: "30" });
  await page.evaluate(() => {
    const form = document.querySelector("form.wizard");
    form.requestSubmit();
    form.requestSubmit();
  });
  await page.waitForURL(UUID_URL, { timeout: 30000 });
  await settle();
  created.push(page.url().split("?")[0]);
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG + " 중복")}`);
  await settle();
  check("두 번 연달아 제출해도 하나만 저장됨", (await page.locator(".goal-card").count()) === 1, `${await page.locator(".goal-card").count()}개`);

  // 4. 수정: 값 바꾸기, 사진 올리기, 사진 지우기
  console.log("\n[4] 수정");
  await page.goto(firstUrl);
  await settle();
  await page.getByRole("link", { name: "이 목표 고치기" }).click();
  await page.waitForURL(/\/edit$/);
  await settle();
  check("수정 화면에 기존 값이 채워져 있음", (await page.inputValue("#title")) === `${TAG} 정보처리기사 실기` && (await page.inputValue("#daily_minutes")) === "60" && (await page.locator('input[name="lock_apps"]:checked').count()) === 2);
  await page.fill("#title", `${TAG} 정보처리기사 실기 합격`);
  await page.locator('input[name="kind"][value="ongoing"]').check({ force: true });
  await page.locator(".presets").getByRole("button", { name: "주말" }).click();
  await page.fill("#daily_minutes", "90");
  await page.locator("#material").setInputFiles("public/assets/symbol-light.png");
  await page.locator(".photo img").waitFor({ timeout: 5000 });
  await shot("4-edit", true);
  check("사진을 고르면 저장 전에 미리보기가 보임", (await page.locator(".photo img").count()) === 1);
  await page.getByRole("button", { name: "고친 내용 저장하기" }).click();
  await page.waitForURL(/notice=updated/, { timeout: 30000 });
  await settle();
  await shot("4-updated", true);
  const image = page.locator(".material-view img");
  await image.waitFor({ timeout: 10000 });
  const loaded = await image.evaluate((img) => (img.complete ? img.naturalWidth : new Promise((resolve) => (img.onload = () => resolve(img.naturalWidth)))));
  const photoUrl = (await image.getAttribute("src")) ?? "";
  check("고친 제목·종류·요일이 상세에 반영됨", (await page.locator(".hero h1").innerText()) === `${TAG} 정보처리기사 실기 합격` && /매주/.test(await page.locator(".hero").innerText()) && /주말 · 하루 1시간 30분/.test(await body()));
  check("올린 사진이 Storage에 저장돼 상세에 보임", loaded > 0 && /mission-materials\/goals\//.test(photoUrl), photoUrl.split("?")[0].split("/").slice(-3).join("/"));
  check("고친 때가 기록됨", /고쳤어요/.test(await page.locator(".stamp").innerText()));
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG + " 정보처리기사")}`);
  await settle();
  check("고친 제목이 목록에 반영됨", /정보처리기사 실기 합격/.test(await page.locator(".goal-list").innerText()));

  await page.goto(firstUrl + "/edit");
  await settle();
  await page.getByRole("button", { name: "올린 사진 지우기" }).click();
  await page.getByRole("button", { name: "고친 내용 저장하기" }).click();
  await page.waitForURL(/notice=updated/, { timeout: 30000 });
  await settle();
  const removed = await page.request.get(photoUrl.split("?")[0]);
  check("사진을 지우면 상세에서 빠지고 Storage에서도 지워짐", (await page.locator(".material-empty").count()) === 1 && removed.status() >= 400, `파일 응답 ${removed.status()}`);

  // 5. 페이지 나누기와 정렬
  console.log("\n[5] 페이지 나누기와 정렬");
  created.push(await create({ title: `${TAG} 목록 1`, kind: "dated", deadline: inDays(10), minutes: "20" }));
  for (let i = 2; i <= 4; i++) created.push(await create({ title: `${TAG} 목록 ${i}`, kind: "finish", minutes: "20" }));
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG)}`);
  await settle();
  await shot("5-page-1", true);
  check("6개면 첫 페이지에 5개와 페이지 이동이 보임", (await page.locator(".goal-card").count()) === 5 && /1 \/ 2/.test(await page.locator(".pagination").innerText()));
  await page.getByRole("link", { name: "다음 페이지" }).click();
  await page.waitForURL(/page=2/);
  await settle();
  check("다음 페이지에 나머지 1개가 보이고 검색어가 유지됨", (await page.locator(".goal-card").count()) === 1 && page.url().includes("q="));
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG)}&page=99`);
  await settle();
  check("없는 페이지 번호는 마지막 페이지로 보냄", /page=2/.test(page.url()));
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG)}`);
  await settle();
  await page.getByRole("link", { name: "목표일 가까운 순" }).click();
  await page.waitForURL(/sort=deadline/);
  await settle();
  await shot("5-sort-deadline", true);
  check("'목표일 가까운 순'을 고르면 D-10 목표가 맨 위에 옴", /목록 1/.test(await page.locator(".goal-card").first().innerText()) && /D-10/.test(await page.locator(".goal-card").first().innerText()));

  // 6. 없는 주소
  console.log("\n[6] 없는 주소");
  await page.goto(BASE + "/goals/abc");
  await settle();
  await shot("6-not-found");
  check("형식이 틀린 상세 주소는 '목표를 찾을 수 없어요'", /목표를 찾을 수 없어요/.test(await body()));
  await page.goto(BASE + "/goals/00000000-0000-4000-8000-000000000000");
  await settle();
  check("없는 id의 상세 주소도 '목표를 찾을 수 없어요'", /목표를 찾을 수 없어요/.test(await body()));
  await page.goto(BASE + "/goals/00000000-0000-4000-8000-000000000000/edit");
  await settle();
  check("없는 목표의 수정 주소도 '목표를 찾을 수 없어요'", /목표를 찾을 수 없어요/.test(await body()));
  await page.goto(BASE + "/no-such-page");
  await settle();
  check("없는 페이지는 '페이지를 찾을 수 없어요'", /페이지를 찾을 수 없어요/.test(await body()));

  // 7. 삭제: 확인 창, 취소, 지우기
  console.log("\n[7] 삭제");
  await page.goto(firstUrl);
  await settle();
  await page.getByRole("button", { name: "이 목표 지우기" }).click();
  await page.locator("dialog[open]").waitFor();
  await page.waitForTimeout(400);
  await shot("7-delete-sheet");
  await page.getByRole("button", { name: "그대로 두기" }).click();
  await page.reload();
  await settle();
  check("확인 창에서 '그대로 두기'를 누르면 지워지지 않음", /정보처리기사 실기 합격/.test(await body()));
  await page.getByRole("button", { name: "이 목표 지우기" }).click();
  await page.locator("dialog[open]").waitFor();
  await page.getByRole("button", { name: "지우기", exact: true }).click();
  await page.waitForURL(/notice=deleted/, { timeout: 30000 });
  await settle();
  await shot("7-deleted");
  created.splice(created.indexOf(firstUrl), 1);
  check("지우면 목록으로 가고 '목표를 지웠어요'가 뜸", /목표를 지웠어요/.test(await body()));
  await page.goto(firstUrl);
  await settle();
  check("지운 목표의 주소는 '목표를 찾을 수 없어요'", /목표를 찾을 수 없어요/.test(await body()));
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG + " 정보처리기사")}`);
  await settle();
  check("지운 목표는 목록에서 사라짐", /조건에 맞는 목표가 없어요/.test(await body()));
} catch (error) {
  check("점검 도중 멈춤", false, error.message.split("\n")[0]);
  await shot("error", true).catch(() => {});
} finally {
  // 점검용 목표를 모두 지운다.
  for (const url of created) await remove(url).catch((error) => console.log("  정리 실패:", url, error.message.split("\n")[0]));
  await page.goto(`${BASE}/goals?q=${encodeURIComponent(TAG)}`).catch(() => {});
  await settle().catch(() => {});
  const left = await page.locator(".goal-card").count().catch(() => -1);
  check("점검용 목표를 모두 지움", left === 0, `${left}개 남음`);
  await browser.close();
}

const passed = results.filter((item) => item.ok).length;
console.log(`\n${passed}/${results.length} 통과`);
process.exit(passed === results.length ? 0 : 1);
