// 실제 AI·DB로 처음부터 끝까지 돌려 보는 점검. 사용: node scripts/e2e.mjs [주소] [저장 폴더]
// 코치 대화 → 확인 장 → 날짜별 계획 → 오늘 할 일 인증 → 수정 → 두 번째 목표 → 삭제 순서로 확인한다.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

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
  const waitReply = async (before) => {
    await page.waitForFunction((count) => document.querySelectorAll(".coach-say").length > count && !document.querySelector(".typing"), before, { timeout: 120000 });
    await page.waitForTimeout(500);
    const options = await page.locator(".option-btn").allInnerTexts();
    console.log("  코치: " + (await page.locator(".coach-say").last().innerText()).replace(/\n/g, " ") + (options.length ? `  [선택지: ${options.join(" / ")}]` : ""));
  };
  const type = async (text) => {
    console.log("  나: " + text);
    await page.fill("#say", text);
    await page.keyboard.press("Enter");
  };
  let before = await page.locator(".coach-say").count();
  await type(first);
  let uploaded = false;
  for (let turn = 0; turn < 12; turn++) {
    await waitReply(before);
    if (await page.locator(".coach-say.is-problem").count()) return false;
    if (await page.getByRole("button", { name: "확인하러 가기" }).count()) return true;
    before = await page.locator(".coach-say").count();
    if (await page.locator(".lock-card").count()) {
      await page.locator(".lock-card .chip-btn", { hasText: "인스타그램" }).click();
      await page.locator(".lock-card .chip-btn", { hasText: "유튜브" }).click();
      await page.locator(".lock-scope", { hasText: "유튜브" }).locator("input").nth(1).check({ force: true });
      await page.waitForTimeout(300);
      if (name) await shot(`${name}-chat-lock`);
      console.log("  나: (앱 고르기) 인스타그램 릴스만, 유튜브 앱 전체");
      await page.locator(".lock-card .btn").click();
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
    } else if (await page.locator(".text-btn").count()) {
      console.log("  나: (건너뛰기)");
      await page.locator(".text-btn").first().click();
    } else {
      await type("그 정도면 돼요. 정리해 주세요.");
    }
  }
  return false;
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

// 과제 내용에 맞춘 가짜 인증 사진(손으로 푼 것처럼 보이는 종이)을 만들어 둔다.
async function makeProof(title, guide, path) {
  const sheet = await context.newPage();
  await sheet.setViewportSize({ width: 800, height: 1000 });
  const rows = Array.from({ length: 5 }, (_, i) => `<tr><td>${i + 1}</td><td>문항 ${i + 1} — 직접 작성한 풀이와 답안</td><td style="color:#d33;font-size:28px">${i === 2 ? "✗ → 다시 풀어 고침" : "○"}</td></tr>`).join("");
  await sheet.setContent(
    `<body style="margin:0;padding:48px;background:#f4efe4;font-family:'Malgun Gothic',sans-serif"><div style="background:#fffdf7;padding:36px;box-shadow:0 4px 18px #0002;transform:rotate(-1deg)"><h2 style="margin:0 0 6px">${title}</h2><p style="color:#555;margin:0 0 18px">${guide}</p><table style="width:100%;border-collapse:collapse;font-size:20px" border="1" cellpadding="14">${rows}</table><p style="margin-top:22px;font-size:20px;color:#1a4">채점 완료: 5개 중 4개 맞음. 틀린 3번은 이유를 적고 다시 풀었음.</p></div></body>`,
  );
  await sheet.screenshot({ path });
  await sheet.close();
}

// 1. 날짜가 있는 목표
console.log("\n[1] 날짜가 있는 목표: 대화 → 확인 → 날짜별 계획");
const ready1 = await talk("11월 15일에 정보처리기사 실기 시험이 있어", {
  name: "1",
  photo: "public/assets/symbol-light.png",
  answers: ["그때그때 달라요", "평일은 밤 9시 넘어서 1시간, 주말은 오전에 2시간 할 수 있어요. 수요일은 야근이라 못 해요.", "필기는 붙었고 실기는 기출 1회독 했어요. SQL이 약해요."],
});
check("코치가 대화로 목표를 알아듣고 확인 단계까지 감", ready1);
let goalUrl = null;
if (ready1) {
  goalUrl = await confirmAndCreate("1");
  const cells = await page.locator('.cal-cell i[data-kind="tasks"]').count();
  check("달력에 날짜별 할 일이 채워짐", cells > 5, `이번 달 ${cells}일`);
  check("계획의 근거가 보임", (await page.locator(".basis > ul li").count()) >= 3, `${await page.locator(".basis > ul li").count()}개`);
  check("오늘 날짜의 할 일이 달력 아래에 보임", (await page.locator(".cal-day .tasks > li").count()) > 0);
  await page.locator(".cal-nav button").last().click();
  await page.waitForTimeout(700);
  await shot("1-plan-next-month");
  check("목표일이 달력에 표시됨", (await page.locator(".cal-cell[data-deadline]").count()) === 1);
  check("올린 자료 사진이 보임", (await page.locator('.told img[src*="goal-materials"]').count()) > 0);
}

