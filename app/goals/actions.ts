"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  LIMITS,
  MATERIAL_BUCKET,
  MATERIAL_TYPES,
  addDays,
  cleanLockTargets,
  dedupeFacts,
  isKind,
  isRealDate,
  isUuid,
  materialError,
  planEnd,
  readValues,
  tasksOn,
  needsNewDate,
  todayInSeoul,
  validateValues,
  verifyTypeOf,
  type AdjustOption,
  type FormState,
  type Goal,
  type GoalValues,
  type Plan,
} from "@/lib/goals";
import { EMPTY_SLOTS, coachTurn, generatePlan, judgeAnswer, makeQuiz, readMaterial, suggestAdjustments, suggestRecovery, toDataUrl, verifyProof, type ChatMessage, type Slots, type TurnResult } from "@/lib/plan";
import { applyPick, basicOptions, checkPick, describePick, repairDate, room, slotsFor } from "@/lib/recover";
import { getSupabase, goalColumns, hasContext, getUser, isConfigured, listPlannedGoals, lockedNow, purgeGoals, recoveryState, saveSettings } from "@/lib/supabase";

const NOT_CONFIGURED = "저장소가 아직 연결되지 않았어요. 환경 변수를 확인해 주세요.";
const NEED_LOGIN = "로그인이 풀렸어요. 다시 로그인해 주세요.";
const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const UPLOAD_FAILED = "사진을 올리지 못했어요. 사진을 빼고 저장하거나 잠시 후 다시 시도해 주세요.";
const INVALID = "표시한 곳을 다시 확인해 주세요.";
// 잠긴 동안 할 일이나 잠글 앱을 바꾸면 잠금이 바로 풀리므로 막는다. 버거운 날의 길은 코치와의 조정이다.
const LOCKED = "잠금 중에는 할 수 없어요. 오늘 할 일을 모두 인증하거나, 버거우면 코치와 조정한 뒤에 해 주세요.";
// 인증 사진 원본은 이의 제기를 받을 수 있는 동안만 둔다.
const PROOF_KEEP_DAYS = 7;

