"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MATERIAL_BUCKET, MATERIAL_TYPES, isUuid, materialError, readValues, validateValues, type FormState, type Goal } from "@/lib/goals";
import { generatePlan } from "@/lib/plan";
import { GOAL_COLUMNS, getSupabase, isConfigured } from "@/lib/supabase";

const NOT_CONFIGURED = "저장소가 아직 연결되지 않았어요. 환경 변수를 확인해 주세요.";
const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const UPLOAD_FAILED = "이미지를 올리지 못했어요. 이미지를 빼고 저장하거나 잠시 후 다시 시도해 주세요.";
const INVALID = "입력한 내용을 다시 확인해 주세요.";

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

async function removeMaterial(path: string | null) {
  if (!path) return;
  const { error } = await getSupabase().storage.from(MATERIAL_BUCKET).remove([path]);
  if (error) console.error("material remove failed:", error.message);
}

// 계획을 만들어 목표에 저장한다. 실패해도 목표는 남고, 상세 화면에서 다시 만들 수 있다.
async function planAndSave(goal: Goal) {
  const result = await generatePlan(goal);
  const patch = result.ok
    ? { plan: result.plan, plan_status: "ready", plan_generated_at: new Date().toISOString() }
    : { plan_status: "failed" };
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

export async function createGoal(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = prev.attempt + 1;
  const { values, errors, file, invalid } = check(formData);
  if (invalid) return { attempt, errors, values, message: INVALID };
  if (!isConfigured()) return { attempt, values, message: NOT_CONFIGURED };

  const materialPath = file ? await uploadMaterial(file) : null;
  if (file && !materialPath) return { attempt, values, errors: { material: UPLOAD_FAILED }, message: UPLOAD_FAILED };

  const { data, error } = await getSupabase()
    .from("goals")
    .insert({
      title: values.title,
      exam_date: values.no_deadline ? null : values.exam_date,
      daily_minutes: Number(values.daily_minutes),
      note: values.note || null,
      material_path: materialPath,
    })
    .select(GOAL_COLUMNS)
    .single();
  if (error || !data) {
    console.error("goal insert failed:", error?.message);
    await removeMaterial(materialPath);
    return { attempt, values, message: SAVE_FAILED };
  }

  const goal = data as unknown as Goal;
  const planProblem = await planAndSave(goal);
  revalidatePath("/goals");
  redirect(`/goals/${goal.id}?notice=${planProblem ? "created-noplan" : "created"}`);
}

export async function updateGoal(id: string, prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = prev.attempt + 1;
  const { values, errors, file, invalid } = check(formData);
  if (invalid) return { attempt, errors, values, message: INVALID };
  if (!isConfigured()) return { attempt, values, message: NOT_CONFIGURED };
  if (!isUuid(id)) return { attempt, values, message: "수정할 목표를 찾지 못했어요." };

  const supabase = getSupabase();
  const { data: before, error: readError } = await supabase.from("goals").select(GOAL_COLUMNS).eq("id", id).maybeSingle();
  if (readError) return { attempt, values, message: SAVE_FAILED };
  if (!before) return { attempt, values, message: "이미 삭제된 목표예요. 목록으로 돌아가 주세요." };
  const current = before as unknown as Goal;

  const newPath = file ? await uploadMaterial(file) : null;
  if (file && !newPath) return { attempt, values, errors: { material: UPLOAD_FAILED }, message: UPLOAD_FAILED };
  const materialPath = newPath ?? (formData.get("remove_material") === "on" ? null : current.material_path);

  const { data, error } = await supabase
    .from("goals")
    .update({
      title: values.title,
      exam_date: values.no_deadline ? null : values.exam_date,
      daily_minutes: Number(values.daily_minutes),
      note: values.note || null,
      material_path: materialPath,
    })
    .eq("id", id)
    .select(GOAL_COLUMNS)
    .maybeSingle();
  if (error || !data) {
    console.error("goal update failed:", error?.message);
    await removeMaterial(newPath);
    return { attempt, values, message: SAVE_FAILED };
  }
  if (current.material_path && current.material_path !== materialPath) await removeMaterial(current.material_path);

  // 계획에 영향을 주는 값이 바뀌었거나 계획이 없으면 AI가 다시 짠다.
  const goal = data as unknown as Goal;
  const changed =
    goal.title !== current.title ||
    goal.exam_date !== current.exam_date ||
    goal.daily_minutes !== current.daily_minutes ||
    goal.note !== current.note ||
    goal.material_path !== current.material_path;
  let notice = "updated";
  if (changed || goal.plan_status !== "ready") notice = (await planAndSave(goal)) ? "updated-noplan" : "replanned";

  revalidatePath("/goals");
  redirect(`/goals/${id}?notice=${notice}`);
}

export async function regeneratePlan(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: "목표를 찾지 못했어요." };
  const { data, error } = await getSupabase().from("goals").select(GOAL_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return { message: "목표를 찾지 못했어요." };

  const problem = await planAndSave(data as unknown as Goal);
  revalidatePath("/goals");
  if (problem) return { message: problem };
  redirect(`/goals/${id}?notice=replanned`);
}

export async function deleteGoal(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: "삭제할 목표를 찾지 못했어요." };

  const { data, error } = await getSupabase().from("goals").delete().eq("id", id).select("material_path").maybeSingle();
  if (error) {
    console.error("goal delete failed:", error.message);
    return { message: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await removeMaterial(data?.material_path ?? null);

  revalidatePath("/goals");
  redirect("/goals?notice=deleted");
}
