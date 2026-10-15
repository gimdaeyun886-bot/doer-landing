"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  LIMITS,
  MATERIAL_BUCKET,
  MATERIAL_TYPES,
  addDays,
  cleanLockTargets,
  isKind,
  isRealDate,
  isUuid,
  materialError,
  planEnd,
  readValues,
  tasksOn,
  todayInSeoul,
  validateValues,
  verifyTypeOf,
  type AdjustOption,
  type FormState,
  type Goal,
  type GoalValues,
  type Plan,
} from "@/lib/goals";
import { EMPTY_SLOTS, coachTurn, generatePlan, judgeAnswer, makeQuiz, readMaterial, suggestAdjustments, toDataUrl, verifyProof, type ChatMessage, type Slots, type TurnResult } from "@/lib/plan";
import { TABLES, getSupabase, goalColumns, isConfigured, listPlannedGoals, saveSettings } from "@/lib/supabase";

const NOT_CONFIGURED = "저장소가 아직 연결되지 않았어요. 환경 변수를 확인해 주세요.";
const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const UPLOAD_FAILED = "사진을 올리지 못했어요. 사진을 빼고 저장하거나 잠시 후 다시 시도해 주세요.";
const INVALID = "표시한 곳을 다시 확인해 주세요.";
// 인증 사진 원본은 이의 제기를 받을 수 있는 동안만 둔다.
const PROOF_KEEP_DAYS = 7;

