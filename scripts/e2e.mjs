// 실제 AI·DB로 처음부터 끝까지 돌려 보는 점검. 사용: node scripts/e2e.mjs [주소] [저장 폴더]
// 로그인 → 코치 대화 → 날짜별 계획 → 시작 전 확인 → 맞춤 인증 → 조정 → 수정 → 삭제 → 탈퇴 순서로 확인한다.
// 점검용 계정은 .env.local 의 E2E_EMAIL, E2E_PASSWORD 를 쓴다. 마지막에 탈퇴해 점검 데이터를 지운다.
import { mkdirSync, readFileSync } from "node:fs";
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
const settle = async () => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
};
const UUID_URL = /\/goals\/[0-9a-f]{8}-[0-9a-f-]{27}/;

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
      await page.locator(".lock-card .chips").first().getByRole("button", { name: "인스타그램" }).click();
      await page.locator(".lock-scope", { hasText: "인스타그램" }).getByRole("button", { name: "스토리" }).click();
      await page.locator(".lock-card .chips").first().getByRole("button", { name: "유튜브" }).click();
      await page.locator(".lock-scope", { hasText: "유튜브" }).getByRole("button", { name: "앱 전체" }).click();
      await page.waitForTimeout(300);
      if (name) await shot(`${name}-chat-lock`);
      console.log("  나: (앱 고르기) 인스타그램 릴스·스토리, 유튜브 앱 전체");
      await page.locator(".lock-card > .btn").click();
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
  const started = Date.now();
  await page.locator(".dock .btn").click();
  await page.waitForTimeout(1500);
  await shot(`${name}-planning`);
  await page.waitForURL(UUID_URL, { timeout: 280000 });
  console.log(`  계획 생성 ${Math.round((Date.now() - started) / 1000)}초`);
  await page.waitForSelector(".detail-head");
  await settle();
  await shot(`${name}-plan`, true);
  return page.url().split("?")[0];
}

const TAIL = process.env.E2E_TAIL === "1"; // 이미 목표가 있는 계정으로 조정부터 이어서 점검
// 0. 로그인
console.log("\n[0] 로그인");
await page.goto(BASE + "/today");
await settle();
check("로그인하지 않으면 가입 화면으로 보냄", /\/login/.test(page.url()));
await shot("0-welcome");
await page.getByRole("button", { name: "이메일로 시작하기" }).click();
await page.getByRole("button", { name: "가입하고 시작하기" }).waitFor();
await page.waitForTimeout(400);
await shot("0-email-sheet");
check("동의하기 전에는 가입 버튼이 눌리지 않음", await page.getByRole("button", { name: "가입하고 시작하기" }).isDisabled());
await page.getByRole("tab", { name: "로그인" }).click();
await page.fill("#email", process.env.E2E_EMAIL);
await page.fill("#password", "wrong-password-1");
await page.getByRole("button", { name: "로그인", exact: true }).click();
await page.locator(".notice-error").waitFor({ timeout: 20000 });
check("틀린 비밀번호는 안내와 함께 막힘", /맞지 않아요/.test(await page.locator(".notice-error").innerText()));
await page.fill("#password", process.env.E2E_PASSWORD);
await page.getByRole("button", { name: "로그인", exact: true }).click();
await page.waitForURL(/\/today/, { timeout: 30000 });
await settle();
await shot("0-today-empty");
if (!TAIL) check("로그인하면 오늘 화면(빈 상태)이 보임", /아직 계획이 없어요/.test(await page.locator("body").innerText()));

// 1. 날짜가 있는 목표
console.log("\n[1] 대화 → 확인 → 날짜별 계획");
const first = TAIL ? { ready: false, lockAsked: false } : await talk("11월 15일에 정보처리기사 실기 시험이 있어", {
  name: "1",
  answers: ["그때그때 달라요", "평일은 밤 9시 넘어서 1시간, 주말은 오전에 2시간 할 수 있어요. 수요일은 야근이라 못 해요.", "필기는 붙었고 실기는 기출 1회독 했어요. SQL이 약해요.", "자료 사진은 없어요."],
});
if (!TAIL) check("코치가 대화로 목표를 알아듣고 확인 단계까지 감", first.ready);
if (!TAIL) check("첫 대화에서 잠글 앱을 물음", first.lockAsked);
let goalUrl = null;
if (first.ready) {
  goalUrl = await confirmAndCreate("1");
  const cells = await page.locator('.cal-cell i[data-kind="tasks"]').count();
  check("달력에 날짜별 할 일이 채워짐", cells > 5, `이번 달 ${cells}일`);
  check("계획의 근거가 보임", (await page.locator(".basis > ul li").count()) >= 3);
  await page.locator(".cal-nav button").last().click();
  await page.waitForTimeout(700);
  check("목표일이 달력에 표시됨", (await page.locator(".cal-cell[data-deadline]").count()) === 1);
  check("고른 잠금이 상세에 보임", /인스타그램 릴스 · 인스타그램 스토리 · 유튜브/.test(await page.locator(".detail-head").innerText()), (await page.locator(".detail-head .meta").innerText()).replace(/\n/g, " "));
}

