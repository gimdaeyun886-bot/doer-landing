// 화면 문구 모으기와 되돌려 넣기. 문장 다듬기 작업용.
//   node scripts/copy-extract.mjs out <폴더>     → <폴더>/01_input.txt, copy-map.json
//   node scripts/copy-extract.mjs in <폴더> <다듬은 파일>  → 바뀐 문구를 소스에 반영
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [mode, dir, revised] = process.argv.slice(2);
const files = [
  ...readdirSync("components").map((name) => join("components", name)),
  ...["app/not-found.tsx", "app/login/page.tsx", "app/settings/page.tsx", "app/privacy/page.tsx", "app/terms/page.tsx", "app/goals/page.tsx", "app/goals/error.tsx", "app/goals/[id]/not-found.tsx", "app/today/page.tsx", "app/goals/actions.ts", "app/auth/actions.ts", "lib/goals.ts"],
].filter((file) => /\.tsx?$/.test(file));

const HANGUL = /[가-힣]/;
function collect(source) {
  const found = new Set();
  const code = source.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  // 따옴표 문자열과 JSX 글자
  for (const match of code.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`|>([^<>{}]+)</g)) {
    const text = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (text.length >= 4 && HANGUL.test(text) && !text.includes("${") ) found.add(text);
    else if (match[2] && HANGUL.test(match[2])) for (const part of match[2].split(/\$\{[^}]*\}/)) if (part.trim().length >= 6 && HANGUL.test(part)) found.add(part.trim());
  }
  return [...found];
}

if (mode === "out") {
  const map = [];
  for (const file of files) for (const text of collect(readFileSync(file, "utf8"))) map.push({ id: map.length + 1, file, text });
  writeFileSync(join(dir, "copy-map.json"), JSON.stringify(map, null, 1));
  writeFileSync(join(dir, "01_input.txt"), map.map((item) => `[${item.id}] ${item.text.replace(/\\n/g, " / ")}`).join("\n") + "\n");
  console.log(`${map.length}개 문구, ${map.reduce((sum, item) => sum + item.text.length, 0)}자`);
} else {
  const map = JSON.parse(readFileSync(join(dir, "copy-map.json"), "utf8"));
  const lines = new Map();
  for (const line of readFileSync(revised, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\[(\d+)\]\s?(.*)$/);
    if (match) lines.set(Number(match[1]), match[2].trim());
  }
  let changed = 0;
  const skipped = [];
  for (const item of map) {
    const next = lines.get(item.id);
    const before = item.text.replace(/\\n/g, " / ");
    if (!next || next === before) continue;
    // 줄바꿈 표시가 있던 문구는 개수가 같을 때만 되돌려 넣는다.
    const breaks = (item.text.match(/\\n/g) ?? []).length;
    if (breaks !== (next.match(/ \/ /g) ?? []).length) { skipped.push(item.id); continue; }
    const value = next.replace(/ \/ /g, "\\n");
    const source = readFileSync(item.file, "utf8");
    if (!source.includes(item.text)) { skipped.push(item.id); continue; }
    writeFileSync(item.file, source.split(item.text).join(value));
    changed++;
    console.log(`[${item.id}] ${item.file}\n  - ${before}\n  + ${next}`);
  }
  console.log(`\n${changed}개 반영, 건너뜀: ${skipped.join(", ") || "없음"}`);
}
