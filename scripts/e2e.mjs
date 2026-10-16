// 실제 AI·DB로 처음부터 끝까지 돌려 보는 점검. 사용: node scripts/e2e.mjs [주소] [저장 폴더]
//   로컬: node scripts/e2e.mjs                (npm run dev 로 3000번에 띄운 뒤)
//   배포: node scripts/e2e.mjs https://배포주소
// 첫 화면 → 코치 대화 → 확인 장(등록) → 날짜별 계획 → 시작 전 확인 → 맞춤 인증 → 조정 → 목록·수정 → 내 정보 → 삭제 순서로 확인한다.
// 로그인이 없는 공용 데모 공간이라, 목표가 하나도 없을 때만 돌린다. 만든 목표는 마지막에 지운다.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
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
let sheetStable = null;
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
  // 저장 버튼을 두 번 연달아 눌러도 한 번만 저장되는지 함께 본다(아래 목록 점검에서 1개인지 확인).
  await page.evaluate(() => {
    const form = document.querySelector("form.confirm");
    form.requestSubmit();
    form.requestSubmit();
  });
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
    await page.getByRole("button", { name: "건너뛰기" }).click();
    await page.waitForTimeout(300);
  }
  await shot(`${name}-plan`, true);
  return page.url().split("?")[0];
}

// 점검하는 날에는 할 일이 있어야 하므로, 쉬는 요일은 오늘이 아닌 평일로 잡는다.
const OFF_DAY = new Date().getDay() === 3 ? "목요일" : "수요일";
const TAIL = false;
let goalUrl = null;
try {
// 0. 첫 화면과 코치
console.log("\n[0] 첫 화면과 코치");
await page.goto(BASE + "/");
await settle();
check("주소를 열면 오늘 화면으로 감", /\/today/.test(page.url()));
if (!/아직 계획이 없어요/.test(await page.locator("body").innerText())) {
  console.log("데모 공간에 이미 목표가 있어요. 점검은 빈 공간에서만 돌려요.");
  await browser.close();
  process.exit(2);
}
await shot("0-today-empty");
check("목표가 없으면 오늘 화면에 빈 상태가 보임", true);
await page.goto(BASE + "/goals/new");
await settle();
await shot("0-chat-start");
await page.getByRole("button", { name: "대화 없이 직접 적기" }).click();
await page.locator("#title").waitFor();
check("대화 없이 직접 적기로 바로 입력 폼을 열 수 있음", (await page.locator(".sheet-list").count()) === 1);
await page.getByRole("button", { name: "대화로 돌아가기" }).click();
// 대화 도중 나갔다 와도 이어지는지 본다.
await page.fill("#say", "토익 850점을 받고 싶어");
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelectorAll(".coach-say").length > 0 && !document.querySelector(".typing"), null, { timeout: 120000 });
const said = await page.locator(".coach-say").last().innerText();
await page.goto(BASE + "/today");
await settle();
await page.goto(BASE + "/goals/new");
await settle();
check("대화하다 나갔다 와도 내용이 남아 있음", (await page.locator(".coach-say").count()) > 0 && (await page.locator(".coach-say").last().innerText()) === said);
await page.locator(".chat-reset").click();