// 2. 오늘: 시작 전 확인, 맞춤 인증
console.log("\n[2] 오늘: 시작 전 확인과 맞춤 인증");
await page.goto(BASE + "/today");
await settle();
await shot("2-today");
const rows = page.locator(".today-row");
const rowCount = await rows.count();
check("오늘 날짜의 할 일이 보임", rowCount > 0, `${rowCount}개: ${(await page.locator(".today-text small").allInnerTexts()).join(" | ")}`);
if (TAIL) {
  await page.goto(BASE + "/goals");
  await settle();
  goalUrl = new URL(await page.locator(".goal-card").first().getAttribute("href"), BASE).href;
  await page.goto(BASE + "/today");
  await settle();
}
if (rowCount && !TAIL) {
  await page.getByRole("button", { name: "이대로 시작" }).click();
  await page.locator("dialog.start-sheet[open]").waitFor();
  await page.waitForTimeout(400);
  await shot("2-start-sheet");
  const sheetText = await page.locator("dialog.start-sheet[open]").innerText();
  check("시작 전에 할 일·인증 방식·잠기는 곳을 보여 줌", /인증 방식/.test(sheetText) && /인스타그램 릴스/.test(sheetText));
  await page.getByRole("button", { name: "확인했어요, 시작" }).click();
  await page.locator(".lock-banner").waitFor({ timeout: 20000 });
  await shot("2-today-locked");
  check("시작하면 '잠금 중'으로 바뀌고 시작 버튼이 사라짐", (await page.getByRole("button", { name: "이대로 시작" }).count()) === 0);

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
      await sheet.getByText("운영자가 직접 확인해요").waitFor({ timeout: 20000 });
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
check("목록에 등록한 목표가 보임", (await page.locator(".goal-card").count()) === 1);
if (goalUrl) {
  await page.goto(goalUrl + "/edit");
  await settle();
  await page.fill('input[name="daily_minutes"]', "90");
  await page.fill('input[name="schedule"]', "매일 밤 9시 이후 1시간 30분");
  await page.locator(".dock .btn").click();
  await page.waitForURL(/notice=/, { timeout: 280000 });
  await settle();
  check("수정 후 계획을 다시 짬", /notice=replanned/.test(page.url()));
}

{
  // 3. 버거운 날: 조정안과 대가
  console.log("\n[3] 계획 조정");
  await page.goto(BASE + "/today");
  await settle();
  await page.getByRole("button", { name: "오늘 계획이 버거워요" }).click();
  const adjust = page.locator("dialog.adjust-sheet[open]");
  await adjust.locator("#adjust-reason").fill("오늘 갑자기 야근이 잡혀서 30분밖에 못 내요");
  await adjust.getByRole("button", { name: "코치에게 말하기" }).click();
  await adjust.locator(".adjust-list li").first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(400);
  await shot("3-adjust-options");
  const options = await adjust.locator(".adjust-list button").allInnerTexts();
  options.forEach((text) => console.log("  조정안: " + text.replace(/\n/g, " → ")));
  check("조정안과 각각의 대가를 보여 줌", options.length >= 1);
  const beforeCount = await rows.count();
  await adjust.locator(".adjust-list button").first().click();
  await adjust.getByText("이렇게 바꿨어요").waitFor({ timeout: 30000 });
  await shot("3-adjust-done");
  await adjust.getByRole("button", { name: "확인" }).click();
  await page.reload();
  await settle();
  await shot("3-today-after-adjust");
  check("고른 조정안이 오늘 할 일에 반영됨", (await rows.count()) !== beforeCount, `${beforeCount}개 → ${await rows.count()}개`);
}

// 5. 내 정보: 잠글 앱 바꾸기, 약관
console.log("\n[5] 내 정보");
await page.goto(BASE + "/settings");
await settle();
await page.locator(".settings-card .chips").first().getByRole("button", { name: "틱톡" }).click();
await page.getByRole("button", { name: "저장", exact: true }).click();
await page.getByText("저장했어요").waitFor({ timeout: 20000 });
await shot("5-settings", true);
check("잠글 앱을 바꿔 저장할 수 있음", true);
await page.goto(BASE + "/privacy");
await settle();
await shot("5-privacy");
check("개인정보 처리방침이 보임", /받는 정보와 쓰는 곳/.test(await page.locator("body").innerText()));

// 6. 목표 삭제와 탈퇴 (점검 데이터 정리)
console.log("\n[6] 삭제와 탈퇴");
if (goalUrl) {
  await page.goto(goalUrl);
  await settle();
  await page.locator(".topbar button.nav-btn").click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "지우기", exact: true }).click();
  await page.waitForURL(/\/goals\?notice=deleted/, { timeout: 30000 });
  await page.goto(goalUrl);
  await settle();
  check("지운 목표의 주소는 '없는 목표' 화면", /없|찾을 수/.test(await page.locator("body").innerText()));
}
await page.goto(BASE + "/settings");
await settle();
await page.getByRole("button", { name: "탈퇴하기" }).click();
await page.fill("#confirm", "탈퇴");
await page.getByRole("button", { name: /모두 지우고 탈퇴/ }).click();
await page.waitForURL(/\/login\?bye=1/, { timeout: 30000 });
await settle();
await shot("6-bye");
await page.locator(".welcome-foot .text-btn").click();
await page.fill("#email", process.env.E2E_EMAIL);
await page.fill("#password", process.env.E2E_PASSWORD);
await page.getByRole("button", { name: "로그인", exact: true }).click();
await page.locator(".notice-error").last().waitFor({ timeout: 20000 });
check("탈퇴한 계정으로는 다시 로그인되지 않음", /맞지 않아요/.test(await page.locator(".notice-error").last().innerText()));

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} 통과`);
await browser.close();
