import type { Metadata } from "next";
import { GoalWizard } from "@/components/GoalWizard";
import { Notice } from "@/components/ui";
import { todayInSeoul } from "@/lib/goals";
import { isConfigured } from "@/lib/supabase";
import { createGoal } from "../actions";

export const metadata: Metadata = { title: "새 목표" };
export const dynamic = "force-dynamic";

export default function NewGoalPage() {
  return (
    <main className="screen">
      {!isConfigured() && <Notice tone="error">저장소가 아직 연결되지 않았어요. 환경 변수를 확인해 주세요.</Notice>}
      {/* 화면을 열 때마다 새 요청 번호를 준다. 같은 번호로는 한 번만 저장된다. */}
      <GoalWizard action={createGoal} today={todayInSeoul()} requestId={crypto.randomUUID()} />
    </main>
  );
}
