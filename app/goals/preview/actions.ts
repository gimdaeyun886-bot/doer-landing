"use server";

export async function previewOnly(_prev: { message?: string }, _formData: FormData): Promise<{ message?: string }> {
  return { message: "디자인 미리보기에서는 동작하지 않아요." };
}
