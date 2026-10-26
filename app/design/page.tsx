import { notFound } from "next/navigation";
import { Celebrate, StreakBadge } from "@/components/Celebrate";
import { RecordsView } from "@/components/RecordsView";
import { addDays, todayInSeoul } from "@/lib/goals";
import type { DayRecord } from "@/lib/streak";

export const dynamic = "force-dynamic";

// 예시 값으로 새 부품을 한곳에 모아 본다. 배포된 서비스에서는 열리지 않는다.
export default async function DesignPage({ searchParams }: { searchParams: Promise<{ streak?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const today = todayInSeoul();
  const streak = Number((await searchParams).streak ?? 7);
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
      <Celebrate today={`preview-${Date.now()}`} streak={streak} count={2} tomorrow={["SQL 집계 문제 4개 풀고 채점", "오답 노트 정리"]} />
    </div>
  );
}
