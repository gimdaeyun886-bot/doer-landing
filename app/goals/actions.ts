"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LIMITS, MATERIAL_BUCKET, MATERIAL_TYPES, cleanLockTargets, isKind, isRealDate, isUuid, materialError, readValues, todayInSeoul, validateValues, type FormState, type Goal, type GoalValues } from "@/lib/goals";
import { EMPTY_SLOTS, coachTurn, generatePlan, readMaterial, toDataUrl, verifyProof, type ChatMessage, type Slots, type TurnResult } from "@/lib/plan";
import { GOAL_COLUMNS, getSupabase, isConfigured, saveLockTargets } from "@/lib/supabase";

const NOT_CONFIGURED = "저장소가 아직 연결되지 않았어요. 환경 변수를 확인해 주세요.";
const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const UPLOAD_FAILED = "사진을 올리지 못했어요. 사진을 빼고 저장하거나 잠시 후 다시 시도해 주세요.";
const INVALID = "표시한 곳을 다시 확인해 주세요.";

function pickMaterial(formData: FormData) {
  const file = formData.get("material");
  return file instanceof File && file.size > 0 ? file : null;
}

async function uploadMaterial(file: File) {
  const path = `${crypto.randomUUID()}.${MATERIAL_TYPES[file.type]}`;
  const { error } = await getSupabase().storage.from(MATERIAL_BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    console.error("material upload failed:", error.message);
    return null;
  }
  return path;
}

async function removeFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((path): path is string => Boolean(path));
  if (!list.length) return;
  const { error } = await getSupabase().storage.from(MATERIAL_BUCKET).remove(list);
  if (error) console.error("file remove failed:", error.message);
}
const removeMaterial = (path: string | null) => removeFiles([path]);

// 계획이 바뀌면 오늘부터의 인증은 새 할 일과 맞지 않으므로 지운다. 지난 날의 기록은 남긴다.
async function clearProofs(goalId: string, from?: string) {
  let query = getSupabase().from("proofs").delete().eq("goal_id", goalId);
  if (from) query = query.gte("date", from);
  const { data, error } = await query.select("image_path");
  if (error) console.error("proof clear failed:", error.message);
  await removeFiles((data ?? []).map((row) => row.image_path as string | null));
}

// 계획을 만들어 목표에 저장한다. 실패해도 목표는 남고, 상세 화면에서 다시 만들 수 있다.
async function planAndSave(goal: Goal) {
  const result = await generatePlan(goal);
  const patch = result.ok ? { plan: result.plan, plan_status: "ready", plan_generated_at: new Date().toISOString() } : { plan_status: "failed" };
  if (result.ok) await clearProofs(goal.id, todayInSeoul());
  const { error } = await getSupabase().from("goals").update(patch).eq("id", goal.id);
  if (error) console.error("plan save failed:", error.message);
  return result.ok && !error ? null : result.ok ? "만든 계획을 저장하지 못했어요. 다시 시도해 주세요." : result.message;
}

function check(formData: FormData) {
  const values = readValues(formData);
  const errors = validateValues(values);
  const file = pickMaterial(formData);
  const fileError = file && materialError(file);
  if (fileError) errors.material = fileError;
  return { values, errors, file, invalid: Object.keys(errors).length > 0 };
}

const toRow = (values: GoalValues, materialPath: string | null, materialSummary: string | null) => ({
  title: values.title,
  kind: values.kind,
  deadline: values.kind === "dated" ? values.deadline : null,
  daily_minutes: Number(values.daily_minutes),
  schedule: values.schedule || null,
  note: values.note || null,
  material_path: materialPath,
  material_summary: materialPath ? materialSummary : null,
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
    material_summary: text(raw?.material_summary, LIMITS.summary),
    lock_targets: Array.isArray(raw?.lock_targets) ? cleanLockTargets(raw.lock_targets.map(String)) : null,
  };
}

