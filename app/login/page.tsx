import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "시작하기" };

// Supabase에서 켜 둔 로그인 방법만 보여 준다. 예: NEXT_PUBLIC_AUTH_PROVIDERS=google,kakao
const providers = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter((name): name is "google" | "kakao" => name === "google" || name === "kakao");

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ bye?: string; failed?: string }> }) {
  const search = await searchParams;
  return <AuthForm bye={Boolean(search.bye)} failed={Boolean(search.failed)} providers={providers} />;
}
