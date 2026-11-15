// 실제 AI·DB로 처음부터 끝까지 돌려 보는 점검. 사용: node scripts/e2e.mjs [주소] [저장 폴더]
// 로그인 → 코치 대화 → 날짜별 계획 → 시작 전 확인 → 맞춤 인증 → 조정 → 수정 → 삭제 → 탈퇴 순서로 확인한다.
// 점검용 계정은 .env.local 의 E2E_EMAIL, E2E_PASSWORD 를 쓴다. 마지막에 탈퇴해 점검 데이터를 지운다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

for (const line of readFileSync(".env.local", "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
  const at = line.indexOf("=");
  if (at > 0) process.env[line.slice(0, at).trim()] = line.slice(at + 1).trim();
}
const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "design-preview/e2e";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
page.on("pageerror", (error) => console.log("PAGE ERROR", String(error).slice(0, 300)));
const shot = (name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
const results = [];
const check = (name, ok, note = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`);
};
// 목표·기록·코치 탭의 첫 안내는 본 것만 적어 두고 닫는다. 오늘·계획 화면의 안내는 따로 확인한다.
const toursSeen = new Set();
const settle = async () => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  const tour = page.locator('.tour[data-tour="goals"], .tour[data-tour="records"], .tour[data-tour="coach"]');
  if (await tour.count()) {
    const id = await tour.getAttribute("data-tour");
    if (!toursSeen.has(id)) await shot(`tour-${id}`);
    toursSeen.add(id);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
};
let sheetStable = null;
const UUID_URL = /\/goals\/[0-9a-f]{8}-[0-9a-f-]{27}/;
// 로그인한 세션의 토큰으로 Supabase에 직접 쓴다(RLS 안에서 자기 데이터만). 잠금을 풀어야 이어 갈 수 있는 점검에만 쓴다.
const SEOUL_TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
async function setLockDate(date) {
  const parts = (await context.cookies()).filter((cookie) => /^sb-.+-auth-token(\.\d+)?$/.test(cookie.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  let raw = decodeURIComponent(parts.map((cookie) => cookie.value).join(""));
  if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64url").toString("utf8");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/app_settings?user_id=not.is.null`, { method: "PATCH", body: JSON.stringify({ lock_date: date }), headers: { apikey: key, Authorization: `Bearer ${JSON.parse(raw).access_token}`, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`잠금 날짜 바꾸기 실패 ${res.status}`);
}

async function talk(first, { photo, answers = [], name } = {}) {
  await page.goto(BASE + "/goals/new");
  await settle();
  if (name) await shot(`${name}-chat-start`);
  const count = () => page.locator(".coach-say").count();
  const waitReply = async (before) => {
    await page.waitForFunction((n) => document.querySelectorAll(".coach-say").length > n && !document.querySelector(".typing"), before, { timeout: 120000 });
    await page.waitForTimeout(500);
    const options = await page.locator(".option-btn").allInnerTexts();
    console.log("  코치: " + (await page.locator(".coach-say").last().innerText()).replace(/\n/g, " ") + (options.length ? `  [선택지: ${options.join(" / ")}]` : ""));
  };
  const type = async (text) => {
    console.log("  나: " + text);
    await page.fill("#say", text);
    await page.keyboard.press("Enter");
  };
  let before = await count();
  await type(first);
  let uploaded = false;
  let lockAsked = false;
  for (let turn = 0; turn < 12; turn++) {
    await waitReply(before);
    if (await page.locator(".coach-say.is-problem").count()) return { ready: false, lockAsked };
    if (await page.getByRole("button", { name: "확인하러 가기" }).count()) return { ready: true, lockAsked };
    before = await count();
    if (await page.locator(".lock-card").count()) {
      lockAsked = true;
      await page.locator(".lock-card").getByRole("button", { name: "잠글 앱 고르기" }).click();
      const apps = page.locator("dialog.app-sheet[open]");
      await page.waitForTimeout(700); // 창이 다 올라온 뒤에 잰다
      const box = await apps.boundingBox();
      await apps.locator('input[type="search"]').fill("인스");
      await page.waitForTimeout(300);
      if (name) await shot(`${name}-app-search`);
      const after = await apps.boundingBox();
      sheetStable = Math.abs(box.height - after.height) < 2 && Math.abs(box.y - after.y) < 2;
      await apps.getByRole("button", { name: /인스타그램/ }).click();
      await apps.locator('input[type="search"]').fill("유튜브");
      await apps.getByRole("button", { name: /유튜브/ }).click();
      await apps.locator(".sheet-actions .btn").click();
      await page.locator(".lock-chosen li", { hasText: "인스타그램" }).getByRole("button", { name: "스토리" }).click();
      await page.locator(".lock-chosen li", { hasText: "유튜브" }).getByRole("button", { name: "앱 전체" }).click();
      await page.waitForTimeout(300);
      if (name) await shot(`${name}-chat-lock`);
      console.log("  나: (앱 고르기) 인스타그램 릴스·스토리, 유튜브 앱 전체");
      await page.locator(".lock-card").getByRole("button", { name: "이대로 잠그기" }).click();
    } else if (photo && !uploaded && (await page.locator(".composer-photo.is-hinted").count())) {
      uploaded = true;
      console.log("  나: (사진 올림)");
      await page.setInputFiles('.composer input[type="file"]', photo);
    } else if (answers.length) {
      await type(answers.shift());
    } else if (await page.locator(".option-btn").count()) {
      const option = page.locator(".option-btn").first();
      console.log("  나: (선택지) " + (await option.innerText()));
      await option.click();
    } else if (await page.locator(".quick .text-btn").count()) {
      console.log("  나: (건너뛰기)");
      await page.locator(".quick .text-btn").first().click();
    } else {
      await type("그 정도면 돼요. 정리해 주세요.");
    }
  }
  return { ready: false, lockAsked };
}

async function confirmAndCreate(name) {
  await shot(`${name}-chat-ready`, true);
  await page.getByRole("button", { name: "확인하러 가기" }).click();
  await page.waitForSelector(".sheet-list");
  await page.waitForTimeout(500);
  await shot(`${name}-confirm`, true);
  // 빈 값으로 제출하면 저장되지 않고, 고칠 곳을 알려 준다.
  const title = await page.inputValue("#title");
  await page.fill("#title", "");
  await page.locator(".dock .btn").click();
  await page.locator(".row-error").first().waitFor({ timeout: 15000 });
  await shot(`${name}-confirm-empty`, true);
  check("빈 값으로 제출하면 저장되지 않고 오류 문구가 뜸", /\/goals\/new/.test(page.url()) && /적어 주세요/.test(await page.locator(".row-error").first().innerText()), await page.locator(".row-error").first().innerText());
  await page.fill("#title", title);
  // 허용하지 않는 파일은 고르는 순간 걸러 낸다.
  await page.locator("#material").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  const typeError = await page.locator("#material-error").innerText().catch(() => "");
  await page.locator("#material").setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(3 * 1024 * 1024 + 10) });
  const sizeError = await page.locator("#material-error").innerText().catch(() => "");
  await page.locator("#material-error").scrollIntoViewIfNeeded().catch(() => {});
  await shot(`${name}-file-error`);
  check("허용하지 않는 형식이나 3MB를 넘는 파일은 올리기 전에 막음", Boolean(typeError) && Boolean(sizeError), `${typeError} / ${sizeError}`);
  const started = Date.now();
  await page.locator(".dock .btn").click();
  await page.waitForTimeout(1500);
  await shot(`${name}-planning`);
  await page.waitForURL(UUID_URL, { timeout: 280000 });
  console.log(`  계획 생성 ${Math.round((Date.now() - started) / 1000)}초`);
  await page.waitForSelector(".detail-head");
  await settle();
  // 계획을 처음 받으면 코치의 안내가 뜬다. 한 번 본 뒤에는 다시 뜨지 않는다.
  if (await page.locator(".tour").waitFor({ timeout: 4000 }).then(() => true, () => false)) {
    await shot(`${name}-tour-plan`);
    await page.locator(".tour-next").click();
    await page.waitForTimeout(500);
    await shot(`${name}-tour-plan-2`);
    check("계획을 처음 받으면 코치가 화면을 짚어 가며 안내함", (await page.locator(".tour-hole").count()) === 1, await page.locator(".tour-card p").innerText());
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  await shot(`${name}-plan`, true);
  return page.url().split("?")[0];
}

// 점검하는 날에는 할 일이 있어야 하므로, 쉬는 요일은 오늘이 아닌 평일로 잡는다.
const OFF_DAY = new Date().getDay() === 3 ? "목요일" : "수요일";
const TAIL = process.env.E2E_TAIL === "1"; // 이미 목표가 있는 계정으로 조정부터 이어서 점검
// 0. 로그인
console.log("\n[0] 로그인");
await page.goto(BASE + "/today");
await settle();
check("로그인하지 않으면 가입 화면으로 보냄", /\/login/.test(page.url()));
await shot("0-welcome");
await page.getByRole("button", { name: "시작하기", exact: true }).click();
await page.waitForTimeout(500);
{
  // 아래에서 올라온 창은 바깥 어두운 곳을 누르면 닫힌다.
  const sheet = page.locator("dialog.sheet[open]");
  await page.mouse.click(195, 40);
  await page.waitForTimeout(300);
  check("아래에서 올라온 창은 바깥을 누르면 닫힘", (await sheet.count()) === 0);
}
await page.getByRole("button", { name: "시작하기", exact: true }).click();
// 카카오·구글이 켜져 있으면 방법을 고르는 창이 먼저 올라온다.
if (await page.locator(".method-sheet[open]").count()) await page.getByRole("button", { name: "이메일로 가입하기" }).click();
await page.getByRole("button", { name: "가입하고 시작하기" }).waitFor();
await page.waitForTimeout(400);
await shot("0-email-sheet");
check("동의하기 전에는 가입 버튼이 눌리지 않음", await page.getByRole("button", { name: "가입하고 시작하기" }).isDisabled());
const EMAIL = TAIL ? process.env.E2E_EMAIL : `doer-e2e-${Math.random().toString(36).slice(2, 8)}@example.com`;
const PASSWORD = TAIL ? process.env.E2E_PASSWORD : `T-${Math.random().toString(36).slice(2, 12)}`;
if (TAIL) {
  await page.getByRole("tab", { name: "로그인" }).click();
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.locator("dialog .btn-primary").click();
  await page.waitForURL(/\/today/, { timeout: 30000 });
} else {
  // 중간에 멈춰도 계정을 지울 수 있게, 점검용 계정을 .env.local 에 적어 둔다.
  const kept = readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => line && !/^E2E_/.test(line));
  writeFileSync(".env.local", [...kept, `E2E_EMAIL=${EMAIL}`, `E2E_PASSWORD=${PASSWORD}`, ""].join("\n"));
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.locator(".agree-all").click();
  await page.getByRole("button", { name: "가입하고 시작하기" }).click();
  await page.waitForURL(/\/start/, { timeout: 30000 });
  await page.waitForTimeout(600);
  await shot("0-start-1");
  // 근거 네 장을 넘기면 코치 대화가 열리고, 첫 화면에서 고민을 묻는다.
  const slides = [];
  for (let i = 0; i < 6 && /\/start/.test(page.url()); i++) {
    slides.push(await page.locator(".onboard h1").innerText());
    if (i === 1) await shot("0-start-2");
    await page.locator(".onboard-actions .btn").click();
    await page.waitForTimeout(600);
  }
  check("가입하면 근거를 담은 첫 안내가 전체 화면으로 나옴", slides.length === 4, slides.join(" / "));
  await page.waitForURL(/\/goals\/new\?start=1/, { timeout: 30000 });
  await settle();
  await shot("0-start-ask");
  check("첫 안내 다음 코치 대화 첫 화면에서 고민을 물음", /고민은 무엇인가요/.test(await page.locator(".hello h1").innerText()));
  // 대화 도중 나갔다 와도 이어지는지도 본다.
  await page.fill("#say", "토익 850점을 받고 싶어");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelectorAll(".coach-say").length > 0 && !document.querySelector(".typing"), null, { timeout: 120000 });
  const said = await page.locator(".coach-say").last().innerText();
  await shot("0-chat-first");
  await page.goto(BASE + "/today");
  await settle();
  await page.goto(BASE + "/goals/new");
  await settle();
  check("대화하다 나갔다 와도 내용이 남아 있음", (await page.locator(".coach-say").count()) > 0 && (await page.locator(".coach-say").last().innerText()) === said);
  await page.locator(".chat-reset").click();
  await page.goto(BASE + "/today");
}
await settle();
await shot("0-today-empty");
if (!TAIL) check("로그인하면 오늘 화면(빈 상태)이 보임", /아직 계획이 없어요/.test(await page.locator("body").innerText()));

