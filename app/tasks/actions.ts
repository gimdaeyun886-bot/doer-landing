"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabase, isConfigured } from "@/lib/supabase";
import { PROOF_BUCKET, PROOF_TYPES, isUuid, proofError, readValues, validateValues, type FormState } from "@/lib/tasks";

const NOT_CONFIGURED = "저장소가 아직 연결되지 않았어요. 환경 변수를 확인해 주세요.";
const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const UPLOAD_FAILED = "이미지를 올리지 못했어요. 이미지를 빼고 저장하거나 잠시 후 다시 시도해 주세요.";

function pickProof(formData: FormData) {
  const file = formData.get("proof");
  return file instanceof File && file.size > 0 ? file : null;
}

async function uploadProof(file: File) {
  const path = `${crypto.randomUUID()}.${PROOF_TYPES[file.type]}`;
  const { error } = await getSupabase().storage.from(PROOF_BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    console.error("proof upload failed:", error.message);
    return null;
  }
  return path;
}

async function removeProof(path: string | null) {
  if (!path) return;
  const { error } = await getSupabase().storage.from(PROOF_BUCKET).remove([path]);
  if (error) console.error("proof remove failed:", error.message);
}

export async function createTask(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = prev.attempt + 1;
  const values = readValues(formData);
  const errors = validateValues(values);
  const file = pickProof(formData);
  const fileError = file && proofError(file);
  if (fileError) errors.proof = fileError;
  if (Object.keys(errors).length) return { attempt, errors, values, message: "입력한 내용을 다시 확인해 주세요." };
  if (!isConfigured()) return { attempt, values, message: NOT_CONFIGURED };

  const proofPath = file ? await uploadProof(file) : null;
  if (file && !proofPath) return { attempt, values, errors: { proof: UPLOAD_FAILED }, message: UPLOAD_FAILED };

  const { data, error } = await getSupabase()
    .from("tasks")
    .insert({
      title: values.title,
      goal: values.goal,
      due_date: values.due_date,
      estimated_minutes: Number(values.estimated_minutes),
      memo: values.memo || null,
      proof_path: proofPath,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("task insert failed:", error?.message);
    await removeProof(proofPath);
    return { attempt, values, message: SAVE_FAILED };
  }

  revalidatePath("/tasks");
  redirect(`/tasks/${data.id}?notice=created`);
}

export async function updateTask(id: string, prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = prev.attempt + 1;
  const values = readValues(formData);
  const errors = validateValues(values);
  const file = pickProof(formData);
  const fileError = file && proofError(file);
  if (fileError) errors.proof = fileError;
  if (Object.keys(errors).length) return { attempt, errors, values, message: "입력한 내용을 다시 확인해 주세요." };
  if (!isConfigured()) return { attempt, values, message: NOT_CONFIGURED };
  if (!isUuid(id)) return { attempt, values, message: "수정할 할 일을 찾지 못했어요." };

  const supabase = getSupabase();
  const { data: current, error: readError } = await supabase.from("tasks").select("proof_path").eq("id", id).maybeSingle();
  if (readError) return { attempt, values, message: SAVE_FAILED };
  if (!current) return { attempt, values, message: "이미 삭제된 할 일이에요. 목록으로 돌아가 주세요." };

  const removeRequested = formData.get("remove_proof") === "on";
  const newPath = file ? await uploadProof(file) : null;
  if (file && !newPath) return { attempt, values, errors: { proof: UPLOAD_FAILED }, message: UPLOAD_FAILED };
  const proofPath = newPath ?? (removeRequested ? null : current.proof_path);

  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: values.title,
      goal: values.goal,
      due_date: values.due_date,
      estimated_minutes: Number(values.estimated_minutes),
      memo: values.memo || null,
      proof_path: proofPath,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("task update failed:", error?.message);
    await removeProof(newPath);
    return { attempt, values, message: SAVE_FAILED };
  }
  if (current.proof_path && current.proof_path !== proofPath) await removeProof(current.proof_path);

  revalidatePath("/tasks");
  redirect(`/tasks/${id}?notice=updated`);
}

export async function deleteTask(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: "삭제할 할 일을 찾지 못했어요." };

  const supabase = getSupabase();
  const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("proof_path").maybeSingle();
  if (error) {
    console.error("task delete failed:", error.message);
    return { message: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await removeProof(data?.proof_path ?? null);

  revalidatePath("/tasks");
  redirect("/tasks?notice=deleted");
}
