// GPT 이미지 생성. 사용: node scripts/imagegen.mjs <프롬프트 파일> <저장 경로.png> [크기] [모델]
// 크기 예: 1024x1536(세로 화면), 1024x1024. 배경을 투명하게 하려면 IMAGE_BG=transparent, 참고 그림은 IMAGE_REF. 키와 주소는 .env.local 의 OPENAI_API_KEY, OPENAI_BASE_URL 을 쓴다.
import { readFileSync, writeFileSync } from "node:fs";
import OpenAI, { toFile } from "openai";

for (const line of readFileSync(".env.local", "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
  const at = line.indexOf("=");
  if (at > 0) process.env[line.slice(0, at).trim()] = line.slice(at + 1).trim();
}

const [promptFile, out, size = "1024x1536", model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"] = process.argv.slice(2);
const prompt = readFileSync(promptFile, "utf8");
const started = Date.now();
const client = new OpenAI({ timeout: 240_000, maxRetries: 1 });
const background = process.env.IMAGE_BG;
// IMAGE_REF=<그림 파일> 을 주면 그 그림을 참고해 새로 그린다(모양을 맞출 때).
const ref = process.env.IMAGE_REF;
const extra = background ? { background, output_format: "png" } : {};
const result = ref
  ? await client.images.edit({ model, prompt, size, n: 1, quality: "high", image: await toFile(readFileSync(ref), "ref.png", { type: "image/png" }), ...extra })
  : await client.images.generate({ model, prompt, size, n: 1, quality: "high", ...extra });
const image = result.data?.[0];
if (image?.b64_json) writeFileSync(out, Buffer.from(image.b64_json, "base64"));
else if (image?.url) writeFileSync(out, Buffer.from(await (await fetch(image.url)).arrayBuffer()));
else throw new Error("이미지를 받지 못했어요");
console.log(`${out} · ${model} · ${Math.round((Date.now() - started) / 1000)}초`);