function pickFile(formData: FormData, name: string) {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

// 파일은 "사용자 id/종류/이름" 경로에 둔다. 저장소 정책이 첫 폴더로 주인을 가린다.
async function upload(file: File, folder: "materials" | "proofs") {
  const user = await getUser();
  if (!user) return null;
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${MATERIAL_TYPES[file.type]}`;
  const { error } = await (await getSupabase()).storage.from(MATERIAL_BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    console.error("upload failed:", error.message);
    return null;
  }
  return path;
}

async function removeFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((path): path is string => Boolean(path));
  if (!list.length) return;
  const { error } = await (await getSupabase()).storage.from(MATERIAL_BUCKET).remove(list);
  if (error) console.error("file remove failed:", error.message);
}

// 계획이 바뀌면 오늘부터의 인증은 새 할 일과 맞지 않으므로 지운다. 지난 날의 기록은 남긴다.
async function clearProofs(goalId: string, from?: string) {
  let query = (await getSupabase()).from("proofs").delete().eq("goal_id", goalId);
  if (from) query = query.gte("date", from);
  const { data, error } = await query.select("image_path");
  if (error) console.error("proof clear failed:", error.message);
  await removeFiles((data ?? []).map((row) => row.image_path as string | null));
}

// 계획을 만들어 목표에 저장한다. 실패해도 목표는 남고, 상세 화면에서 다시 만들 수 있다.
// 지난 날의 계획은 그대로 둔다(기록과 연속 기록이 그 날의 할 일로 계산된다). 오늘 이미 인증한 것이 있으면 오늘 몫도 그대로 둔다.
async function planAndSave(goal: Goal) {
  const result = await generatePlan(goal);
  if (result.ok) {
    const today = todayInSeoul();
    const { data: todayProofs } = await (await getSupabase()).from("proofs").select("task_id").eq("goal_id", goal.id).eq("date", today).limit(1);
    const keepToday = Boolean(todayProofs?.length);
    const old = (goal.plan?.days ?? []).filter((day) => day.date < today || (keepToday && day.date === today));
    const fresh = result.plan.days.filter((day) => day.date > today || (!keepToday && day.date === today));
    result.plan.days = [...old, ...fresh].sort((a, b) => a.date.localeCompare(b.date));
    if (!keepToday) await clearProofs(goal.id, today);
  }
  const patch = result.ok ? { plan: result.plan, plan_status: "ready", plan_generated_at: new Date().toISOString() } : { plan_status: "failed" };
  const { error } = await (await getSupabase()).from("goals").update(patch).eq("id", goal.id);
  if (error) console.error("plan save failed:", error.message);
  return result.ok && !error ? null : result.ok ? "만든 계획을 저장하지 못했어요. 다시 시도해 주세요." : result.message;
}

function check(formData: FormData) {
  const values = readValues(formData);
  const errors = validateValues(values);
  const file = pickFile(formData, "material");
  const fileError = file && materialError(file);
  if (fileError) errors.material = fileError;
  return { values, errors, file, invalid: Object.keys(errors).length > 0 };
}

const toRow = async (values: GoalValues, materialPath: string | null, materialSummary: string | null) => ({
  title: values.title,
  kind: values.kind,
  deadline: values.kind === "dated" ? values.deadline : null,
  daily_minutes: Number(values.daily_minutes),
  schedule: values.schedule || null,
  note: values.note || null,
  ...((await hasContext()) ? { context: values.context || null } : {}),
  material_path: materialPath,
  material_summary: materialSummary,
});

// 브라우저가 돌려보낸 대화 상태를 믿지 않고 형태를 다시 맞춘다.
function cleanSlots(raw: Slots): Slots {
  const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);
  const kind = isKind(raw?.kind) ? raw.kind : null;
  const deadline = text(raw?.deadline, 10);
  const minutes = Number(raw?.daily_minutes);
  return {
    ...EMPTY_SLOTS,
    title: text(raw?.title, LIMITS.title),
    kind,
    deadline: kind === "dated" && deadline && isRealDate(deadline) ? deadline : null,
    schedule: text(raw?.schedule, LIMITS.schedule),
    daily_minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
    note: text(raw?.note, LIMITS.note),
    facts: Array.isArray(raw?.facts) ? dedupeFacts(raw.facts.map((fact) => String(fact).trim().slice(0, 100))).slice(0, LIMITS.facts) : [],
    material_summary: text(raw?.material_summary, LIMITS.summary),
    lock_targets: Array.isArray(raw?.lock_targets) ? cleanLockTargets(raw.lock_targets.map(String)) : null,
  };
}

// 코치와의 대화 한 차례. 사용자의 말에서 목표를 알아듣고 다음 질문을 돌려준다. 사진을 함께 보내면 코치가 먼저 읽는다.
export async function askCoach(history: ChatMessage[], rawSlots: Slots, photo?: FormData): Promise<TurnResult> {
  if (!isConfigured()) return { ok: false, message: NOT_CONFIGURED };
  if (!(await getUser())) return { ok: false, message: NEED_LOGIN };
  const slots = cleanSlots(rawSlots);
  const file = photo instanceof FormData ? pickFile(photo, "material") : null;
  if (file && !materialError(file)) slots.material_summary = (await readMaterial(await toDataUrl(file))) ?? "(사진을 받았지만 글자를 읽지 못했어요)";
  const safe = (Array.isArray(history) ? history : [])
    .filter((message) => (message?.role === "user" || message?.role === "coach") && typeof message.text === "string")
    .slice(-24)
    .map((message) => ({ role: message.role, text: message.text.slice(0, 500) }));
  if (!safe.length || safe[safe.length - 1].role !== "user") return { ok: false, message: "다시 말해 주세요." };
  return coachTurn(safe, slots);
}

export async function createGoal(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = prev.attempt + 1;
  const { values, errors, file, invalid } = check(formData);
  if (invalid) return { attempt, errors, values, message: INVALID };
  if (!isConfigured()) return { attempt, values, message: NOT_CONFIGURED };
  if (!(await getUser())) return { attempt, values, message: NEED_LOGIN };

  const materialPath = file ? await upload(file, "materials") : null;
  if (file && !materialPath) return { attempt, values, errors: { material: UPLOAD_FAILED }, message: UPLOAD_FAILED };

  // 대화에서 이미 읽은 내용이 없으면(직접 적은 경우) 여기서 사진을 읽는다.
  // 사진 없이 대화를 이어 온 경우에도, 코치가 전에 읽어 둔 내용은 계획에 쓴다.
  const summary = file ? values.material_summary || (await readMaterial(await toDataUrl(file))) : values.material_summary || null;
  const { data, error } = await (await getSupabase()).from("goals").insert(await toRow(values, materialPath, summary)).select(await goalColumns()).single();
  if (error || !data) {
    console.error("goal insert failed:", error?.message);
    await removeFiles([materialPath]);
    return { attempt, values, message: SAVE_FAILED };
  }

  const goal = data as unknown as Goal;
  // 잠긴 동안에는 잠글 앱을 바꾸지 않는다. 새 목표의 할 일은 더해지기만 하므로 막지 않는다.
  if (!(await lockedNow())) await saveSettings({ lock_targets: values.lock_targets });
  const planProblem = await planAndSave(goal);
  revalidatePath("/goals");
  revalidatePath("/today");
  redirect(`/goals/${goal.id}?notice=${planProblem ? "created-noplan" : "created"}`);
}

export async function updateGoal(id: string, prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = prev.attempt + 1;
  const { values, errors, file, invalid } = check(formData);
  if (invalid) return { attempt, errors, values, message: INVALID };
  if (!isConfigured()) return { attempt, values, message: NOT_CONFIGURED };
  if (!isUuid(id)) return { attempt, values, message: "고칠 목표를 찾지 못했어요." };
  if (await lockedNow()) return { attempt, values, message: LOCKED };

  const supabase = await getSupabase();
  const { data: before, error: readError } = await supabase.from("goals").select(await goalColumns()).eq("id", id).is("deleted_at", null).maybeSingle();
  if (readError) return { attempt, values, message: SAVE_FAILED };
  if (!before) return { attempt, values, message: "이미 지운 목표예요. 목록으로 돌아가 주세요." };
  const current = before as unknown as Goal;

  const newPath = file ? await upload(file, "materials") : null;
  if (file && !newPath) return { attempt, values, errors: { material: UPLOAD_FAILED }, message: UPLOAD_FAILED };
  const materialPath = newPath ?? (formData.get("remove_material") === "on" ? null : current.material_path);

  const summary = file ? await readMaterial(await toDataUrl(file)) : formData.get("remove_material") === "on" ? null : current.material_summary;
  const { data, error } = await supabase.from("goals").update(await toRow(values, materialPath, summary)).eq("id", id).is("deleted_at", null).select(await goalColumns()).maybeSingle();
  if (error || !data) {
    console.error("goal update failed:", error?.message);
    await removeFiles([newPath]);
    return { attempt, values, message: SAVE_FAILED };
  }
  if (current.material_path && current.material_path !== materialPath) await removeFiles([current.material_path]);

  // 계획에 영향을 주는 값이 바뀌었거나 계획이 없으면 코치가 다시 짠다.
  const goal = data as unknown as Goal;
  const changed =
    goal.title !== current.title ||
    goal.kind !== current.kind ||
    goal.deadline !== current.deadline ||
    goal.daily_minutes !== current.daily_minutes ||
    goal.schedule !== current.schedule ||
    goal.note !== current.note ||
    goal.context !== current.context ||
    goal.material_path !== current.material_path;
  let notice = "updated";
  if (changed || goal.plan_status !== "ready" || !goal.plan?.days) notice = (await planAndSave(goal)) ? "updated-noplan" : "replanned";

  revalidatePath("/goals");
  revalidatePath("/today");
  redirect(`/goals/${id}?notice=${notice}`);
}

export async function regeneratePlan(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: "목표를 찾지 못했어요." };
  if (await lockedNow()) return { message: LOCKED };
  const { data, error } = await (await getSupabase()).from("goals").select(await goalColumns()).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error || !data) return { message: "목표를 찾지 못했어요." };
  // 목표일이 지난 날짜 있는 목표는 새 날짜를 정해야 짤 수 있다(목표 고치기에서 날짜를 바꾸면 다시 짠다).
  if (needsNewDate(data as unknown as Goal, todayInSeoul())) return { message: "목표일이 지났어요. 목표 고치기에서 새 날짜를 정하면 다시 짜요." };

  const problem = await planAndSave(data as unknown as Goal);
  revalidatePath("/goals");
  revalidatePath("/today");
  if (problem) return { message: problem };
  redirect(`/goals/${id}?notice=replanned`);
}

// 지우면 휴지통으로 옮긴다. 30일 안에는 되살릴 수 있고, 그 뒤에는 lib/supabase.ts의 sweepGoals가 완전히 지운다.
// 잠금 중에는 막는다. 오늘 할 일이 든 목표를 치우면 잠금이 바로 풀리기 때문이다.
export async function deleteGoal(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: "지울 목표를 찾지 못했어요." };
  if (await lockedNow()) return { message: LOCKED };

  const { error } = await (await getSupabase()).from("goals").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null);
  if (error) {
    console.error("goal trash failed:", error.message);
    return { message: "지우지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/goals");
  revalidatePath("/today");
  redirect("/goals?notice=deleted");
}

// 휴지통에서 되살린다. 계획과 인증 기록은 지울 때 그대로 남아 있다.
export async function restoreGoal(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: "되살릴 목표를 찾지 못했어요." };
  const { data, error } = await (await getSupabase()).from("goals").update({ deleted_at: null }).eq("id", id).not("deleted_at", "is", null).select("id").maybeSingle();
  if (error || !data) {
    if (error) console.error("goal restore failed:", error.message);
    return { message: "되살리지 못했어요. 이미 완전히 지워졌을 수 있어요." };
  }
  revalidatePath("/goals");
  revalidatePath("/today");
  redirect(`/goals/${id}?notice=restored`);
}

// 휴지통에 든 목표를 30일을 기다리지 않고 바로 완전히 지운다. 되돌릴 수 없다.
export async function purgeGoal(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: "지울 목표를 찾지 못했어요." };
  const { data } = await (await getSupabase()).from("goals").select("id").eq("id", id).not("deleted_at", "is", null).maybeSingle();
  if (!data) return { message: "휴지통에서 찾지 못했어요. 이미 지워졌을 수 있어요." };
  if (!(await purgeGoals([id]))) return { message: "지우지 못했어요. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/goals");
  revalidatePath("/goals/trash");
  redirect("/goals/trash?notice=purged");
}

/* ───────── 오늘: 시작, 인증, 이의 제기, 조정 ───────── */

// 오늘 할 일과 인증 방법, 잠글 앱을 확인하고 시작한다. 이때부터 모두 인증할 때까지 잠금이 걸린다.
export async function startToday(): Promise<{ ok: boolean }> {
  if (!isConfigured() || !(await getUser())) return { ok: false };
  const ok = await saveSettings({ lock_date: todayInSeoul() });
  revalidatePath("/today");
  return { ok };
}

export async function saveLocks(_prev: { message?: string; saved?: boolean }, formData: FormData): Promise<{ message?: string; saved?: boolean }> {
  if (!isConfigured() || !(await getUser())) return { message: NEED_LOGIN };
  if (await lockedNow()) return { message: LOCKED };
  const ok = await saveSettings({ lock_targets: formData.getAll("lock").map(String) });
  revalidatePath("/today");
  revalidatePath("/settings");
  revalidatePath("/settings/locks");
  return ok ? { saved: true } : { message: SAVE_FAILED };
}

async function loadTodayTask(goalId: string, taskId: string) {
  if (!isUuid(goalId)) return null;
  const { data } = await (await getSupabase()).from("goals").select(await goalColumns()).eq("id", goalId).is("deleted_at", null).maybeSingle();
  const goal = data as unknown as Goal | null;
  const task = goal ? tasksOn(goal, todayInSeoul()).find((item) => item.id === taskId) : null;
  return goal && task ? { goal, task } : null;
}

// 퀴즈 인증: 코치가 오늘 한 내용에서 문제 세 개를 낸다.
export async function startQuiz(goalId: string, taskId: string): Promise<{ questions?: string[]; message?: string }> {
  if (!isConfigured() || !(await getUser())) return { message: NEED_LOGIN };
  const found = await loadTodayTask(goalId, taskId);
  if (!found) return { message: "오늘 할 일에서만 인증할 수 있어요. 화면을 새로 고쳐 주세요." };
  const quiz = await makeQuiz(found.goal, found.task);
  return quiz.ok ? { questions: quiz.questions } : { message: quiz.message };
}

export type VerifyState = { attempt: number; passed?: boolean; reason?: string; message?: string };

// 오늘 할 일 하나를 인증한다. 방식(사진·퀴즈·글)은 코치가 과제마다 골라 둔 것을 따른다.
export async function verifyTask(goalId: string, taskId: string, prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const attempt = prev.attempt + 1;
  if (!isConfigured()) return { attempt, message: NOT_CONFIGURED };
  if (!(await getUser())) return { attempt, message: NEED_LOGIN };
  const found = await loadTodayTask(goalId, taskId);
  if (!found) return { attempt, message: "오늘 할 일에서만 인증할 수 있어요. 화면을 새로 고쳐 주세요." };
  const { goal, task } = found;
  const kind = verifyTypeOf(task);
  const supabase = await getSupabase();
  const today = todayInSeoul();

  let verdict;
  let imagePath: string | null = null;
  let answer: string | null = null;
  if (kind === "photo") {
    const file = pickFile(formData, "proof");
    if (!file) return { attempt, message: "인증할 사진을 골라 주세요." };
    const fileProblem = materialError(file);
    if (fileProblem) return { attempt, message: fileProblem };
    verdict = await verifyProof(goal, task, await toDataUrl(file));
    if (verdict.ok) imagePath = await upload(file, "proofs");
  } else if (kind === "quiz") {
    const questions = formData.getAll("question").map((value) => String(value).slice(0, 200));
    const answers = formData.getAll("answer").map((value) => String(value).trim().slice(0, 400));
    if (questions.length !== 3 || answers.length !== 3 || answers.some((text) => !text)) return { attempt, message: "세 문제 모두 답을 적어 주세요." };
    answer = questions.map((question, index) => `문제 ${index + 1}. ${question}\n답: ${answers[index]}`).join("\n\n");
    verdict = await judgeAnswer(goal, task, "quiz", answer);
  } else {
    answer = String(formData.get("text") ?? "").trim().slice(0, LIMITS.proofText);
    if (answer.length < 40) return { attempt, message: "조금만 더 자세히 적어 주세요. 40자 이상이면 돼요." };
    verdict = await judgeAnswer(goal, task, "write", answer);
  }
  if (!verdict.ok) return { attempt, message: verdict.message };

  const { data: before } = await supabase.from("proofs").select("image_path").eq("goal_id", goal.id).eq("task_id", task.id).maybeSingle();
  const { error } = await supabase
    .from("proofs")
    .upsert({ goal_id: goal.id, task_id: task.id, date: today, kind, passed: verdict.passed, reason: verdict.reason, image_path: imagePath, answer, appeal: null, appealed_at: null, created_at: new Date().toISOString() }, { onConflict: "goal_id,task_id" });
  if (error) {
    console.error("proof save failed:", error.message);
    await removeFiles([imagePath]);
    return { attempt, message: "인증 결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await removeFiles([before?.image_path as string | null | undefined]);

  // 보관 기간이 지난 사진 원본을 지운다.
  const cutoff = addDays(today, -PROOF_KEEP_DAYS);
  const { data: old } = await supabase.from("proofs").update({ image_path: null }).lt("date", cutoff).not("image_path", "is", null).select("image_path");
  // update가 돌려주는 값은 바뀐 뒤의 값이라, 지울 경로는 따로 읽어 둔 것이 없으면 폴더에서 찾는다.
  if (old?.length) await purgeOldProofFiles(cutoff);

  revalidatePath("/today");
  revalidatePath(`/goals/${goal.id}`);
  return { attempt, passed: verdict.passed, reason: verdict.reason };
}

// 기록에 더는 연결되지 않은 인증 사진 파일을 지운다.
async function purgeOldProofFiles(cutoff: string) {
  const user = await getUser();
  if (!user) return;
  const supabase = await getSupabase();
  const folder = `${user.id}/proofs`;
  const [{ data: files }, { data: kept }] = await Promise.all([supabase.storage.from(MATERIAL_BUCKET).list(folder, { limit: 1000 }), supabase.from("proofs").select("image_path").not("image_path", "is", null)]);
  const keep = new Set((kept ?? []).map((row) => row.image_path as string));
  const stale = (files ?? []).filter((file) => !keep.has(`${folder}/${file.name}`) && (file.created_at ?? "") < `${cutoff}T00:00:00`).map((file) => `${folder}/${file.name}`);
  await removeFiles(stale);
}

// 코치의 판정이 틀렸다고 생각할 때. 운영자가 직접 확인할 수 있게 사유를 남긴다.
export async function appealProof(goalId: string, taskId: string, _prev: { message?: string; sent?: boolean }, formData: FormData): Promise<{ message?: string; sent?: boolean }> {
  if (!isConfigured() || !(await getUser())) return { message: NEED_LOGIN };
  const text = String(formData.get("appeal") ?? "").trim().slice(0, LIMITS.appeal);
  if (text.length < 5) return { message: "어떤 점이 틀렸는지 한 줄만 적어 주세요." };
  if (!isUuid(goalId)) return { message: "기록을 찾지 못했어요." };
  const { data, error } = await (await getSupabase()).from("proofs").update({ appeal: text, appealed_at: new Date().toISOString() }).eq("goal_id", goalId).eq("task_id", taskId).eq("passed", false).select("task_id");
  if (error || !data?.length) return { message: "보내지 못했어요. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/today");
  return { sent: true };
}

export type AdjustState = { reply?: string; options?: AdjustOption[]; message?: string };

// 버거운 날: 사정을 말하면 코치가 조정안과 그 대가를 보여 준다. 고르기 전에는 아무것도 바뀌지 않는다.
export async function requestAdjustment(reason: string): Promise<AdjustState> {
  if (!isConfigured() || !(await getUser())) return { message: NEED_LOGIN };
  const text = String(reason ?? "").trim().slice(0, LIMITS.reason);
  if (text.length < 4) return { message: "어떤 사정인지 한 줄만 알려 주세요." };
  const today = todayInSeoul();
  const [goals, { data: proofs }] = await Promise.all([listPlannedGoals(), (await getSupabase()).from("proofs").select("goal_id,task_id,passed").eq("date", today)]);
  const passed = new Set((proofs ?? []).filter((proof) => proof.passed).map((proof) => `${proof.goal_id}:${proof.task_id}`));
  const input = goals
    .map((goal) => ({
      goal,
      today: tasksOn(goal, today).filter((task) => !passed.has(`${goal.id}:${task.id}`)),
      upcoming: (goal.plan?.days ?? []).filter((day) => day.date > today && day.date <= addDays(today, 7)),
    }))
    .filter((item) => item.today.length);
  if (!input.length) return { message: "오늘 남은 할 일이 없어요." };
  const result = await suggestAdjustments(input, text);
  if (!result.ok) return { message: result.message };
  // 코치가 돌려준 안에서 실제 오늘 할 일을 가리키는 것만 남긴다.
  const known = new Set(input.flatMap((item) => item.today.map((task) => `${item.goal.id}:${task.id}`)));
  const real = (entry: { goal_id: string; task_id: string }) => known.has(`${entry.goal_id}:${entry.task_id}`);
  // 옮겨 받는 날이 하루 분량 상한(놓친 날 정리와 같은 값)을 넘는 안은 버린다.
  const fits = (option: AdjustOption) => {
    const added = new Map<string, number>();
    return option.moves.every((move) => {
      const goal = goals.find((item) => item.id === move.goal_id);
      const task = goal && tasksOn(goal, today).find((item) => item.id === move.task_id);
      if (!goal || !task) return false;
      const key = `${goal.id}|${move.to_date}`;
      const sum = (added.get(key) ?? 0) + task.minutes;
      added.set(key, sum);
      return sum <= room(goal, String(move.to_date));
    });
  };
  const cleaned = result.options
    .map((option) => ({ ...option, moves: option.moves.filter(real), drops: option.drops.filter(real) }))
    .filter((option) => (option.moves.length || option.drops.length) && fits(option));
  // 오늘 할 일을 모두 비우는 안은 그날 잠금을 푸는 것과 같다. 지시문만 믿지 않고 여기서 막는다.
  // 남은 과제가 둘 이상이면 그런 안은 하나까지만, 오늘 무언가 남는 안들 뒤에 둔다.
  // 남은 과제가 하나뿐이면 어떤 조정이든 오늘을 비우게 되므로, 대가를 보여 주는 조건으로 그대로 둔다.
  const empties = (option: AdjustOption) => option.moves.length + option.drops.length >= known.size;
  const options = known.size > 1 ? [...cleaned.filter((option) => !empties(option)), ...cleaned.filter(empties).slice(0, 1)] : cleaned;
  return options.length ? { reply: result.reply, options } : { message: "코치가 쓸 만한 조정안을 찾지 못했어요. 사정을 조금 더 자세히 말해 주세요." };
}

// 고른 조정안을 계획에 적용한다. 받은 값은 믿지 않고, 실제 오늘 할 일과 계획 범위에 맞는 것만 반영한다.
export async function applyAdjustment(reason: string, option: AdjustOption): Promise<{ ok: boolean; message?: string }> {
  if (!isConfigured() || !(await getUser())) return { ok: false, message: NEED_LOGIN };
  const today = todayInSeoul();
  const supabase = await getSupabase();
  const goals = await listPlannedGoals();
  const moves = Array.isArray(option?.moves) ? option.moves : [];
  const drops = Array.isArray(option?.drops) ? option.drops : [];
  let changed = 0;

  for (const goal of goals) {
    const plan = structuredClone(goal.plan) as Plan;
    const todayDay = plan.days.find((day) => day.date === today);
    if (!todayDay) continue;
    const end = planEnd(plan) ?? today;
    let touched = false;
    for (const move of moves.filter((item) => item?.goal_id === goal.id)) {
      const index = todayDay.tasks.findIndex((task) => task.id === move.task_id);
      const to = String(move.to_date);
      // 매주 반복하는 목표는 옮기지 않고 빼기만 한다. 옮길 날은 내일부터 계획이 끝나는 날(날짜 없는 목표는 그 뒤 7일)까지.
      const limit = goal.kind === "finish" ? addDays(end, 7) : end;
      // 놓친 날에서 옮겨 온 일은 다시 옮기지 않는다(미루기를 되풀이하지 않게).
      if (index < 0 || goal.kind === "ongoing" || todayDay.tasks[index].carried || !isRealDate(to) || to <= today || to > limit) continue;
      if (todayDay.tasks[index].minutes > room({ ...goal, plan }, to)) continue;
      const [task] = todayDay.tasks.splice(index, 1);
      let target = plan.days.find((day) => day.date === to);
      if (!target) {
        target = { date: to, tasks: [] };
        plan.days.push(target);
        plan.days.sort((a, b) => a.date.localeCompare(b.date));
        const last = plan.weeks[plan.weeks.length - 1];
        if (last && to > last.end) last.end = to;
      }
      target.tasks.push({ ...task, id: `${to}-m${target.tasks.length + 1}-${task.id.slice(-1)}` });
      touched = true;
    }
    for (const drop of drops.filter((item) => item?.goal_id === goal.id)) {
      const index = todayDay.tasks.findIndex((task) => task.id === drop.task_id);
      if (index < 0) continue;
      todayDay.tasks.splice(index, 1);
      touched = true;
    }
    if (!touched) continue;
    const { error } = await supabase.from("goals").update({ plan }).eq("id", goal.id);
    if (error) {
      console.error("adjust save failed:", error.message);
      return { ok: false, message: SAVE_FAILED };
    }
    changed++;
  }
  if (!changed) return { ok: false, message: "적용할 수 있는 내용이 없었어요. 다시 말해 주세요." };

  await supabase.from("adjustments").insert({ date: today, reason: String(reason ?? "").slice(0, LIMITS.reason), choice: String(option.label ?? "").slice(0, 40), impact: String(option.impact ?? "").slice(0, 200) });
  // 오늘 화면은 사용자가 결과를 확인한 뒤 브라우저 쪽에서 새로 그린다. 여기서 다시 그리면 결과 창이 먼저 사라진다.
  revalidatePath("/goals");
  return { ok: true };
}

/* ───────── 놓친 날 이어 가기 ───────── */

export type RecoverOption = AdjustOption & { source: "basic" | "coach" };
export type RecoverState = { reply?: string; options?: RecoverOption[]; message?: string; fallback?: boolean };
const NOT_READY = "이 기능을 쓰려면 저장소 설정을 한 번 더 해야 해요. 운영자에게 알려 주세요.";

// 지난 며칠 동안 못 한 일을 어떻게 할지 안을 보여 준다. 고르기 전에는 아무것도 바뀌지 않는다.
// 기본안(나눠 넣기, 넘기기)은 코드가 늘 만든다. 사정을 말하면 코치가 무엇을 살릴지 고른 안을 그 위에 더한다.
export async function requestRecovery(reason: string): Promise<RecoverState> {
  if (!isConfigured() || !(await getUser())) return { message: NEED_LOGIN };
  const text = String(reason ?? "").trim().slice(0, LIMITS.reason);
  const { ready, ctx, repairOk } = await recoveryState();
  if (!ready) return { message: NOT_READY };
  if (!ctx.missed.length) return { message: "정리할 놓친 일이 없어요." };
  const basic: RecoverOption[] = basicOptions(ctx, repairOk).map((option) => ({ ...option, source: "basic" }));
  const slots = slotsFor(ctx);
  // 사정을 말하지 않았거나, 옮겨 넣을 날이 없으면 코치를 부르지 않는다.
  if (!text || !slots.length) return { reply: slots.length ? "이렇게 정리할 수 있어요." : "옮겨 넣을 수 있는 날이 없어서, 이번엔 넘기는 방법만 있어요.", options: basic };
  const result = await suggestRecovery({ missed: ctx.missed, slots }, text);
  if (!result.ok) return { reply: `${result.message} 기본 방법으로 정리할 수 있어요.`, options: basic, fallback: true };
  const same = (a: { moves: { goal_id: string; task_id: string; to_date: string }[] }, b: { moves: { goal_id: string; task_id: string; to_date: string }[] }) =>
    a.moves.map((m) => `${m.goal_id}:${m.task_id}:${m.to_date}`).sort().join() === b.moves.map((m) => `${m.goal_id}:${m.task_id}:${m.to_date}`).sort().join();
  const coach: RecoverOption[] = [];
  for (const option of result.options) {
    const pick = checkPick(option, ctx);
    // 규칙에 어긋나거나 기본안과 같은 안은 버린다.
    if (!pick || !pick.moves.length || [...basic, ...coach].some((other) => same(other, pick))) continue;
    coach.push({ label: option.label, impact: `${option.why ? `${option.why} ` : ""}${describePick(pick, ctx, repairOk)}`.slice(0, 280), ...pick, source: "coach" });
  }
  return { reply: result.reply || "이렇게 정리할 수 있어요.", options: [...coach, ...basic] };
}

// 고른 안을 반영한다. 받은 안은 믿지 않고 지금의 놓친 일과 규칙으로 다시 검사한 뒤, 대가 설명도 서버에서 다시 쓴다.
// 같은 날을 두 번 정리하지 않도록 정리 기록(adjustments, kind='recover')을 먼저 남기고 계획을 바꾼다.
export async function applyRecovery(reason: string, option: RecoverOption): Promise<{ ok: boolean; message?: string; impact?: string }> {
  if (!isConfigured() || !(await getUser())) return { ok: false, message: NEED_LOGIN };
  const { ready, ctx, repairOk } = await recoveryState();
  if (!ready) return { ok: false, message: NOT_READY };
  if (!ctx.missed.length) return { ok: true, message: "이미 정리했어요." };
  const pick = checkPick(option, ctx);
  if (!pick) return { ok: false, message: "그사이 계획이 바뀌어 이 방법은 쓸 수 없어요. 다시 골라 주세요." };
  const impact = describePick(pick, ctx, repairOk);
  const repair = repairOk ? repairDate(pick, ctx.missed) : null;
  const dates = [...new Set(ctx.missed.map((item) => item.date))];
  const supabase = await getSupabase();
  const base = {
    date: ctx.today,
    kind: "recover",
    reason: String(reason ?? "").trim().slice(0, LIMITS.reason),
    choice: String(option?.label ?? "").slice(0, 40),
    impact: impact.slice(0, 280),
    source: option?.source === "coach" ? "coach" : "basic",
  };
  const claim = await supabase.from("adjustments").insert(dates.map((date) => ({ ...base, for_date: date, repairs: date === repair })));
  if (claim.error) {
    if (claim.error.code === "23505") return { ok: true, message: "이미 정리했어요." };
    console.error("recover claim failed:", claim.error.message);
    return { ok: false, message: claim.error.code === "42703" ? NOT_READY : SAVE_FAILED };
  }
  for (const [goalId, plan] of applyPick(pick, ctx.missed)) {
    const { error } = await supabase.from("goals").update({ plan }).eq("id", goalId);
    if (error) {
      console.error("recover save failed:", error.message);
      // 계획을 못 바꿨으면 정리 기록도 거둬서 다시 고를 수 있게 한다.
      await supabase.from("adjustments").delete().eq("kind", "recover").in("for_date", dates).eq("date", ctx.today);
      return { ok: false, message: SAVE_FAILED };
    }
  }
  console.info(`recover chosen: source=${base.source} moves=${pick.moves.length} drops=${pick.drops.length} repair=${Boolean(repair)}`);
  revalidatePath("/today");
  revalidatePath("/records");
  return { ok: true, impact };
}
