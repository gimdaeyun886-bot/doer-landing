import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { GoalDetail } from "@/components/GoalDetail";
import { formatDate, formatMinutes, isUuid } from "@/lib/goals";
import { getGoal, isConfigured, materialUrl } from "@/lib/supabase";
import { deleteGoal, regeneratePlan } from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> };

// 메타데이터와 본문이 같은 목표를 한 번만 조회하게 한다. 형식이 틀린 주소는 조회 없이 없는 것으로 본다.
const loadGoal = cache(async (id: string) => (isUuid(id) && isConfigured() ? getGoal(id) : null));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const goal = await loadGoal((await params).id);
  if (!goal) return { title: "목표를 찾을 수 없어요" };
  const description = `${goal.exam_date ? `${formatDate(goal.exam_date)} 시험` : "기한 없는 목표"} · 하루 ${formatMinutes(goal.daily_minutes)}`;
  return { title: goal.title, description, openGraph: { title: goal.title, description } };
}

export default async function GoalDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { notice } = await searchParams;
  const goal = await loadGoal(id);
  if (!goal) notFound();

  return (
    <GoalDetail
      goal={goal}
      notice={notice}
      materialSrc={goal.material_path ? materialUrl(goal.material_path) : null}
      replan={regeneratePlan.bind(null, goal.id)}
      remove={deleteGoal.bind(null, goal.id)}
    />
  );
}
