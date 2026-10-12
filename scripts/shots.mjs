// 디자인 확인용 캡처. 사용: node scripts/shots.mjs [주소] [저장 폴더]
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "design-preview/app";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error).slice(0, 300)));
const shot = (name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
const open = async (path) => {
  await page.goto(BASE + path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
};

await open("/goals/preview/today");
await shot("1-today");
await page.click("button.btn-primary");
await page.waitForTimeout(600);
await shot("2-start-sheet");

await open("/goals/preview");
await shot("3-goals", true);

await open("/goals/preview/sample-dated");
await shot("4-detail", true);
await page.click(".topbar button.nav-btn");
await page.waitForTimeout(600);
await shot("5-delete-sheet");

await open("/goals/preview/sample-failed");
await shot("6-detail-noplan");

await page.evaluate(() => localStorage.clear());
await open("/goals/new");
await shot("7-chat-first");
await page.fill("#say", "11월 15일에 정보처리기사 실기야. 퇴근하고 한 시간쯤 할 수 있어");
await shot("8-chat-typed");
await page.keyboard.press("Enter");
await page.waitForSelector(".coach-say", { timeout: 30000 });
await page.waitForTimeout(700);
await shot("9-chat-reply");

await page.click(".quick .btn");
await page.waitForSelector(".sheet-list");
await page.waitForTimeout(700);
await shot("10-confirm", true);
await page.click(".dock .btn");
await page.waitForSelector(".row-error");
await page.waitForTimeout(400);
await shot("11-confirm-errors", true);

console.log(errors.length ? errors.join("\n") : "no page errors");
await browser.close();
