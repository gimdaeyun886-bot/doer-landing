"use server";

// 목표의 등록, 수정, 삭제. 데이터를 바꾸는 일은 모두 여기(Server Actions)서만 한다.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MATERIAL_BUCKET, MATERIAL_TYPES, isUuid, materialError, readValues, toRow, validateValues, type FormState } from "@/lib/goals";
import { TABLE, getGoal, getSupabase, isConfigured } from "@/lib/supabase";

const NOT_CONFIGURED = "저장소가 아직 연결되지 않았어요. 환경 변수를 확인해 주세요.";
const INVALID = "표시한 곳을 다시 확인해 주세요.";
const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const UPLOAD_FAILED = "사진을 올리지 못했어요. 사진을 빼고 저장하거나 잠시 후 다시 시도해 주세요.";
const GONE = "이미 지워진 목표예요. 목록에서 다시 확인해 주세요.";

function pickFile(formData: FormData) {
  const file = formData.get("material");
  return file instanceof File && file.size > 0 ? file : null;
}

async function upload(file: File) {
  const path = `goals/${crypto.randomUUID()}.${MATERIAL_TYPES[file.type]}`;
  const { error } = await getSupabase().storage.from(MATERIAL_BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    console.error("upload failed:", error.message);
    return null;
  }
  return path;
}

async function removeFile(path: string | null | undefined) {
  if (!path) return;
  const { error } = await getSupabase().storage.from(MATERIAL_BUCKET).remove([path]);
  if (error) console.error("file remove failed:", error.message);
}

// 같은 등록 요청이 두 번 들어왔으면, 먼저 저장된 목표를 찾는다.
async function findByRequest(requestId: string) {
  const { data } = await getSupabase().from(TABLE).select("id").eq("request_id", requestId).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// 입력값과 파일을 함께 검사한다. 브라우저에서 이미 걸렀더라도 서버에서 다시 본다.
function check(formData: FormData) {
  const values = readValues(formData);
  const errors = validateValues(values);
  const file = pickFile(formData);
  const fileProblem = file ? materialError(file) : null;
  if (fileProblem) errors.material = fileProblem;
  return { values, errors, file };
}

export async function createGoal(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = prev.attempt + 1;
  if (!isConfigured()) return { attempt, message: NOT_CONFIGURED };
  const { values, errors, file } = check(formData);
  if (Object.keys(errors).length) return { attempt, message: INVALID, errors, values };

  // 등록 화면을 열 때 받은 요청 번호. 같은 번호로는 한 번만 저장한다.
  const requestId = String(formData.get("request_id") ?? "");
  if (!isUuid(requestId)) return { attempt, message: "화면을 새로고침한 뒤 다시 저장해 주세요.", values };
  const already = await findByRequest(requestId);
  if (already) redirect(`/goals/${already}?notice=created`);

  const materialPath = file ? await upload(file) : null;
  if (file && !materialPath) return { attempt, message: UPLOAD_FAILED, errors: { material: "사진을 올리지 못했어요." }, values };

  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert({ ...toRow(values), material_path: materialPath, request_id: requestId })
    .select("id")
    .single();

  let id = data?.id as string | undefined;
  if (error) {
    await removeFile(materialPath);
    // 거의 같은 때 들어온 두 번째 요청이면, 먼저 저장된 쪽으로 보낸다.
    if (error.code === "23505") id = (await findByRequest(requestId)) ?? undefined;
    if (!id) {
      console.error("goal insert failed:", error.message);
      return { attempt, message: SAVE_FAILED, values };
    }
  }

  revalidatePath("/goals");
  redirect(`/goals/${id}?notice=created`);
}

export async function updateGoal(id: string, prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = prev.attempt + 1;
  if (!isConfigured()) return { attempt, message: NOT_CONFIGURED };
  if (!isUuid(id)) return { attempt, message: GONE };
  const { values, errors, file } = check(formData);
  if (Object.keys(errors).length) return { attempt, message: INVALID, errors, values };

  const current = await getGoal(id).catch(() => null);
  if (!current) return { attempt, message: GONE, values };

  const removing = formData.get("remove_material") === "on";
  let materialPath = removing ? null : current.material_path;
  if (file) {
    const uploaded = await upload(file);
    if (!uploaded) return { attempt, message: UPLOAD_FAILED, errors: { material: "사진을 올리지 못했어요." }, values };
    materialPath = uploaded;
  }

  const { data, error } = await getSupabase().from(TABLE).update({ ...toRow(values), material_path: materialPath }).eq("id", id).select("id");
  if (error || !data?.length) {
    if (file) await removeFile(materialPath);
    if (error) console.error("goal update failed:", error.message);
    return { attempt, message: error ? SAVE_FAILED : GONE, values };
  }
  // 바꾸거나 뺀 예전 사진은 저장이 끝난 뒤에 지운다.
  if (current.material_path && current.material_path !== materialPath) await removeFile(current.material_path);

  revalidatePath("/goals");
  revalidatePath(`/goals/${id}`);
  redirect(`/goals/${id}?notice=updated`);
}

export async function deleteGoal(id: string, _prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  if (!isConfigured()) return { message: NOT_CONFIGURED };
  if (!isUuid(id)) return { message: GONE };
  const current = await getGoal(id).catch(() => null);
  if (current) {
    const { error } = await getSupabase().from(TABLE).delete().eq("id", id);
    if (error) {
      console.error("goal delete failed:", error.message);
      return { message: "지우지 못했어요. 잠시 후 다시 시도해 주세요." };
    }
    await removeFile(current.material_path);
  }
  revalidatePath("/goals");
  redirect("/goals?notice=deleted");
}
