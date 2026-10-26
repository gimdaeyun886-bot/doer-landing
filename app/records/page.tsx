import type { Metadata } from "next";
import { RecordsView } from "@/components/RecordsView";
import { ButtonLink, EmptyState, Notice, TabBar } from "@/components/ui";
import { addDays, todayInSeoul } from "@/lib/goals";
import { dayRecord, streakOf } from "@/lib/streak";
import { isConfigured, listHistory, listPlannedGoals } from "@/lib/supabase";

export const metadata: Metadata = { title: "기록" };
export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  if (!isConfigured()) {
    return (
      <div className="screen records">
        <Notice tone="error">저장소가 아직 연결되지 않았어요.</Notice>
        <TabBar active="records" />
      </div>
    );
  }
  const today = todayInSeoul();
  const [goals, history] = await Promise.all([listPlannedGoals(), listHistory(addDays(today, -120))]);
  const week = Array.from({ length: 7 }, (_, index) => dayRecord(goals, history.proofs, history.adjusted, addDays(today, index - 6), today));
  const streak = streakOf(goals, history.proofs, history.adjusted, today);
  const proofs = history.proofs.filter((proof) => proof.passed && proof.date >= week[0].date).length;

  return (
    <div className="screen records">
      <header className="headline">
        <p className="date">최근 일주일</p>
        <h1>기록</h1>
      </header>

      {goals.length === 0 ? (
        <EmptyState title="아직 기록이 없어요" action={<ButtonLink href="/goals/new">코치에게 목표 말하기</ButtonLink>}>
          계획을 받고 하루를 인증하면 여기에 쌓여요.
        </EmptyState>
      ) : (
        <>
          <RecordsView week={week} streak={streak} proofs={proofs} />
        </>
      )}
      <TabBar active="records" />
    </div>
  );
}
