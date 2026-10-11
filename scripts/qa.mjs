// CRUD 전체 흐름을 실제 브라우저(Edge)로 점검한다.
// 사용: node scripts/qa.mjs [주소] [스크린샷 폴더]   예: node scripts/qa.mjs http://localhost:3000
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = process.argv[3];
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const open = async (path) => {
  await page.goto(BASE + path);
  await page.waitForLoadState("networkidle");
};
const makePng = () =>
  page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 400;
    const g = c.getContext("2d");
    g.fillStyle = "#fffdf9";
    g.fillRect(0, 0, 640, 400);
    g.fillStyle = "#5649ed";
    g.font = "bold 30px sans-serif";
    g.fillText("QA proof 20/20", 40, 200);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
const TITLE = "QA 임시 할 일";

// 1. 빈 값 제출
await open("/tasks/new");
await page.fill("#due_date", "");
await page.click("button[type=submit]");
await page.waitForSelector(".field-error");
const emptyErrors = await page.locator(".field-error").allTextContents();
check("1 빈 값 제출 시 항목별 오류", emptyErrors.length >= 4, emptyErrors.join(" / "));
await shot("01-empty-errors");

// 2. 잘못된 형식
await page.fill("#title", TITLE);
await page.fill("#goal", "QA");
await page.fill("#due_date", "2026-10-11");
await page.fill("#estimated_minutes", "3");
await page.click("button[type=submit]");
await page.waitForSelector("#estimated_minutes-error:has-text('600분')");
check("2 예상 시간 범위 오류 + 입력값 유지", (await page.textContent("#estimated_minutes-error")).includes("5분에서 600분") && (await page.inputValue("#title")) === TITLE);