// 1. 날짜가 있는 목표
console.log("\n[1] 대화 → 확인 → 날짜별 계획");
const first = TAIL ? { ready: false, lockAsked: false } : await talk("11월 15일에 정보처리기사 실기 시험이 있어", {
  name: "1",
  answers: ["그때그때 달라요", `평일은 밤 9시 넘어서 1시간, 주말은 오전에 2시간 할 수 있어요. ${OFF_DAY}은 야근이라 못 해요.`, "필기는 붙었고 실기는 기출 1회독 했어요. SQL이 약해요.", "자료 사진은 없어요."],
});
if (!TAIL) check("코치가 대화로 목표를 알아듣고 확인 단계까지 감", first.ready);
if (!TAIL) check("첫 대화에서 잠글 앱을 물음", first.lockAsked);
if (!TAIL) check("앱을 찾는 동안 창 크기와 입력칸 위치가 그대로임", sheetStable === true);
if (first.ready) {
  goalUrl = await confirmAndCreate("1");
  const cells = await page.locator('.cal-cell i[data-kind="tasks"]').count();
  check("달력에 날짜별 할 일이 채워짐", cells > 5, `이번 달 ${cells}일`);
  check("목표 화면에 근거 한 줄 요약과 근거 화면으로 가는 줄이 보임", (await page.locator(".why-summary").count()) === 1 && (await page.locator(`a.row[href$="/why"]`).count()) === 1);
  await page.locator(".cal-nav button").last().click();
  await page.waitForTimeout(700);
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
    if (i === 3) await shot("2-tour-today");
    await page.locator(".tour-next").click();
    await page.waitForTimeout(450);
  }
  check("오늘 화면에 처음 오면 코치가 할 일·잠금·조정을 차례로 안내함", said.length >= 4 && said.some((text) => /버거운 날/.test(text)) && (await page.locator(".tour").count()) === 0, `${said.length}단계`);
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
  await page.getByRole("button", { name: "시작", exact: true }).click();
  await page.locator(`.status[data-tone="lock"]`).waitFor({ timeout: 20000 });
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
      await sheet.getByText("운영자가 확인해요").waitFor({ timeout: 20000 });
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
check("목록에 등록한 목표가 보이고, 두 번 연달아 저장해도 하나만 생김", (await page.locator(".goal-row").count()) === 1);
check("목록에 검색창과 종류 필터가 보임", (await page.locator("form.search").count()) === 1 && (await page.locator("nav.filters a").count()) === 4);
await page.goto(BASE + "/goals?q=" + encodeURIComponent("정보처리기사"));
await settle();
check("주소의 검색어(q)로 목표를 찾음", (await page.locator(".goal-row").count()) === 1);
await page.goto(BASE + "/goals?kind=ongoing");
await settle();
check("주소의 종류 필터(kind)로 거름: 매주 반복에는 날짜 있는 목표가 없음", /조건에 맞는 목표가 없어요/.test(await page.locator("body").innerText()));
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

  await page.goto(goalUrl + "/edit");
  await settle();
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
  check("수정한 제목이 상세에 반영됨", (await page.locator(".detail-head h1").innerText()) === "정보처리기사 실기 합격");
  const image = page.locator(".material-view img");
  check(
    "올린 자료 사진이 Storage에 저장돼 상세에 보임",
    (await image.count()) === 1 &&
      (await image.evaluate((img) => (img.complete && img.naturalWidth > 0) || new Promise((resolve) => {
        img.onload = () => resolve(img.naturalWidth > 0);
        img.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 15000);
      }))),
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
  check("오래 하지 않으면 아래에서 코치의 한마디가 뜸", /남았어요/.test(await page.locator(".nudge").innerText()));
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
}

// 5. 내 정보: 잠글 앱 바꾸기, 약관
console.log("\n[5] 내 정보");
await page.goto(BASE + "/settings");
await settle();
await page.locator(".settings-card").getByRole("button", { name: /앱 더 고르기|잠글 앱 고르기/ }).click();
await page.locator("dialog.app-sheet[open]").getByRole("button", { name: /틱톡/ }).click();
await page.locator("dialog.app-sheet[open] .sheet-actions .btn").click();
await page.getByRole("button", { name: "저장", exact: true }).click();
await page.getByText("저장했어요").waitFor({ timeout: 20000 });
await shot("5-settings", true);
check("잠글 앱을 바꿔 저장할 수 있음", true);
check("내 정보에 공용 데모라는 안내가 보임", /같은 공간을 함께 써요/.test(await page.locator("body").innerText()));

// 6. 목표 삭제 (점검 데이터 정리)
console.log("\n[6] 삭제");
if (goalUrl) {
  await page.goto(goalUrl);
  await settle();
  await page.locator(".topbar button.nav-btn").click();
  await page.waitForTimeout(400);
  await shot("6-delete-sheet");
  await page.getByRole("button", { name: "지우기", exact: true }).click();
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
}
} catch (error) {
  check("점검 도중 멈춤", false, String(error?.message ?? error).split(/\r?\n/)[0]);
  await shot("error", true).catch(() => {});
} finally {
  // 도중에 멈췄어도 점검용 목표를 지워 데모를 비워 둔다.
  if (goalUrl) {
    await page.goto(goalUrl).catch(() => {});
    if (await page.locator(".topbar button.nav-btn").count().catch(() => 0)) {
      await page.locator(".topbar button.nav-btn").click();
      await page.getByRole("button", { name: "지우기", exact: true }).click();
      await page.waitForURL(/notice=deleted/, { timeout: 30000 }).catch(() => {});
    }
  }
}
const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} 통과`);
await browser.close();
