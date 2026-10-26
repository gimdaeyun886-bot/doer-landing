// GPT로 만든 오브제의 투명 여백을 잘라 public/art 에 저장하고 크기를 출력한다.
// 사용: node scripts/art-trim.mjs <이름>=<design-preview/concepts 안 파일 이름> ...
//   예: node scripts/art-trim.mjs lock=obj-lock still=obj-still2
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const pairs = process.argv.slice(2).map((arg) => arg.split("="));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
for (const [name, src] of pairs) {
  const data = "data:image/png;base64," + readFileSync(`design-preview/concepts/${src}.png`).toString("base64");
  const out = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const { data } = g.getImageData(0, 0, c.width, c.height);
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (data[(y * c.width + x) * 4 + 3] > 12) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
    x0 = Math.max(0, x0 - pad);
    y0 = Math.max(0, y0 - pad);
    x1 = Math.min(c.width - 1, x1 + pad);
    y1 = Math.min(c.height - 1, y1 + pad);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const scale = Math.min(1, 720 / Math.max(w, h));
    const o = document.createElement("canvas");
    o.width = Math.round(w * scale);
    o.height = Math.round(h * scale);
    o.getContext("2d").drawImage(c, x0, y0, w, h, 0, 0, o.width, o.height);
    return { url: o.toDataURL("image/png"), w: o.width, h: o.height };
  }, data);
  writeFileSync(`public/art/${name}.${process.env.ART_VERSION ?? "v2"}.png`, Buffer.from(out.url.split(",")[1], "base64"));
  console.log(`  ${JSON.stringify(name)}: { w: ${out.w}, h: ${out.h} },`);
}
await browser.close();