// 코치와의 대화 한 차례. 사용자의 말에서 목표를 알아듣고 다음 질문을 돌려준다. 사진을 함께 보내면 코치가 먼저 읽는다.
export async function askCoach(history: ChatMessage[], rawSlots: Slots, photo?: FormData): Promise<TurnResult> {
  if (!isConfigured()) return { ok: false, message: NOT_CONFIGURED };
  const slots = cleanSlots(rawSlots);
  const file = photo instanceof FormData ? pickMaterial(photo) : null;
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

  const materialPath = file ? await uploadMaterial(file) : null;
  if (file && !materialPath) return { attempt, values, errors: { material: UPLOAD_FAILED }, message: UPLOAD_FAILED };

  // 대화에서 이미 읽은 내용이 없으면(직접 적은 경우) 여기서 사진을 읽는다.
  const summary = file ? values.material_summary || (await readMaterial(await toDataUrl(file))) : null;
  const { data, error } = await getSupabase().from("goals").insert(toRow(values, materialPath, summary)).select(GOAL_COLUMNS).single();
  if (error || !data) {
    console.error("goal insert failed:", error?.message);
    await removeMaterial(materialPath);
    return { attempt, values, message: SAVE_FAILED };
  }

  const goal = data as unknown as Goal;
  await saveLockTargets(values.lock_targets);
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

  const supabase = getSupabase();
  const { data: before, error: readError } = await supabase.from("goals").select(GOAL_COLUMNS).eq("id", id).maybeSingle();
  if (readError) return { attempt, values, message: SAVE_FAILED };
  if (!before) return { attempt, values, message: "이미 지운 목표예요. 목록으로 돌아가 주세요." };
  const current = before as unknown as Goal;

  const newPath = file ? await uploadMaterial(file) : null;
  if (file && !newPath) return { attempt, values, errors: { material: UPLOAD_FAILED }, message: UPLOAD_FAILED };
  const materialPath = newPath ?? (formData.get("remove_material") === "on" ? null : current.material_path);

  const summary = file ? await readMaterial(await toDataUrl(file)) : current.material_summary;
  const { data, error } = await supabase.from("goals").update(toRow(values, materialPath, summary)).eq("id", id).select(GOAL_COLUMNS).maybeSingle();
  if (error || !data) {
    console.error("goal update failed:", error?.message);
    await removeMaterial(newPath);
    return { attempt, values, message: SAVE_FAILED };
  }
  if (current.material_path && current.material_path !== materialPath) await removeMaterial(current.material_path);

  // 계획에 영향을 주는 값이 바뀌었거나 계획이 없으면 코치가 다시 짠다. 잠글 앱만 바꾼 경우는 그대로 둔다.
  const goal = data as unknown as Goal;
  await saveLockTargets(values.lock_targets);
  const changed =
    goal.title !== current.title ||
    goal.kind !== current.kind ||
    goal.deadline !== current.deadline ||
    goal.daily_minutes !== current.daily_minutes ||
    goal.schedule !== current.schedule ||
    goal.note !== current.note ||
    goal.material_path !== current.material_path;
  let notice = "updated";
  if (changed || goal.plan_status !== "ready") notice = (await planAndSave(goal)) ? "updated-noplan" : "replanned";

  revalidatePath("/goals");
  revalidatePath("/today");
  redirect(`/goals/${id}?notice=${notice}`);
}

export async function regeneratePlan(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: "목표를 찾지 못했어요." };
  const { data, error } = await getSupabase().from("goals").select(GOAL_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return { message: "목표를 찾지 못했어요." };

  const problem = await planAndSave(data as unknown as Goal);
  revalidatePath("/goals");
  revalidatePath("/today");
  if (problem) return { message: problem };
  redirect(`/goals/${id}?notice=replanned`);
}

export async function deleteGoal(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: "지울 목표를 찾지 못했어요." };

  await clearProofs(id);
  const { data, error } = await getSupabase().from("goals").delete().eq("id", id).select("material_path").maybeSingle();
  if (error) {
    console.error("goal delete failed:", error.message);
    return { message: "지우지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await removeMaterial(data?.material_path ?? null);

  revalidatePath("/goals");
  revalidatePath("/today");
  redirect("/goals?notice=deleted");
}

export type VerifyState = { attempt: number; passed?: boolean; reason?: string; message?: string };

// 오늘 할 일 하나를 사진으로 인증한다. 코치가 사진을 보고 통과 여부와 이유를 알려 준다.
export async function verifyTask(goalId: string, taskId: string, prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const attempt = prev.attempt + 1;
  if (!isConfigured()) return { attempt, message: NOT_CONFIGURED };
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) return { attempt, message: "인증할 사진을 골라 주세요." };
  const fileProblem = materialError(file);
  if (fileProblem) return { attempt, message: fileProblem };
  if (!isUuid(goalId)) return { attempt, message: "목표를 찾지 못했어요." };

  const supabase = getSupabase();
  const { data } = await supabase.from("goals").select(GOAL_COLUMNS).eq("id", goalId).maybeSingle();
  const goal = data as unknown as Goal | null;
  const today = todayInSeoul();
  const task = goal?.plan_status === "ready" ? goal.plan?.days?.find((day) => day.date === today)?.tasks.find((item) => item.id === taskId) : null;
  if (!goal || !task) return { attempt, message: "오늘 할 일에서만 인증할 수 있어요. 화면을 새로 고쳐 주세요." };

  const verdict = await verifyProof(goal, task, await toDataUrl(file));
  if (!verdict.ok) return { attempt, message: verdict.message };

  const path = `proofs/${goal.id}/${crypto.randomUUID()}.${MATERIAL_TYPES[file.type]}`;
  const upload = await supabase.storage.from(MATERIAL_BUCKET).upload(path, file, { contentType: file.type });
  if (upload.error) console.error("proof upload failed:", upload.error.message);
  const imagePath = upload.error ? null : path;

  const { data: before } = await supabase.from("proofs").select("image_path").eq("goal_id", goal.id).eq("task_id", task.id).maybeSingle();
  const { error } = await supabase
    .from("proofs")
    .upsert({ goal_id: goal.id, task_id: task.id, date: today, passed: verdict.passed, reason: verdict.reason, image_path: imagePath, created_at: new Date().toISOString() }, { onConflict: "goal_id,task_id" });
  if (error) {
    console.error("proof save failed:", error.message);
    await removeFiles([imagePath]);
    return { attempt, message: "인증 결과를 저장하지 못했어요. 잠시 후 다시 올려 주세요." };
  }
  await removeFiles([before?.image_path as string | null | undefined]);

  revalidatePath("/today");
  revalidatePath(`/goals/${goal.id}`);
  return { attempt, passed: verdict.passed, reason: verdict.reason };
}
