import type { Metadata } from "next";
import { Onboarding } from "@/components/Onboarding";

export const metadata: Metadata = { title: "시작" };

// 가입 직후 처음 보는 화면. 실행을 돕는 근거를 넘겨 보고, 고민을 적으면 코치 대화로 이어진다.
export default function StartPage() {
  return <Onboarding />;
}
