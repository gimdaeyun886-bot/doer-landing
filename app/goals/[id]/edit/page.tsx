import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoalForm } from "@/components/GoalForm";
import { NavButton } from "@/components/ui";
import { isUuid, toValues, todayInSeoul } from "@/lib/goals";
import { getGoal, isConfigured, materialUrl } from "@/lib/supabase";
import { updateGoal } from "../../actions";

export const metadata: Metadata = { title: "목표 고치기" };
export const dynamic = "force-dynamic";

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = isUuid(id) && isConfigured() ? await getGoal(id) : null;
  if (!goal) notFound();

  return (
    <main className="screen">
      <div className="topbar">
        <NavButton href={`/goals/${goal.id}`} icon="chevL" label="목표로 돌아가기" />
      </div>
      <header className="headline">
        <h1>목표 고치기</h1>
        <p>바꿀 곳만 고치고 저장하세요.</p>
      </header>
      <GoalForm action={updateGoal.bind(null, goal.id)} initial={toValues(goal)} today={todayInSeoul()} mode="edit" currentMaterialUrl={materialUrl(goal)} />
    </main>
  );
}
