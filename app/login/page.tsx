import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "시작하기" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ bye?: string }> }) {
  return <AuthForm bye={Boolean((await searchParams).bye)} />;
}
