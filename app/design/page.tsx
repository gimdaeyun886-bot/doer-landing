import { notFound } from "next/navigation";
import { Celebrate, StreakBadge } from "@/components/Celebrate";
import { RecordsView } from "@/components/RecordsView";
import { addDays, todayInSeoul } from "@/lib/goals";
import type { DayRecord } from "@/lib/streak";
import { ReplanButton } from "@/components/GoalActions";
import { EmptyState } from "@/components/ui";

// 미리보기용. 데이터는 건드리지 않고 문구만 돌려준다.
async function previewReplan(): Promise<{ message?: string }> {
  "use server";
  return { message: "미리보기라 계획을 짜지 않아요." };
}

export const dynamic = "force-dynamic";

// 예시 값으로 새 부품을 한곳에 모아 본다. 배포된 서비스에서는 열리지 않는다.
export default async function DesignPage({ searchParams }: { searchParams: Promise<{ streak?: string; part?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const today = todayInSeoul();
  const params = await searchParams;
  const streak = Number(params.streak ?? 7);
  // ?part=replan: 계획을 만들지 못한 목표가 있을 때 오늘 화면의 빈 상태.
  if (params.part === "replan")
    return (
      <div className="screen today">
        <EmptyState title="계획을 아직 만들지 못했어요" art="goals" action={<ReplanButton action={previewReplan} label="계획 다시 만들기" primary />}>
          목표는 저장돼 있어요. 누르면 코치가 계획을 다시 짜요. 1분쯤 걸려요.
        </EmptyState>
      </div>
    );
  const states: DayRecord["state"][] = ["done", "done", "adjusted", "missed", "rest", "done", "pending"];
  const week = states.map((state, index) => ({ date: addDays(today, index - 6), state, tasks: 2, passed: state === "done" ? 2 : 0 }));
  return (
    <div className="screen today">
      <header className="headline">
        <div className="headline-row">
          <p className="date">디자인 미리보기</p>
          <StreakBadge streak={streak} doneToday />
        </div>
        <h1>새 부품</h1>
      </header>
      <RecordsView week={week} streak={streak} proofs={11} />
      <Celebrate today={`preview-${Date.now()}`} streak={streak} count={2} tomorrow={["SQL 집계 문제 4개 풀고 채점", "오답 노트 정리"]} unlocked />
    </div>
  );
}
