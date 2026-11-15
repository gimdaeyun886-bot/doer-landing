import type { Metadata } from "next";
import { AdjustChat } from "@/components/AdjustChat";
import { CoachChat } from "@/components/CoachChat";
import { NextChat } from "@/components/NextChat";
import { RecoverChat } from "@/components/RecoverChat";
import { RECOVER_DAYS, missedLine } from "@/lib/recover";
import { addDays, isUuid, needsNewDate, todayInSeoul } from "@/lib/goals";
import { getGoal, getSettings, isConfigured, recoveryState, todayLeft } from "@/lib/supabase";

export const metadata: Metadata = { title: "코치" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 코치와 대화하는 곳. 새 목표를 정하거나(기본), 오늘 계획을 조정하거나(talk=adjust), 놓친 날을 정리하거나(talk=recover),
// 계획한 기간이 끝난 목표를 이어서 짤지 새로 짤지 묻는다(talk=next&goal=목표 id).
// 어느 대화를 할지는 코치 탭(/coach)에서 고른다.
export default async function CoachPage({ searchParams }: { searchParams: Promise<{ talk?: string; start?: string; goal?: string }> }) {
  const { talk, start, goal } = await searchParams;
  const today = todayInSeoul();
  if (!isConfigured()) return <CoachChat today={today} savedLocks={[]} />;
  if (talk === "recover") {
    const { ctx } = await recoveryState();
    const titles = ctx.missed.map((item) => item.task.title);
    const shown = titles.length > 3 ? [...titles.slice(0, 3), `외 ${titles.length - 3}가지`] : titles;
    // 가장 오래된 놓친 날이 목록에서 빠지기 전날까지 다시 정리할 수 있다.
    const oldest = ctx.missed.map((item) => item.date).sort()[0];
    return <RecoverChat line={missedLine(ctx.missed, today)} titles={shown} until={oldest ? addDays(oldest, RECOVER_DAYS) : null} today={today} />;
  }
  if (talk === "adjust") return <AdjustChat left={await todayLeft()} />;
  if (talk === "next") {
    const found = goal && isUuid(goal) ? await getGoal(goal) : null;
    return <NextChat goalId={found?.id ?? null} title={found?.title ?? null} newDate={found ? needsNewDate(found, today) : false} />;
  }
  const settings = await getSettings();
  return <CoachChat today={today} savedLocks={settings.lockTargets} start={start === "1"} />;
}
