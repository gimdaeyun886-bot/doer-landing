// AI 연결 점검. 사용: node scripts/ai-check.mjs [모델 이름...]
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

for (const line of readFileSync(".env.local", "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
  const at = line.indexOf("=");
  if (at > 0) process.env[line.slice(0, at).trim()] = line.slice(at + 1).trim();
}

const client = new OpenAI();
const models = process.argv.slice(2).length ? process.argv.slice(2) : [process.env.OPENAI_MODEL || "gpt-6-luna"];
const brief = (error) => `${error?.status ?? ""} ${String(error?.message ?? error).slice(0, 220)}`;

try {
  const ids = [];
  for await (const model of client.models.list()) ids.push(model.id);
  console.log("models:", ids.filter((id) => /^(gpt|o\d)/.test(id)).sort().join(", "));
} catch (error) {
  console.log("models: 목록을 받지 못함 →", brief(error));
}

const Schema = z.object({ title: z.string(), minutes: z.number(), note: z.string().nullable() });
for (const model of models) {
  try {
    const started = Date.now();
    const response = await client.chat.completions.parse({
      model,
      max_completion_tokens: 2000,
      messages: [{ role: "user", content: "퇴근 후 영어 단어 30분 외우기. 제목과 분으로 정리해 줘" }],
      response_format: zodResponseFormat(Schema, "check"),
    });
    console.log(`[${model}] ok ${Date.now() - started}ms →`, JSON.stringify(response.choices[0].message.parsed), JSON.stringify(response.usage));
  } catch (error) {
    console.log(`[${model}] 실패 →`, brief(error));
  }
}