// 3. 파일 형식과 크기
await page.setInputFiles("#proof", { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
const pdfMessage = await page.textContent("#proof-error");
await page.setInputFiles("#proof", { name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(3 * 1024 * 1024 + 10) });
const bigMessage = await page.textContent("#proof-error");
check("3 PDF와 3MB 초과 이미지 거부", pdfMessage.includes("JPG, PNG, WEBP") && bigMessage.includes("3MB") && (await page.inputValue("#proof")) === "");

// 4, 7. 이미지 없이 등록 + 연속 클릭
await page.fill("#estimated_minutes", "45");
await page.fill("#memo", "QA 점검용");
await page.evaluate(() => {
  const button = document.querySelector("button[type=submit]");
  button.click();
  button.click();
  button.click();
});
await page.waitForURL(/\/tasks\/[0-9a-f-]{36}\?notice=created/);
const id = new URL(page.url()).pathname.split("/").pop();
check("4 등록 후 상세 이동 + 알림", (await page.textContent(".notice")).includes("등록했어요"));
check("10 이미지 없는 상세: 인증 전 안내", (await page.textContent(".badge")) === "인증 전" && (await page.locator(".proof-empty").count()) === 1);
await shot("02-detail-no-proof");

// 5. 목록 반영
await open(`/tasks?q=${encodeURIComponent(TITLE)}`);
const created = await page.locator(".task-card").count();
check("5 등록 후 목록 반영", created >= 1);
check("7 연속 클릭해도 한 건만 저장", created === 1, `count=${created}`);

// 6. 새로고침
await open(`/tasks/${id}`);
await page.reload();
check("6 새로고침 후 데이터 유지", (await page.textContent("h1")) === TITLE);

// 8. 수정 화면의 기존 값
await page.click(".detail-actions a");
await page.waitForURL(/\/edit$/);
await page.waitForLoadState("networkidle");
check("8 수정 화면에 기존 값 채워짐", (await page.inputValue("#title")) === TITLE && (await page.inputValue("#estimated_minutes")) === "45" && (await page.inputValue("#memo")) === "QA 점검용");

// 9, 11. 수정 + 이미지 업로드
await page.fill("#title", `${TITLE} (수정)`);
await page.fill("#estimated_minutes", "90");
await page.setInputFiles("#proof", { name: "proof.png", mimeType: "image/png", buffer: Buffer.from(await makePng()) });
const previews = await page.locator(".proof-preview img").count();
await page.click("button[type=submit]");
await page.waitForURL(/notice=updated/);
check("9 수정 후 상세 반영", (await page.textContent("h1")) === `${TITLE} (수정)` && (await page.textContent(".detail-facts")).includes("1시간 30분"));
const image = page.locator(".proof-frame img");
await image.waitFor();
const width = await image.evaluate((el) => new Promise((done) => (el.complete ? done(el.naturalWidth) : ((el.onload = () => done(el.naturalWidth)), (el.onerror = () => done(0))))));
check("11 업로드한 이미지가 상세에 보임 + 인증 완료", width === 640 && previews === 1 && (await page.textContent(".badge")) === "인증 완료");
await shot("03-detail-with-proof");
await open(`/tasks?q=${encodeURIComponent(TITLE)}&status=verified`);
check("9 수정 후 목록 반영", (await page.locator(".task-card h2").first().textContent()) === `${TITLE} (수정)`);

// 12. 이미지 삭제
await open(`/tasks/${id}/edit`);
await page.check("input[name=remove_proof]");
await page.click("button[type=submit]");
await page.waitForURL(/notice=updated/);
check("12 이미지 삭제 후 인증 전으로", (await page.textContent(".badge")) === "인증 전" && (await page.locator(".proof-frame").count()) === 0);

// 13. 삭제 취소
await open(`/tasks/${id}`);
await page.click(".detail-actions > button");
await page.waitForSelector("dialog[open]");
await shot("04-delete-dialog");
await page.click("dialog .btn-ghost");
check("13 삭제 취소 시 데이터 유지", (await page.locator("dialog[open]").count()) === 0 && (await page.textContent("h1")).includes(TITLE));

// 14. 삭제
await page.click(".detail-actions > button");
await page.click("dialog button[type=submit]");
await page.waitForURL(/\/tasks\?notice=deleted/);
check("14 삭제 후 목록 이동 + 알림", (await page.textContent(".notice")).includes("삭제했어요"));
await open(`/tasks/${id}`);
check("14 삭제한 항목의 상세는 없음 화면", (await page.textContent("body")).includes("할 일을 찾을 수 없어요"));

// 15. 없는 주소
const missing = [];
for (const path of ["/tasks/abc", "/tasks/00000000-0000-4000-8000-000000000000", "/tasks/abc/edit"]) {
  await open(path);
  if (!(await page.textContent("body")).includes("찾을 수 없어요")) missing.push(path);
}
check("15 없는 상세 주소 안내", missing.length === 0, missing.join(","));

// 17. 페이지네이션
await open("/tasks");
await shot("05-list");
const total = Number((await page.textContent(".result-count")).match(/(\d+)개/)[1]);
const firstPage = await page.locator(".task-card").count();
if (total > 6) {
  await page.click(".pagination > a:last-child");
  await page.waitForURL(/page=2/);
  check("17 6개씩 나뉘고 페이지 이동", firstPage === 6 && (await page.locator(".task-card").count()) === Math.min(6, total - 6), `total=${total}`);
  await open("/tasks?page=99");
  check("17 범위 밖 페이지는 마지막 페이지로", /page=\d+/.test(page.url()) && (await page.locator(".task-card").count()) > 0, page.url().replace(BASE, ""));
} else {
  check("17 6개씩 나뉘고 페이지 이동", false, `데이터가 ${total}건이라 점검 불가 (7건 이상 필요)`);
}

// 18. 검색
await open("/tasks");
await page.fill("#q", "토익");
await page.click(".filters button[type=submit]");
await page.waitForURL(/q=/);
const found = await page.locator(".task-card").allTextContents();
check("18 검색 결과만 표시", found.length > 0 && found.every((text) => text.includes("토익")), `${found.length}건`);
await open(`/tasks?q=${encodeURIComponent("없는검색어zzz")}`);
check("18 결과가 없을 때 빈 상태", (await page.textContent(".empty")).includes("조건에 맞는 할 일이 없어요"));

// 21. 모바일 폭
await page.setViewportSize({ width: 375, height: 812 });
const overflow = [];
const overflows = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
for (const path of ["/tasks", "/tasks/new"]) {
  await open(path);
  if (await overflows()) overflow.push(path);
}
await shot("06-mobile-new");
await open("/tasks");
await shot("07-mobile-list");
await page.click(".task-card");
await page.waitForURL(/\/tasks\/[0-9a-f-]{36}/);
await page.waitForLoadState("networkidle");
if (await overflows()) overflow.push("detail");
await shot("08-mobile-detail");
check("21 375px에서 가로 넘침 없음", overflow.length === 0, overflow.join(","));

// 랜딩 연결
await page.setViewportSize({ width: 1280, height: 900 });
await open("/");
check("랜딩 첫 화면 + 할 일 링크", (await page.title()).includes("Do-er") && (await page.locator('a[href="/tasks"]').count()) >= 1);
check("브라우저 콘솔 오류 없음", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 통과`);
process.exit(failed.length ? 1 : 0);
