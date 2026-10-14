import type { Metadata } from "next";
import { GoalForm } from "@/components/GoalForm";
import { NavButton, Notice } from "@/components/ui";
import { EMPTY_VALUES, todayInSeoul } from "@/lib/goals";
import { isConfigured } from "@/lib/supabase";
import { createGoal } from "../actions";

export const metadata: Metadata = { title: "새 목표" };
export const dynamic = "force-dynamic";

export default function NewGoalPage() {
  return (
    <main className="screen">
      <div className="topbar">
        <NavButton href="/goals" icon="chevL" label="목록으로 돌아가기" />
      </div>
      <header className="headline">
        <h1>새 목표</h1>
        <p>해내고 싶은 일과 하루에 낼 시간을 적어 주세요.</p>
      </header>
      {!isConfigured() && <Notice tone="error">저장소가 아직 연결되지 않았어요. 환경 변수를 확인해 주세요.</Notice>}
      {/* 화면을 열 때마다 새 요청 번호를 준다. 같은 번호로 두 번 저장되지 않는다. */}
      <GoalForm action={createGoal} initial={EMPTY_VALUES} today={todayInSeoul()} mode="create" requestId={crypto.randomUUID()} />
    </main>
  );
}