function pickFile(formData: FormData, name: string) {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

// 파일은 "종류/무작위 이름" 경로에 둔다. 저장소 정책이 이 두 폴더에만 올리게 한다.
async function upload(file: File, folder: "materials" | "proofs") {
  const path = `${folder}/${crypto.randomUUID()}.${MATERIAL_TYPES[file.type]}`;
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

async function findByRequest(requestId: string) {
  const { data } = await (await getSupabase()).from(TABLES.goals).select("id").eq("request_id", requestId).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// 계획이 바뀌면 오늘부터의 인증은 새 할 일과 맞지 않으므로 지운다. 지난 날의 기록은 남긴다.
async function clearProofs(goalId: string, from?: string) {
  let query = (await getSupabase()).from(TABLES.proofs).delete().eq("goal_id", goalId);
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
  const { error } = await (await getSupabase()).from(TABLES.goals).update(patch).eq("id", goal.id);
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
  context: values.context || null,
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
    facts: Array.isArray(raw?.facts) ? raw.facts.map((fact) => String(fact).trim().slice(0, 100)).filter(Boolean).slice(0, LIMITS.facts) : [],
    material_summary: text(raw?.material_summary, LIMITS.summary),
    lock_targets: Array.isArray(raw?.lock_targets) ? cleanLockTargets(raw.lock_targets.map(String)) : null,
  };
}

// 코치와의 대화 한 차례. 사용자의 말에서 목표를 알아듣고 다음 질문을 돌려준다. 사진을 함께 보내면 코치가 먼저 읽는다.
export async function askCoach(history: ChatMessage[], rawSlots: Slots, photo?: FormData): Promise<TurnResult> {
  if (!isConfigured()) return { ok: false, message: NOT_CONFIGURED };
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

  // 확인 장을 열 때 받은 요청 번호. 같은 번호로는 한 번만 저장한다(DB unique 제약).
  const requestId = String(formData.get("request_id") ?? "");
  if (!isUuid(requestId)) return { attempt, values, message: "화면을 새로고침한 뒤 다시 저장해 주세요." };
  const already = await findByRequest(requestId);
  if (already) redirect(`/goals/${already}?notice=created`);

  const materialPath = file ? await upload(file, "materials") : null;
  if (file && !materialPath) return { attempt, values, errors: { material: UPLOAD_FAILED }, message: UPLOAD_FAILED };

  // 대화에서 이미 읽은 내용이 없으면(직접 적은 경우) 여기서 사진을 읽는다.
  // 사진 없이 대화를 이어 온 경우에도, 코치가 전에 읽어 둔 내용은 계획에 쓴다.
  const summary = file ? values.material_summary || (await readMaterial(await toDataUrl(file))) : values.material_summary || null;
  const { data, error } = await (await getSupabase()).from(TABLES.goals).insert({ ...(await toRow(values, materialPath, summary)), request_id: requestId }).select(await goalColumns()).single();
  if (error || !data) {
    await removeFiles([materialPath]);
    // 거의 같은 때 들어온 두 번째 요청이면 먼저 저장된 목표로 보낸다.
    const first = error?.code === "23505" ? await findByRequest(requestId) : null;
    if (first) redirect(`/goals/${first}?notice=created`);
    console.error("goal insert failed:", error?.message);
    return { attempt, values, message: SAVE_FAILED };
  }

  const goal = data as unknown as Goal;
  await saveSettings({ lock_targets: values.lock_targets });
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

  const supabase = await getSupabase();
  const { data: before, error: readError } = await supabase.from(TABLES.goals).select(await goalColumns()).eq("id", id).maybeSingle();
  if (readError) return { attempt, values, message: SAVE_FAILED };
  if (!before) return { attempt, values, message: "이미 지운 목표예요. 목록으로 돌아가 주세요." };
  const current = before as unknown as Goal;

  const newPath = file ? await upload(file, "materials") : null;
  if (file && !newPath) return { attempt, values, errors: { material: UPLOAD_FAILED }, message: UPLOAD_FAILED };
  const materialPath = newPath ?? (formData.get("remove_material") === "on" ? null : current.material_path);

  const summary = file ? await readMaterial(await toDataUrl(file)) : formData.get("remove_material") === "on" ? null : current.material_summary;
  const { data, error } = await supabase.from(TABLES.goals).update(await toRow(values, materialPath, summary)).eq("id", id).select(await goalColumns()).maybeSingle();
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
  const { data, error } = await (await getSupabase()).from(TABLES.goals).select(await goalColumns()).eq("id", id).maybeSingle();
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
  const { data, error } = await (await getSupabase()).from(TABLES.goals).delete().eq("id", id).select("material_path").maybeSingle();
  if (error) {
    console.error("goal delete failed:", error.message);
    return { message: "지우지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await removeFiles([data?.material_path as string | null | undefined]);

  // 공용 데모라, 목표가 하나도 남지 않으면 잠글 앱과 시작 기록도 처음 상태로 돌린다. 다음 방문자가 빈 데모에서 시작한다.
  const { count } = await (await getSupabase()).from(TABLES.goals).select("id", { count: "exact", head: true });
  if (count === 0) await saveSettings({ lock_targets: [], lock_date: null });

  revalidatePath("/goals");
  revalidatePath("/today");
  redirect("/goals?notice=deleted");
}

/* ───────── 오늘: 시작, 인증, 이의 제기, 조정 ───────── */

// 오늘 할 일과 인증 방법, 잠글 앱을 확인하고 시작한다. 이때부터 모두 인증할 때까지 잠금이 걸린다.
export async function startToday(): Promise<{ ok: boolean }> {
  if (!isConfigured()) return { ok: false };
  const ok = await saveSettings({ lock_date: todayInSeoul() });
  revalidatePath("/today");
  return { ok };
}

export async function saveLocks(_prev: { message?: string; saved?: boolean }, formData: FormData): Promise<{ message?: string; saved?: boolean }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  const ok = await saveSettings({ lock_targets: formData.getAll("lock").map(String) });
  revalidatePath("/today");
  revalidatePath("/settings");
  return ok ? { saved: true } : { message: SAVE_FAILED };
}

async function loadTodayTask(goalId: string, taskId: string) {
  if (!isUuid(goalId)) return null;
  const { data } = await (await getSupabase()).from(TABLES.goals).select(await goalColumns()).eq("id", goalId).maybeSingle();
  const goal = data as unknown as Goal | null;
  const task = goal ? tasksOn(goal, todayInSeoul()).find((item) => item.id === taskId) : null;
  return goal && task ? { goal, task } : null;
}

// 퀴즈 인증: 코치가 오늘 한 내용에서 문제 세 개를 낸다.
export async function startQuiz(goalId: string, taskId: string): Promise<{ questions?: string[]; message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
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

  const { data: before } = await supabase.from(TABLES.proofs).select("image_path").eq("goal_id", goal.id).eq("task_id", task.id).maybeSingle();
  const { error } = await supabase
    .from(TABLES.proofs)
    .upsert({ goal_id: goal.id, task_id: task.id, date: today, kind, passed: verdict.passed, reason: verdict.reason, image_path: imagePath, answer, appeal: null, appealed_at: null, created_at: new Date().toISOString() }, { onConflict: "goal_id,task_id" });
  if (error) {
    console.error("proof save failed:", error.message);
    await removeFiles([imagePath]);
    return { attempt, message: "인증 결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await removeFiles([before?.image_path as string | null | undefined]);

  // 보관 기간이 지난 사진 원본을 지운다.
  const cutoff = addDays(today, -PROOF_KEEP_DAYS);
  const { data: old } = await supabase.from(TABLES.proofs).update({ image_path: null }).lt("date", cutoff).not("image_path", "is", null).select("image_path");
  // update가 돌려주는 값은 바뀐 뒤의 값이라, 지울 경로는 따로 읽어 둔 것이 없으면 폴더에서 찾는다.
  if (old?.length) await purgeOldProofFiles(cutoff);

  revalidatePath("/today");
  revalidatePath(`/goals/${goal.id}`);
  return { attempt, passed: verdict.passed, reason: verdict.reason };
}

// 기록에 더는 연결되지 않은 인증 사진 파일을 지운다.
async function purgeOldProofFiles(cutoff: string) {
  const supabase = await getSupabase();
  const folder = "proofs";
  const [{ data: files }, { data: kept }] = await Promise.all([supabase.storage.from(MATERIAL_BUCKET).list(folder, { limit: 1000 }), supabase.from(TABLES.proofs).select("image_path").not("image_path", "is", null)]);
  const keep = new Set((kept ?? []).map((row) => row.image_path as string));
  const stale = (files ?? []).filter((file) => !keep.has(`${folder}/${file.name}`) && (file.created_at ?? "") < `${cutoff}T00:00:00`).map((file) => `${folder}/${file.name}`);
  await removeFiles(stale);
}

// 코치의 판정이 틀렸다고 생각할 때. 운영자가 직접 확인할 수 있게 사유를 남긴다.
export async function appealProof(goalId: string, taskId: string, _prev: { message?: string; sent?: boolean }, formData: FormData): Promise<{ message?: string; sent?: boolean }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  const text = String(formData.get("appeal") ?? "").trim().slice(0, LIMITS.appeal);
  if (text.length < 5) return { message: "어떤 점이 틀렸는지 한 줄만 적어 주세요." };
  if (!isUuid(goalId)) return { message: "기록을 찾지 못했어요." };
  const { data, error } = await (await getSupabase()).from(TABLES.proofs).update({ appeal: text, appealed_at: new Date().toISOString() }).eq("goal_id", goalId).eq("task_id", taskId).eq("passed", false).select("task_id");
  if (error || !data?.length) return { message: "보내지 못했어요. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/today");
  return { sent: true };
}

export type AdjustState = { reply?: string; options?: AdjustOption[]; message?: string };

// 버거운 날: 사정을 말하면 코치가 조정안과 그 대가를 보여 준다. 고르기 전에는 아무것도 바뀌지 않는다.
export async function requestAdjustment(reason: string): Promise<AdjustState> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  const text = String(reason ?? "").trim().slice(0, LIMITS.reason);
  if (text.length < 4) return { message: "어떤 사정인지 한 줄만 알려 주세요." };
  const today = todayInSeoul();
  const [goals, { data: proofs }] = await Promise.all([listPlannedGoals(), (await getSupabase()).from(TABLES.proofs).select("goal_id,task_id,passed").eq("date", today)]);
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
  const options = result.options.map((option) => ({ ...option, moves: option.moves.filter(real), drops: option.drops.filter(real) })).filter((option) => option.moves.length || option.drops.length);
  return options.length ? { reply: result.reply, options } : { message: "코치가 쓸 만한 조정안을 찾지 못했어요. 사정을 조금 더 자세히 말해 주세요." };
}

// 고른 조정안을 계획에 적용한다. 받은 값은 믿지 않고, 실제 오늘 할 일과 계획 범위에 맞는 것만 반영한다.
export async function applyAdjustment(reason: string, option: AdjustOption): Promise<{ ok: boolean; message?: string }> {
  if (!isConfigured()) return { ok: false, message: NOT_CONFIGURED };
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
      if (index < 0 || goal.kind === "ongoing" || !isRealDate(to) || to <= today || to > limit) continue;
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
    const { error } = await supabase.from(TABLES.goals).update({ plan }).eq("id", goal.id);
    if (error) {
      console.error("adjust save failed:", error.message);
      return { ok: false, message: SAVE_FAILED };
    }
    changed++;
  }
  if (!changed) return { ok: false, message: "적용할 수 있는 내용이 없었어요. 다시 말해 주세요." };

  await supabase.from(TABLES.adjustments).insert({ date: today, reason: String(reason ?? "").slice(0, LIMITS.reason), choice: String(option.label ?? "").slice(0, 40), impact: String(option.impact ?? "").slice(0, 200) });
  // 오늘 화면은 사용자가 결과를 확인한 뒤 브라우저 쪽에서 새로 그린다. 여기서 다시 그리면 결과 창이 먼저 사라진다.
  revalidatePath("/goals");
  return { ok: true };
}