// 2. 오늘 화면과 인증
console.log("\n[2] 오늘 할 일과 사진 인증");
await page.goto(BASE + "/today");
await settle();
await shot("2-today");
const rows = page.locator(".today-row");
check("오늘 화면에 오늘 날짜의 할 일이 보임", (await rows.count()) > 0, `${await rows.count()}개`);
check("잠글 앱이 고른 대로 표시됨", /인스타그램 릴스·유튜브/.test(await page.locator(".lock-note").innerText()), await page.locator(".lock-note").innerText());
if (await rows.count()) {
  await rows.first().click();
  const sheet = page.locator("dialog.verify-sheet[open]");
  await sheet.waitFor();
  await page.waitForTimeout(500);
  await shot("2-verify-sheet");
  const judge = async (file) => {
    await sheet.locator('input[type="file"]').setInputFiles(file);
    await sheet.getByRole("button", { name: "이 사진으로 인증" }).click();
    await sheet.locator(".notice").waitFor({ timeout: 90000 });
    await page.waitForTimeout(400);
    const text = await sheet.locator(".notice").first().innerText();
    console.log("  코치 판정: " + text.replace(/\n/g, " "));
    return (await sheet.locator(".notice-success").count()) > 0;
  };
  const wrong = await judge("public/assets/symbol-light.png");
  await shot("2-verify-rejected");
  check("관계없는 사진은 통과시키지 않음", !wrong);
  await makeProof(await sheet.locator("h2").innerText(), await sheet.locator("p.verify span").innerText(), `${OUT}/proof.png`);
  const right = await judge(`${OUT}/proof.png`);
  await shot("2-verify-passed");
  check("과제에 맞는 사진은 통과시킴", right);
  await sheet.getByRole("button", { name: /확인|나중에/ }).click();
  await page.reload();
  await settle();
  await shot("2-today-after", true);
  check("통과한 할 일이 '인증 끝'으로 남음", (await page.locator('.today-state[data-kind="passed"]').count()) === (right ? 1 : 0));
}

// 3. 목록 → 수정
console.log("\n[3] 목록과 수정");
await page.goto(BASE + "/goals");
await settle();
await shot("3-goals", true);
check("목록에 등록한 목표가 보임", (await page.locator(".goal-card").count()) > 0, `${await page.locator(".goal-card").count()}개`);
if (goalUrl) {
  await page.goto(goalUrl + "/edit");
  await settle();
  await page.fill('input[name="daily_minutes"]', "90");
  await page.fill('input[name="schedule"]', "매일 밤 9시 이후 1시간 30분");
  await shot("3-edit", true);
  await page.locator(".dock .btn").click();
  await page.waitForURL(/notice=/, { timeout: 280000 });
  await settle();
  await shot("3-after-edit", true);
  check("수정 후 계획을 다시 짬", /notice=replanned/.test(page.url()), page.url().split("?")[1]);
  check("수정한 시간이 상세에 반영됨", /1시간 30분/.test(await page.locator(".detail-head").innerText()));
}

// 4. 매주 반복하는 목표: 잠글 앱은 다시 묻지 않아야 한다
console.log("\n[4] 매주 반복하는 목표");
const ready2 = await talk("매일 아침 30분씩 달리기를 꾸준히 하고 싶어", { name: "4", answers: ["매일 아침 7시에 30분", "지금은 2km 정도 뛰면 숨이 차요."] });
check("두 번째 목표도 확인 단계까지 감 (잠글 앱은 다시 묻지 않음)", ready2 && (await page.locator(".lock-card").count()) === 0);
let secondUrl = null;
if (ready2) {
  secondUrl = await confirmAndCreate("4");
  await page.goto(BASE + "/today");
  await settle();
  await shot("4-today-merged", true);
  const names = new Set(await page.locator(".today-text small").allInnerTexts());
  check("오늘 화면에 두 목표의 할 일이 합쳐짐", names.size >= 2, [...names].join(" / "));
}

// 5. 삭제
if (secondUrl) {
  console.log("\n[5] 삭제");
  await page.goto(secondUrl);
  await settle();
  await page.locator(".topbar button.nav-btn").click();
  await page.waitForTimeout(500);
  await shot("5-delete-sheet");
  await page.getByRole("button", { name: "지우기", exact: true }).click();
  await page.waitForURL(/\/goals\?notice=deleted/, { timeout: 30000 });
  await settle();
  await page.goto(secondUrl);
  await settle();
  check("지운 목표의 주소는 '없는 목표' 화면", /없|찾을 수/.test(await page.locator("body").innerText()));
}

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} 통과`);
await browser.close();
