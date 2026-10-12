import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoalForm } from "@/components/GoalForm";
import { BackLink, PageHeader } from "@/components/ui";
import { isUuid, toValues, todayInSeoul } from "@/lib/goals";
import { getGoal, isConfigured, materialUrl } from "@/lib/supabase";
import { updateGoal } from "../../actions";

export const metadata: Metadata = { title: "목표 수정" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = isUuid(id) && isConfigured() ? await getGoal(id) : null;
  if (!goal) notFound();

  return (
    <>
      <BackLink href={`/goals/${goal.id}`}>목표로 돌아가기</BackLink>
      <PageHeader overline="목표 수정" title="달라진 점을 알려 주세요" description="시험일이나 하루 시간을 바꾸면 코치가 남은 기간에 맞춰 계획을 다시 짜요." />
      <GoalForm
        action={updateGoal.bind(null, goal.id)}
        initial={toValues(goal)}
        today={todayInSeoul()}
        currentMaterialUrl={goal.material_path ? materialUrl(goal.material_path) : null}
        submitLabel="저장하고 계획 맞추기"
        cancelHref={`/goals/${goal.id}`}
      />
    </>
  );
}