// 1. 날짜가 있는 목표
console.log("\n[1] 대화 → 확인 → 날짜별 계획");
// 시험일은 늘 3주 뒤로 둔다. 날짜를 고정하면 그날이 다가올수록 계획에 들어갈 날이 줄어 점검이 실패한다.
const examDay = new Date(Date.now() + 9 * 3600_000 + 21 * 86_400_000);
const examText = `${examDay.getUTCMonth() + 1}월 ${examDay.getUTCDate()}일`;
const first = TAIL ? { ready: false, lockAsked: false } : await talk(`${examText}에 정보처리기사 실기 시험이 있어`, {
  name: "1",
  answers: ["그때그때 달라요", `평일은 밤 9시 넘어서 1시간, 주말은 오전에 2시간 할 수 있어요. ${OFF_DAY}은 야근이라 못 해요.`, "필기는 붙었고 실기는 기출 1회독 했어요. SQL이 약해요." ],
});
if (!TAIL) check("코치가 대화로 목표를 알아듣고 확인 단계까지 감", first.ready);
if (!TAIL) check("첫 대화에서 잠글 앱을 물음", first.lockAsked);
if (!TAIL) check("앱을 찾는 동안 창 크기와 입력칸 위치가 그대로임", sheetStable === true);
let goalUrl = null;
if (first.ready) {
  goalUrl = await confirmAndCreate("1");
  const cells = await page.locator('.cal-cell i[data-kind="tasks"]').count();
  check("달력에 오늘이 든 주부터 날짜별 할 일이 채워짐", cells > 5 && (await page.locator(".cal-cell[data-today]").count()) === 1, `보이는 다섯 주에 ${cells}일`);
  check("달력이 계획 전의 빈 주로 채워지지 않음", (await page.locator(".cal-cell:disabled").count()) < 14, `비활성 칸 ${await page.locator(".cal-cell:disabled").count()}개`);
  check("목표 화면에 근거 한 줄 요약과 근거 화면으로 가는 줄이 보임", (await page.locator(".why-summary").count()) === 1 && (await page.locator(`a.row[href$="/why"]`).count()) === 1);
  // 목표일이 다섯 주 밖이면 다음 주들로 넘겨 본다.
  if (!(await page.locator(".cal-cell[data-deadline]").count()) && (await page.locator(".cal-nav button").last().isEnabled())) {
    await page.locator(".cal-nav button").last().click();
    await page.waitForTimeout(700);
  }
  check("목표일이 달력에 표시됨", (await page.locator(".cal-cell[data-deadline]").count()) === 1);
  await page.goto(goalUrl + "/why");
  await shot("1-why", true);
  check("근거 화면에 코치의 근거와 주별 흐름이 보임", (await page.locator("ul.basis li").count()) >= 3 && (await page.locator(".weeks details").count()) >= 1);
  await page.goto(goalUrl);
}

