import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmForm } from "@/components/ConfirmForm";
import { NavButton } from "@/components/ui";
import { isUuid, toValues, todayInSeoul } from "@/lib/goals";
import { getGoal, getSettings, isConfigured, signedUrl } from "@/lib/supabase";
import { updateGoal } from "../../actions";

export const metadata: Metadata = { title: "목표 고치기" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = isUuid(id) && isConfigured() ? await getGoal(id) : null;
  if (!goal) notFound();

  return (
    <ConfirmForm
      action={updateGoal.bind(null, goal.id)}
      initial={toValues(goal, (await getSettings()).lockTargets)}
      today={todayInSeoul()}
      mode="edit"
      currentMaterialUrl={await signedUrl(goal.material_path)}
      back={<NavButton href={`/goals/${goal.id}`} icon="chevL" label="목표로 돌아가기" />}
    />
  );
}
