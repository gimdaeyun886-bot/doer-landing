import type { Metadata } from "next";
import { AdjustChat } from "@/components/AdjustChat";
import { CoachChat } from "@/components/CoachChat";
import { tasksOn, todayInSeoul } from "@/lib/goals";
import { getSettings, isConfigured, listPlannedGoals, listProofs } from "@/lib/supabase";

export const metadata: Metadata = { title: "코치" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 코치와 대화하는 곳. 새 목표를 정하거나(기본), 오늘 계획을 조정한다(talk=adjust).
export default async function CoachPage({ searchParams }: { searchParams: Promise<{ talk?: string }> }) {
  const { talk } = await searchParams;
  const today = todayInSeoul();
  if (!isConfigured()) return <CoachChat today={today} savedLocks={[]} canAdjust={false} />;

  // 오늘 아직 인증하지 않은 할 일의 수. 있을 때만 조정을 받는다.
  const [goals, proofs, settings] = await Promise.all([listPlannedGoals(), listProofs({ date: today }), getSettings()]);
  const passed = new Set(proofs.filter((proof) => proof.passed).map((proof) => `${proof.goal_id}:${proof.task_id}`));
  const left = goals.flatMap((goal) => tasksOn(goal, today).map((task) => `${goal.id}:${task.id}`)).filter((key) => !passed.has(key)).length;

  if (talk === "adjust") return <AdjustChat left={left} />;
  return <CoachChat today={today} savedLocks={settings.lockTargets} canAdjust={left > 0} />;
}