// 2. 오늘: 시작 전 확인, 맞춤 인증
console.log("\n[2] 오늘: 시작 전 확인과 맞춤 인증");
await page.goto(BASE + "/today");
await settle();
if (await page.locator(".tour").waitFor({ timeout: 4000 }).then(() => true, () => false)) {
  const said = [];
  for (let i = 0; i < 8 && (await page.locator(".tour").count()); i++) {
    said.push(await page.locator(".tour-card p").innerText());
    if (i === 1) await shot("2-tour-today");
    await page.locator(".tour-next").click();
    await page.waitForTimeout(450);
  }
  check("오늘 화면에 처음 오면 코치가 할 일·잠금·조정을 차례로 안내함", said.length >= 3 && said.some((text) => /버거운 날/.test(text)) && (await page.locator(".tour").count()) === 0, `${said.length}단계`);
  await page.reload();
  await page.waitForTimeout(1500);
  check("한 번 본 안내는 다시 뜨지 않음", (await page.locator(".tour").count()) === 0);
}
await shot("2-today");
const rows = page.locator(".today-row");
const rowCount = await rows.count();
check("오늘 날짜의 할 일이 보임", rowCount > 0, `${rowCount}개: ${(await page.locator(".today-text small").allInnerTexts()).join(" | ")}`);
if (TAIL) {
  await page.goto(BASE + "/goals");
  await settle();
  goalUrl = new URL(await page.locator(".goal-row").first().getAttribute("href"), BASE).href;
  await page.goto(BASE + "/today");
  await settle();
}
if (rowCount && !TAIL) {
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.locator("dialog.start-sheet[open]").waitFor();
  await page.waitForTimeout(400);
  await shot("2-start-sheet");
  const sheetText = await page.locator("dialog.start-sheet[open]").innerText();
  check("시작 전에 할 일·잠기는 곳·바로 풀 수 없음·사진 보관을 알려 줌", /인스타그램 릴스/.test(sheetText) && /바로 푸는 방법은 없어요/.test(sheetText) && /7일 뒤 지워요/.test(sheetText) && /인증/.test(sheetText));
  await page.locator("dialog.start-sheet[open]").getByRole("button", { name: /^시작(하고 잠그기|하기)$/ }).click();
  await page.locator(`.lock-state[data-tone="lock"]`).waitFor({ timeout: 20000 });
  await shot("2-today-locked");
  check("시작하면 '잠금 중'으로 바뀌고 시작 버튼이 사라짐", (await page.getByRole("button", { name: "시작하기" }).count()) === 0);

  // 인증 방식별로 한 번씩 해 본다.
  for (let index = 0; index < rowCount; index++) {
    await rows.nth(index).click();
    const sheet = page.locator("dialog.verify-sheet[open]");
    await sheet.waitFor();
    const label = (await sheet.locator(".verify b").innerText()).split("·")[0].trim();
    const title = await sheet.locator("h2").innerText();
    console.log(`  과제 ${index + 1}: ${title} — ${label}`);
    const verdict = async () => {
      await sheet.locator(".notice").first().waitFor({ timeout: 90000 });
      await page.waitForTimeout(400);
      console.log("    코치: " + (await sheet.locator(".notice").first().innerText()).replace(/\n/g, " "));
      return (await sheet.locator(".notice-success").count()) > 0;
    };
    if (label === "사진 인증") {
      await sheet.locator('input[type="file"]').setInputFiles("public/assets/symbol-light.png");
      await sheet.getByRole("button", { name: "이 사진으로 인증" }).click();
      const passed = await verdict();
      await shot(`2-verify-photo-${index + 1}`);
      check("사진 인증: 관계없는 사진은 통과시키지 않음", !passed);
      await sheet.getByRole("button", { name: "판정이 틀린 것 같아요" }).click();
      await sheet.locator(".appeal textarea").fill("점검용 이의 제기입니다. 사진을 다시 봐 주세요.");
      await sheet.getByRole("button", { name: "다시 봐 달라고 요청" }).click();
      await sheet.getByText(/요청한 내용을 기록해 두었어요/).waitFor({ timeout: 20000 });
      check("판정에 이의를 제기할 수 있음", true);
    } else if (label === "퀴즈 인증") {
      await sheet.getByRole("button", { name: /문제 받기|새 문제로/ }).click();
      await sheet.locator(".quiz li").first().waitFor({ timeout: 90000 });
      const questions = await sheet.locator(".quiz label").allInnerTexts();
      console.log("    문제: " + questions.map((text) => text.replace(/\n/g, " ")).join(" / "));
      await shot(`2-verify-quiz-${index + 1}`);
      for (const box of await sheet.locator(".quiz textarea").all()) await box.fill("잘 모르겠어요");
      await sheet.getByRole("button", { name: "답 보내기" }).click();
      const passed = await verdict();
      check("퀴즈 인증: 문제 세 개를 내고, 모른다는 답은 통과시키지 않음", questions.length === 3 && !passed);
    } else {
      await sheet.locator(".proof-text").fill("오늘은 기출 SQL 문제를 풀었다. GROUP BY에 쓰지 않은 컬럼을 SELECT에 넣어 틀린 문제가 둘 있었고, HAVING은 묶은 뒤의 조건이라 집계 함수를 쓸 수 있다는 점을 다시 정리했다. JOIN에서 ON 조건을 빠뜨려 행이 곱으로 늘어난 것도 확인했다.");
      await shot(`2-verify-write-${index + 1}`);
      await sheet.getByRole("button", { name: "이 글로 인증" }).click();
      const passed = await verdict();
      check("글 인증: 쓴 글을 읽고 판정과 이유를 돌려줌", (await sheet.locator(".notice").count()) > 0, passed ? "통과" : "미통과");
    }
    await shot(`2-verify-result-${index + 1}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

}
// 4. 목록 → 수정
console.log("\n[4] 목록과 수정");
await page.goto(BASE + "/goals");
await settle();
await shot("4-goals", true);
check("목록에 등록한 목표가 보임", (await page.locator(".goal-row").count()) === 1);
if (goalUrl) {
  // 새로고침해도 데이터가 그대로 남는다.
  await page.goto(goalUrl);
  await settle();
  const savedTitle = await page.locator(".detail-head h1").innerText();
  await page.locator(".material-empty").scrollIntoViewIfNeeded().catch(() => {});
  await shot("4-no-material");
  check("자료 사진 없이 등록하면 상세에 '올린 자료가 없어요'가 보임", (await page.locator(".material-empty").count()) === 1);
  await page.reload();
  await settle();
  check("새로고침해도 상세 데이터가 그대로임", (await page.locator(".detail-head h1").innerText()) === savedTitle);
  await page.goto(BASE + "/goals");
  await page.reload();
  await settle();
  check("새로고침해도 목록 데이터가 그대로임", /정보처리기사/.test(await page.locator(".goal-list").innerText()));

  // 계획한 기간이 끝났을 때의 "다음 계획 받기"는 코치 대화로 가서 이어서 짤지 새로 짤지 묻는다.
  await page.goto(`${BASE}/goals/new?talk=next&goal=${goalUrl.split("/").pop()}`);
  await settle();
  await shot("4-next-plan");
  const nextAsk = await page.locator(".msg-coach .bubble").first().innerText();
  const nextChoices = await page.locator(".next-list li b").allInnerTexts();
  check("다음 계획은 코치가 이어서 짤지 새로 짤지 물음", /이어서/.test(nextAsk) && /새로/.test(nextAsk) && nextChoices.join() === "이어서 짜기,새로 짜기", nextChoices.join(" / "));

  await page.goto(goalUrl + "/edit");
  await settle();
  // 잠긴 동안에는 고치지 못하게 미리 알리고 저장을 막는다. 확인한 뒤 점검 계정의 잠금만 잠시 풀고 이어 간다.
  if (await page.getByText(/잠금 중에는 목표를 고치거나/).count()) {
    await shot("4-edit-locked");
    check("잠금 중에는 목표 고치기를 미리 막음", await page.locator(".dock .btn").isDisabled());
    await setLockDate(null);
    await page.reload();
    await settle();
  }
  // 값이 실제로 달라져야 계획을 다시 짠다. 제목을 바꾸고 자료 사진도 올린다.
  const minutes = (await page.inputValue('input[name="daily_minutes"]')) === "90" ? "100" : "90";
  await page.fill("#title", "정보처리기사 실기 합격");
  await page.fill('input[name="daily_minutes"]', minutes);
  await page.fill('[name="schedule"]', "매일 밤 9시 이후 1시간 30분");
  await page.locator("#material").setInputFiles("public/assets/symbol-light.png");
  await page.locator(".dock .btn").click();
  await page.waitForURL(/notice=/, { timeout: 280000 });
  await settle();
  await shot("4-after-edit", true);
  check("수정 후 계획을 다시 짬", /notice=replanned/.test(page.url()));
  await setLockDate(SEOUL_TODAY);
  check("수정한 제목이 상세에 반영됨", (await page.locator(".detail-head h1").innerText()) === "정보처리기사 실기 합격");
  const image = page.locator(".material-view img");
  check(
    "올린 자료 사진이 Storage에 저장돼 상세에 보임",
    (await image.count()) === 1 && (await image.evaluate((img) => img.complete && img.naturalWidth > 0)),
    (await image.getAttribute("src").catch(() => ""))?.split("?")[0].split("/").slice(-3).join("/"),
  );
  await page.goto(BASE + "/goals");
  await settle();
  check("수정한 제목이 목록에 반영됨", /정보처리기사 실기 합격/.test(await page.locator(".goal-list").innerText()));
}

{
  // 3. 버거운 날: 조정안과 대가
  console.log("\n[3] 계획 조정");
  await page.goto(BASE + "/today");
  await settle();
  const beforeCount = await rows.count();
  check("오늘 화면에 조정 버튼을 따로 두지 않음", (await page.getByText("오늘 계획이 버거워요").count()) === 0);
  check("할 일을 본 지 얼마 안 됐으면 코치의 한마디가 뜨지 않음", (await page.locator(".nudge").count()) === 0);
  // 시작한 지 세 시간이 지난 것처럼 만들면, 아래에서 코치의 한마디가 올라온다.
  await page.evaluate(() => {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    const old = String(Date.now() - 3 * 60 * 60 * 1000);
    localStorage.setItem("doer.started." + day, old);
    localStorage.setItem("doer.seen." + day, old);
  });
  await page.reload();
  await page.locator(".nudge").waitFor({ timeout: 8000 });
  await page.waitForTimeout(500);
  await shot("3-nudge");
  check("오래 하지 않으면 아래에서 코치의 한마디가 뜸", /남아 있어요|조정할 수 있어요/.test(await page.locator(".nudge").innerText()));
  await page.locator(".nudge").getByRole("link", { name: "코치와 얘기하기" }).click();
  await page.waitForURL(/talk=adjust/);
  await page.locator("#adjust-say").fill("오늘 갑자기 야근이 잡혀서 30분밖에 못 내요");
  await page.locator(".composer-send").click();
  const adjust = page.locator(".chat");
  await adjust.locator(".adjust-list li").first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(400);
  await shot("3-adjust-options");
  const options = await adjust.locator(".adjust-list button").allInnerTexts();
  options.forEach((text) => console.log("  조정안: " + text.replace(/\n/g, " → ")));
  check("코치와의 대화에서 조정안과 각각의 대가를 보여 줌", options.length >= 1);
  await adjust.locator(".adjust-list button").first().click();
  await adjust.getByText(/^바꿨어요/).waitFor({ timeout: 30000 });
  await shot("3-adjust-done");
  await page.getByRole("link", { name: "오늘 할 일 보기" }).click();
  await page.waitForURL(/\/today/);
  await page.reload();
  await settle();
  await shot("3-today-after-adjust");
  check("고른 조정안이 오늘 할 일에 반영됨", (await rows.count()) !== beforeCount, `${beforeCount}개 → ${await rows.count()}개`);

  // 코치 탭은 상황별 대화를 고르는 곳이다.
  await page.locator(`.tabbar a[href="/coach"]`).click();
  await page.waitForURL(/\/coach$/);
  await settle();
  await shot("3-coach-hub");
  await page.locator(".tour-help").click();
  await page.waitForTimeout(500);
  check("물음표를 누르면 본 안내를 다시 볼 수 있음", (await page.locator('.tour[data-tour="coach"]').count()) === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const hub = await page.locator(".screen").innerText();
  check("코치 탭에서 오늘 조정·새 목표를 골라 대화를 시작함", /오늘/.test(hub) && /목표/.test(hub) && (await page.locator(`a[href="/goals/new?talk=adjust"], .row-quiet`).count()) >= 1);
}

// 6. 놓친 날 이어 가기. 새 계정에는 지난 날이 없으므로, 점검 계정의 계획에 오늘 할 일을 지난 날짜로 복사해 '못 한 날'을 만든다.
// 로그인한 세션의 토큰으로 Supabase에 직접 쓰므로 RLS 안에서 자기 데이터만 바뀐다.
{
  console.log("\n[6] 놓친 날 이어 가기");
  const seoul = (offset) => new Date(Date.parse(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date())}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
  const today = seoul(0);
  const token = async () => {
    const parts = (await context.cookies()).filter((cookie) => /^sb-.+-auth-token(\.\d+)?$/.test(cookie.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    let raw = decodeURIComponent(parts.map((cookie) => cookie.value).join(""));
    if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64url").toString("utf8");
    return JSON.parse(raw).access_token;
  };
  const rest = async (path, init = {}) => {
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", Prefer: "return=representation" } });
    if (!res.ok) throw new Error(`REST ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res.json();
  };
  // 오늘 할 일(옮겨 온 것 제외)을 그 날짜의 할 일로 넣어, 그날을 인증하지 못한 날로 만든다.
  const makeMissed = async (offset) => {
    const [goal] = await rest("goals?select=id,plan&plan_status=eq.ready&order=created_at.desc&limit=1");
    const date = seoul(offset);
    // 오늘 할 일이 조정으로 비었으면 앞으로 할 일이 있는 가장 가까운 날에서 가져온다.
    const fresh = (day) => day.tasks.filter((task) => !task.carried);
    const source = fresh(goal.plan.days.find((day) => day.date === today) ?? { tasks: [] }).length ? fresh(goal.plan.days.find((day) => day.date === today)) : fresh(goal.plan.days.find((day) => day.date > today && fresh(day).length) ?? { tasks: [] });
    const tasks = source.slice(0, 2).map((task, index) => ({ ...task, id: `${date}-${index + 1}`, title: `${task.title} (지난 날)` }));
    goal.plan.days = [...goal.plan.days.filter((day) => day.date !== date), { date, tasks }].sort((a, b) => a.date.localeCompare(b.date));
    await rest(`goals?id=eq.${goal.id}`, { method: "PATCH", body: JSON.stringify({ plan: goal.plan }) });
    return tasks.length;
  };
  const ready = await rest("adjustments?select=kind&limit=1").then(() => true, () => false);
  check("놓친 날 정리용 DB 칸이 준비됨(2026-11-12-recover.sql)", ready);
  if (ready) {
    // 6-1. 코치에게 사정을 말하지 않고 기본 방법으로 넘기기. AI 없이도 정리되는지 본다.
    const made = await makeMissed(-2);
    await page.goto(BASE + "/today");
    await settle();
    const line = page.locator(".recover-row");
    check("지난 날 못 한 일이 있으면 오늘 화면 위에 한 줄이 보임", (await line.count()) === 1 && /그제 못 한 일 \d가지/.test(await line.innerText()), `${made}가지`);
    await shot("6-today-missed");
    await line.locator("a").click();
    await page.waitForURL(/talk=recover/);
    await page.locator(".chips .chip-btn").first().waitFor();
    await shot("6-recover-start");
    await page.getByRole("button", { name: "말하지 않고 정리할게요" }).click();
    await page.locator(".recover-list li").first().waitFor({ timeout: 20000 });
    const basic = await page.locator(".recover-list button").allInnerTexts();
    basic.forEach((text) => console.log("  기본안: " + text.replace(/\n/g, " → ")));
    check("사정을 말하지 않아도(AI 없이) 기본 방법이 나옴", basic.some((text) => /이번엔 넘기기/.test(text)) && basic.every((text) => /기록/.test(text)));
    await page.locator(".recover-list button", { hasText: "이번엔 넘기기" }).click();
    await page.getByText(/^정리했어요/).waitFor({ timeout: 20000 });
    await page.goto(BASE + "/today");
    await settle();
    check("정리하면 오늘 화면의 한 줄이 사라짐", (await page.locator(".recover-row").count()) === 0);
    await page.goto(BASE + "/records");
    await settle();
    check("넘긴 날은 기록에 '못 함'으로 남음", (await page.locator('.week li[data-state="missed"]').count()) >= 1);

    // 6-2. 사정을 말하면 코치가 무엇을 살릴지 고른 안이 더해지고, 고르면 남은 날에 옮겨진다.
    await makeMissed(-1);
    await page.goto(BASE + "/goals/new?talk=recover");
    await settle();
    check("놓친 일을 코치가 먼저 말함", /어제 못 한 일/.test(await page.locator(".coach-say").first().innerText()));
    await page.getByRole("button", { name: "바빴어요" }).click();
    await page.locator(".recover-list li").first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(400);
    await shot("6-recover-options");
    const said = await page.locator(".coach-say").last().innerText();
    const options = await page.locator(".recover-list button").allInnerTexts();
    options.forEach((text) => console.log("  회복안: " + text.replace(/\n/g, " → ")));
    console.log("  코치: " + said);
    check("사정을 말하면 코치의 답과 함께 안이 나옴(AI가 실패해도 기본안은 남음)", options.length >= 2);
    const spread = page.locator(".recover-list button", { hasText: /나눠 하기|옮기기|이어 하기/ });
    if (await spread.count()) {
      await spread.first().click();
      await page.getByText(/^정리했어요/).waitFor({ timeout: 20000 });
      await shot("6-recover-done");
      await page.goto(BASE + "/today");
      await settle();
      const carried = await page.getByText(/요일에서 옮겨 옴/).count();
      const [goal] = await rest("goals?select=plan&plan_status=eq.ready&order=created_at.desc&limit=1");
      const copies = goal.plan.days.flatMap((day) => day.tasks.filter((task) => task.carried?.date === seoul(-1)));
      const past = goal.plan.days.find((day) => day.date === seoul(-1)).tasks.length;
      check("옮긴 일이 앞으로의 날에 사본으로 들어가고, 지난 날 계획은 그대로임", copies.length >= 1 && past >= 1, `사본 ${copies.length}개, 오늘 화면 표시 ${carried}개`);
      await shot("6-today-after-recover");
    } else console.log("  옮길 수 있는 안이 없어 옮기기 확인은 건너뜀");
    await page.goto(BASE + "/goals/new?talk=recover");
    await settle();
    check("같은 날은 두 번 정리하지 않음", /정리할 놓친 일이 없어요/.test(await page.locator(".chat-body").innerText()));
    const rows = await rest(`adjustments?select=kind,for_date,repairs,source&kind=eq.recover`);
    check("정리 기록이 날마다 한 줄씩 남음", rows.length === 2 && new Set(rows.map((row) => row.for_date)).size === 2, JSON.stringify(rows));
  }
}

// 기록 탭: 한 주 막대와 숫자
console.log("\n[기록]");
await page.goto(BASE + "/records");
await settle();
await shot("5-records", true);
check(
  "기록 화면에 일주일 칸과 숫자, 또는 첫 기록 안내가 보임",
  ((await page.locator(".week li").count()) === 7 && (await page.locator(".tiles div").count()) === 4) || (await page.getByText("첫 기록을 기다리고 있어요").count()) === 1,
);
await page.goto(BASE + "/today");
await settle();
check("연속 기록은 이틀째부터 오늘 화면에 보임", (await page.locator(".streak-badge").count()) === 0 || /\d+일째/.test(await page.locator(".streak-badge").innerText()));

// 5. 내 정보: 잠글 앱 바꾸기, 약관
console.log("\n[5] 내 정보");
await page.goto(BASE + "/settings");
await settle();
await shot("5-settings", true);
await page.getByRole("link", { name: /잠글 앱/ }).click();
await page.waitForURL(/\/settings\/locks/);
await settle();
check("고친 것이 없으면 저장 버튼이 꺼져 있음", await page.getByRole("button", { name: "저장", exact: true }).isDisabled());
// 오늘 할 일이 남아 잠겨 있으면 잠글 앱을 바꾸지 못하게 미리 막는다. 확인한 뒤 점검 계정의 잠금만 풀고 이어 간다.
if (await page.getByText(/잠금 중에는 바꿀 수 없어요/).count()) {
  await shot("5-locks-locked");
  check("잠금 중에는 잠글 앱 바꾸기를 미리 막음", await page.getByRole("button", { name: /앱 더 고르기|잠글 앱 고르기/ }).isDisabled());
  await setLockDate(null);
  await page.reload();
  await settle();
}
await page.getByRole("button", { name: /앱 더 고르기|잠글 앱 고르기/ }).click();
await page.locator("dialog.app-sheet[open]").getByRole("button", { name: /틱톡/ }).click();
await page.locator("dialog.app-sheet[open] .sheet-actions .btn").click();
await page.getByRole("button", { name: "저장", exact: true }).click();
await page.getByText("저장했어요").waitFor({ timeout: 20000 });
await shot("5-settings-locks", true);
await page.goto(BASE + "/settings");
await settle();
check("잠글 앱을 바꿔 저장하면 내 정보에 앱 수가 보임", /\d+개 앱/.test(await page.getByRole("link", { name: /잠글 앱/ }).innerText()));
await page.goto(BASE + "/privacy");
await settle();
await shot("5-privacy");
check("개인정보 처리방침이 보임", /받는 정보와 쓰는 곳/.test(await page.locator("body").innerText()));

// 6. 목표 삭제와 탈퇴 (점검 데이터 정리)
console.log("\n[6] 삭제와 탈퇴");
if (goalUrl) {
  await setLockDate(null);
  await page.goto(goalUrl);
  await settle();
  await page.locator(".topbar button.nav-btn").click();
  await page.waitForTimeout(400);
  await shot("6-delete-sheet");
  check("지우기 창이 휴지통 30일 보관을 알림", /휴지통.*30일/.test(await page.locator("#delete-description").innerText()));
  await page.getByRole("button", { name: "휴지통으로 옮기기", exact: true }).click();
  await page.waitForURL(/\/goals\?notice=deleted/, { timeout: 30000 });
  await settle();
  check("지운 목표는 목록 아래 휴지통 줄로 감", (await page.locator(".trash-link").count()) === 1);
  await page.goto(BASE + "/goals/trash");
  await settle();
  await shot("6-trash");
  check("휴지통에 지운 목표와 남은 날이 보임", /30일 뒤 완전히 지워져요|29일 뒤 완전히 지워져요/.test(await page.locator(".trash-list").innerText()));
  await page.getByRole("button", { name: "되살리기" }).click();
  await page.waitForURL(/notice=restored/, { timeout: 30000 });
  await settle();
  check("휴지통에서 되살리면 목표 화면으로 돌아옴", /휴지통에서 되살렸어요/.test(await page.locator("body").innerText()));
  await page.locator(".topbar button.nav-btn").click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "휴지통으로 옮기기", exact: true }).click();
  await page.waitForURL(/\/goals\?notice=deleted/, { timeout: 30000 });
  await page.goto(goalUrl);
  await settle();
  check("지운 목표의 주소는 '없는 목표' 화면", /없|찾을 수/.test(await page.locator("body").innerText()));
  await page.goto(BASE + "/goals/abc");
  await settle();
  await shot("6-not-found");
  check("형식이 틀린 상세 주소도 '없는 목표' 화면", /목표를 찾을 수 없어요/.test(await page.locator("body").innerText()));
  await page.goto(BASE + "/goals");
  await settle();
  await shot("6-after-delete");
  check("지운 목표는 목록에서 사라짐", (await page.locator(".goal-row").count()) === 0);
  await page.goto(BASE + "/goals/trash");
  await settle();
  await page.locator(".trash-row .nav-btn").first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "완전히 지우기", exact: true }).click();
  await page.waitForURL(/notice=purged/, { timeout: 30000 });
  await settle();
  await shot("6-trash-empty");
  check("완전히 지우면 휴지통이 빔", /휴지통이 비었어요/.test(await page.locator("body").innerText()));
}
await page.goto(BASE + "/settings");
await settle();
await page.getByRole("button", { name: "탈퇴하기" }).click();
await page.fill("#confirm", "탈퇴");
await page.getByRole("button", { name: /모두 지우고 탈퇴/ }).click();
await page.waitForURL(/\/login\?bye=1/, { timeout: 30000 });
await settle();
await shot("6-bye");
await page.getByRole("button", { name: "이미 계정이 있어요" }).click();
if (await page.locator(".method-sheet[open]").count()) await page.getByRole("button", { name: "이메일로 로그인" }).click();
await page.fill("#email", EMAIL);
await page.fill("#password", PASSWORD);
await page.locator("dialog .btn-primary").click();
await page.locator(".notice-error").last().waitFor({ timeout: 20000 });
check("탈퇴한 계정으로는 다시 로그인되지 않음", /맞지 않아요/.test(await page.locator(".notice-error").last().innerText()));

check("목표·기록·코치 탭을 처음 열면 짧은 안내가 한 번 뜸", ["goals", "records", "coach"].every((id) => toursSeen.has(id)), [...toursSeen].join(", "));
const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} 통과`);
await browser.close();
