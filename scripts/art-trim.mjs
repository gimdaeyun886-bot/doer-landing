// GPT로 만든 오브제의 투명 여백을 잘라 public/art 에 저장하고 크기를 출력한다.
// 사용: node scripts/art-trim.mjs <이름>=<ART_SRC 폴더 안 파일 이름> ...
//   예: ART_SRC=design-preview/flat ART_VERSION=v3 KEY_WHITE=1 node scripts/art-trim.mjs lock=lock still=still
// KEY_WHITE=1: 흰 바탕으로 만든 평면 그림에서 가장자리와 이어진 흰 바탕을 투명하게 지운다.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const pairs = process.argv.slice(2).map((arg) => arg.split("="));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
for (const [name, src] of pairs) {
  const data = "data:image/png;base64," + readFileSync(`${process.env.ART_SRC ?? "design-preview/concepts"}/${src}.png`).toString("base64");
  const out = await page.evaluate(async ([url, key]) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const pixels = g.getImageData(0, 0, c.width, c.height);
    const { data } = pixels;
    if (key) {
      // 가장자리에서 시작해 흰색에 가까운 칸만 따라가며 지운다. 그림 안의 크림색은 이어져 있지 않으면 남는다.
      const W = c.width, H = c.height, seen = new Uint8Array(W * H), stack = [];
      const light = (i) => 255 - Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
      for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
      // 자물쇠 고리 안쪽처럼 그림에 둘러싸인 흰 바탕도 거의 순백이면 함께 지운다.
      for (let i = 0; i < W * H; i++) if (light(i) < 8) stack.push(i);
      while (stack.length) {
        const i = stack.pop();
        if (seen[i]) continue;
        seen[i] = 1;
        const d = light(i);
        if (d > 40) continue;
        // 경계의 흐린 칸은 흰 정도만큼만 투명하게 남겨 가장자리를 부드럽게 둔다.
        data[i * 4 + 3] = d < 14 ? 0 : Math.round(((d - 14) / 26) * 255);
        const x = i % W, y = (i - x) / W;
        if (x > 0) stack.push(i - 1);
        if (x < W - 1) stack.push(i + 1);
        if (y > 0) stack.push(i - W);
        if (y < H - 1) stack.push(i + W);
      }
      g.putImageData(pixels, 0, 0);
    }
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
  }, [data, process.env.KEY_WHITE === "1"]);
  writeFileSync(`public/art/${name}.${process.env.ART_VERSION ?? "v2"}.png`, Buffer.from(out.url.split(",")[1], "base64"));
  console.log(`  ${JSON.stringify(name)}: { w: ${out.w}, h: ${out.h} },`);
}
await browser.close();
