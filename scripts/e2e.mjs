// 실제 AI·DB로 처음부터 끝까지 돌려 보는 점검. 사용: node scripts/e2e.mjs [주소] [저장 폴더]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "design-preview/e2e";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on("pageerror", (error) => console.log("PAGE ERROR", String(error).slice(0, 300)));
const shot = (name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
const results = [];
const check = (name, ok, note = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`);
};

async function talk(first, { photo, answers = [] } = {}) {
  await page.goto(BASE + "/goals/new");
  await page.waitForLoadState("networkidle");
  const waitReply = async (before) => {
    await page.waitForFunction((count) => document.querySelectorAll(".coach-say").length > count && !document.querySelector(".typing"), before, { timeout: 90000 });
    await page.waitForTimeout(500);
    console.log("  코치: " + (await page.locator(".coach-say").last().innerText()).replace(/\n/g, " "));
  };
  const type = async (text) => {
    console.log("  나: " + text);
    await page.fill("#say", text);
    await page.keyboard.press("Enter");
  };
  let before = await page.locator(".coach-say").count();
  await type(first);
  let uploaded = false;
  for (let turn = 0; turn < 10; turn++) {
    await waitReply(before);
    if (await page.locator(".coach-say.is-problem").count()) return false;
    if (await page.getByRole("button", { name: "확인하러 가기" }).count()) return true;
    before = await page.locator(".coach-say").count();
    if (await page.locator(".chip-btn").count()) {
      await shot("chat-lock");
      await page.locator(".chip-btn", { hasText: "릴스" }).click();
      await page.locator(".chip-btn", { hasText: "쇼츠" }).click();
      console.log("  나: (칩) 릴스, 쇼츠");
      await page.locator(".quick .btn").click();
    } else if (photo && !uploaded && (await page.locator(".composer-photo.is-hinted").count())) {
      uploaded = true;
      console.log("  나: (사진 올림)");
      await page.setInputFiles('input[type="file"]', photo);
    } else if (answers.length) {
      await type(answers.shift());
    } else if (await page.locator(".text-btn").count()) {
      console.log("  나: (건너뛰기)");
      await page.locator(".text-btn").click();
    } else {
      await type("그 정도면 돼요. 정리해 주세요.");
    }
  }
  return false;
}

async function confirmAndCreate(name) {
  await page.getByRole("button", { name: "확인하러 가기" }).click();
  await page.waitForSelector(".sheet-list");
  await page.waitForTimeout(500);
  await shot(`${name}-confirm`, true);
  await page.locator(".dock .btn").click();
  await page.waitForTimeout(1200);
  await shot(`${name}-planning`);
  await page.waitForURL(/\/today|\/goals\/[0-9a-f-]{36}/, { timeout: 120000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await shot(`${name}-after`, true);
  return page.url();
}

// 1. 날짜가 있는 목표: 대화 → 사진 → 잠금 → 확인 → 계획
console.log("\n[1] 날짜가 있는 목표");
const ready1 = await talk("11월 15일에 정보처리기사 실기 시험이 있어. 퇴근하고 한 시간쯤 할 수 있어", {
  photo: "public/assets/symbol-light.png",
  answers: ["필기는 붙었고 실기는 기출 1회독 했어요. SQL이 약해요."],
});
check("코치가 대화로 목표를 알아듣고 확인 단계까지 감", ready1);
if (ready1) {
  await shot("1-chat-ready", true);
  const url = await confirmAndCreate("1");
  check("목표 저장과 계획 생성 후 오늘 화면으로 이동", /\/today/.test(url), url);
  check("오늘 할 일이 보임", (await page.locator(".today-list li").count()) > 0, `${await page.locator(".today-list li").count()}개`);
}

// 2. 목록 → 상세
console.log("\n[2] 목록과 상세");
await page.goto(BASE + "/goals");
await page.waitForLoadState("networkidle");
await shot("2-goals", true);
const cards = page.locator('a[href^="/goals/"]:not([href="/goals/new"])');
check("목록에 등록한 목표가 보임", (await cards.count()) > 0, `${await cards.count()}개`);
await cards.first().click();
await page.waitForURL(/\/goals\/[0-9a-f-]{36}$/);
await page.waitForLoadState("networkidle");
const detailUrl = page.url();
await shot("2-detail", true);
const detailText = await page.locator("body").innerText();
check("상세에 주차 계획과 인증 방법이 보임", /1주/.test(detailText) && /인증/.test(detailText));
check("올린 자료 사진이 보임", (await page.locator('img[src*="goal-materials"]').count()) > 0);

// 3. 수정 → 계획 다시 만들기
console.log("\n[3] 수정");
await page.goto(detailUrl + "/edit");
await page.waitForLoadState("networkidle");
await page.fill('input[name="daily_minutes"]', "90");
await shot("3-edit", true);
await page.locator(".dock .btn").click();
await page.waitForURL(/\/goals\/[0-9a-f-]{36}(\?|$)/, { timeout: 120000 });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(800);
await shot("3-after-edit", true);
check("수정한 시간이 상세에 반영됨", /1시간 30분|90분/.test(await page.locator("body").innerText()));

// 4. 계속 이어 가는 목표를 하나 더 만들고 오늘 화면에서 합쳐지는지 확인
console.log("\n[4] 계속 이어 가는 목표");
const ready2 = await talk("매일 아침 30분씩 달리기를 꾸준히 하고 싶어", { answers: ["지금은 2km 정도 뛰면 숨이 차요."] });
check("두 번째 목표도 확인 단계까지 감", ready2);
let secondUrl = null;
if (ready2) {
  await confirmAndCreate("4");
  await page.goto(BASE + "/today");
  await page.waitForLoadState("networkidle");
  await shot("4-today-merged", true);
  const goalNames = new Set(await page.locator(".today-text small").allInnerTexts());
  check("오늘 화면에 두 목표의 할 일이 합쳐짐", goalNames.size >= 2, [...goalNames].join(" / "));
  await page.goto(BASE + "/goals?kind=ongoing");
  await page.waitForLoadState("networkidle");
  await cards.first().click();
  await page.waitForURL(/\/goals\/[0-9a-f-]{36}$/);
  secondUrl = page.url();
}

// 5. 삭제 (두 번째 목표)
if (secondUrl) {
  console.log("\n[5] 삭제");
  await page.locator(".topbar button.nav-btn").click();
  await page.waitForTimeout(500);
  await shot("5-delete-sheet");
  await page.getByRole("button", { name: "지우기", exact: true }).click();
  await page.waitForURL(/\/goals\?notice=deleted/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await shot("5-after-delete", true);
  await page.goto(secondUrl);
  await page.waitForLoadState("networkidle");
  check("지운 목표의 주소는 '없는 목표' 화면", /없|찾을 수/.test(await page.locator("body").innerText()));
}

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} 통과`);
await browser.close();
