"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MATERIAL_BUCKET } from "@/lib/goals";
import { getSupabase, getUser, isConfigured } from "@/lib/supabase";

// 약관이나 처리방침을 고치면 이 값을 올리고, 다시 동의를 받는다.
const CONSENT_VERSION = "2026-10-12";

export type AuthState = { message?: string; notice?: string; email?: string; mode?: "in" | "up" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function koreanAuthError(message: string) {
  if (/already registered|already exists/i.test(message)) return "이미 가입한 이메일이에요. 로그인해 주세요.";
  if (/invalid login credentials/i.test(message)) return "이메일이나 비밀번호가 맞지 않아요.";
  if (/email not confirmed/i.test(message)) return "메일함에서 확인 링크를 먼저 눌러 주세요.";
  if (/rate limit|too many/i.test(message)) return "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.";
  if (/password/i.test(message)) return "비밀번호는 8자 이상으로 정해 주세요.";
  return "처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

async function recordConsent() {
  // 동의 여부는 계정 정보에도 적어 둔다. proxy.ts가 이 값으로 동의 화면을 거쳤는지 본다.
  await (await getSupabase()).auth.updateUser({ data: { consent_version: CONSENT_VERSION } });
  const { error } = await (await getSupabase()).from("consents").upsert({ version: CONSENT_VERSION, agreed_at: new Date().toISOString() });
  if (error) console.error("consent save failed:", error.message);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const state = { email, mode: "up" as const };
  if (!isConfigured()) return { ...state, message: "저장소가 아직 연결되지 않았어요." };
  if (!EMAIL.test(email)) return { ...state, message: "이메일 주소를 다시 확인해 주세요." };
  if (password.length < 8) return { ...state, message: "비밀번호는 8자 이상으로 정해 주세요." };
  if (!formData.get("agree_terms") || !formData.get("agree_privacy") || !formData.get("agree_age")) return { ...state, message: "필수 항목에 모두 동의해 주세요." };

  const { data, error } = await (await getSupabase()).auth.signUp({ email, password, options: { data: { consent_version: CONSENT_VERSION, consented_at: new Date().toISOString() } } });
  if (error) {
    console.error("sign up failed:", error.message);
    return { ...state, message: koreanAuthError(error.message) };
  }
  // 이메일 확인을 켜 둔 프로젝트에서는 아직 로그인되지 않는다.
  if (!data.session) return { email, mode: "in", notice: "가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요." };
  await recordConsent();
  redirect("/start");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const state = { email, mode: "in" as const };
  if (!isConfigured()) return { ...state, message: "저장소가 아직 연결되지 않았어요." };
  if (!EMAIL.test(email) || !password) return { ...state, message: "이메일과 비밀번호를 적어 주세요." };

  const { data, error } = await (await getSupabase()).auth.signInWithPassword({ email, password });
  if (error) {
    console.error("sign in failed:", error.message);
    return { ...state, message: koreanAuthError(error.message) };
  }
  // 가입할 때 동의했지만 기록하지 못한 경우(이메일 확인을 거친 가입) 여기서 남긴다.
  if (data.user?.user_metadata?.consent_version) await recordConsent();
  redirect("/today");
}

// 구글·카카오 로그인. 제공자 화면으로 가는 주소를 만든다. 휴대폰 앱에서는 바깥 브라우저로 열고 앱으로 돌아온다.
export async function signInWith(provider: "google" | "kakao", inApp: boolean): Promise<{ url?: string; message?: string }> {
  if (!isConfigured()) return { message: "저장소가 아직 연결되지 않았어요." };
  const list = await headers();
  const origin = `${list.get("x-forwarded-proto") ?? "http"}://${list.get("x-forwarded-host") ?? list.get("host")}`;
  const { data, error } = await (await getSupabase()).auth.signInWithOAuth({ provider, options: { redirectTo: inApp ? "doer://callback" : `${origin}/auth/callback`, skipBrowserRedirect: true } });
  if (error || !data.url) {
    console.error("oauth start failed:", error?.message);
    return { message: "로그인 화면을 열지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  return { url: data.url };
}

// 구글·카카오로 처음 들어온 사람은 여기서 필수 동의를 받는다.
export async function agree(_prev: { message?: string }, formData: FormData): Promise<{ message?: string }> {
  if (!formData.get("agree_terms") || !formData.get("agree_privacy") || !formData.get("agree_age")) return { message: "필수 항목에 모두 동의해 주세요." };
  if (!(await getUser())) redirect("/login");
  await recordConsent();
  redirect("/start");
}

export async function signOut() {
  if (isConfigured()) await (await getSupabase()).auth.signOut();
  redirect("/login");
}

// 탈퇴: 올린 사진을 지우고 계정을 지운다. 목표·계획·인증 기록은 계정과 함께 지워진다.
export async function deleteAccount(_prev: { message?: string }, formData: FormData): Promise<{ message?: string }> {
  if (formData.get("confirm") !== "탈퇴") return { message: "확인 칸에 '탈퇴'라고 적어 주세요." };
  const user = await getUser();
  if (!user) return { message: "로그인이 풀렸어요. 다시 로그인해 주세요." };
  const supabase = await getSupabase();
  for (const folder of ["materials", "proofs"]) {
    const { data } = await supabase.storage.from(MATERIAL_BUCKET).list(`${user.id}/${folder}`, { limit: 1000 });
    if (data?.length) await supabase.storage.from(MATERIAL_BUCKET).remove(data.map((file) => `${user.id}/${folder}/${file.name}`));
  }
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("account delete failed:", error.message);
    return { message: "탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await supabase.auth.signOut();
  redirect("/login?bye=1");
}
