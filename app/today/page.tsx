import type { Metadata } from "next";
import { TodayView } from "@/components/TodayView";
import { Notice, TabBar } from "@/components/ui";
import { addDays, planEndState, tasksOn, todayInSeoul } from "@/lib/goals";
import { findMissed, missedLine } from "@/lib/recover";
import { streakOf } from "@/lib/streak";
import { firstUnplannedGoal, getSettings, isConfigured, listHistory, listPlannedGoals, sweepGoals } from "@/lib/supabase";

export const metadata: Metadata = { title: "오늘 할 일" };
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function TodayPage() {
  if (!isConfigured()) {
    return (
      <div className="screen screen-warm today">
        <header className="headline">
          <h1>오늘 할 일</h1>
        </header>
        <Notice tone="error">저장소가 아직 연결되지 않았어요. README의 환경 변수 안내대로 Supabase 주소와 키를 설정해 주세요.</Notice>
        <TabBar active="today" />
      </div>
    );
  }
  const today = todayInSeoul();
  await sweepGoals();
  const [goals, history, settings] = await Promise.all([listPlannedGoals(), listHistory(addDays(today, -120)), getSettings()]);
  const streak = streakOf(goals, history.proofs, history.adjusted, today, 120, history.repairs);
  // 지난 사흘 안에 못 한 일이 있고 아직 정리하지 않았으면 목록 위에 한 줄로 알린다. DB가 준비되지 않았으면 숨긴다.
  const missed = history.recovered ? findMissed(goals, history.proofs, new Set(history.recovered.map((row) => row.for_date)), today) : [];
  if (missed.length) console.info(`recover row shown: ${missed.length}`);
  // 다 해낸 순간의 창에 보여 줄 내일 할 일.
  const tomorrow = goals.flatMap((goal) => tasksOn(goal, addDays(today, 1)).map((task) => task.title));
  // 계획이 끝난 목표를 종류와 인증에 따라 나눈다. 다 해낸 목표는 다음 계획을 묻지 않는다(lib/goals.ts의 planEndState).
  const passed = new Set(history.proofs.filter((proof) => proof.passed).map((proof) => `${proof.goal_id}:${proof.task_id}`));
  const endings = goals.map((goal) => ({ goal, state: planEndState(goal, passed, today) }));
  const ahead = endings.some(({ state }) => state === "running");
  const next = endings.find(({ state }) => state === "behind" || state === "renew")?.goal ?? null;
  return (
    <TodayView
      goals={goals}
      today={today}
      proofs={history.proofs.filter((proof) => proof.date === today)}
      lockTargets={settings.lockTargets}
      started={settings.lockDate === today}
      streak={streak}
      tomorrow={tomorrow}
      missed={missedLine(missed, today)}
      unplanned={ahead ? null : await firstUnplannedGoal()}
      next={next && { id: next.id, title: next.title }}
      achieved={!ahead && endings.length > 0 && endings.every(({ state }) => state === "achieved")}
      adjustedToday={history.adjusted.has(today)}
    />
  );
}
