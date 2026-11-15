import type { Metadata } from "next";
import { CoachTour, TourButton, type TourStep } from "@/components/CoachTour";
import { RecordsView } from "@/components/RecordsView";

// 기록 탭을 처음 열면 짚어 주는 것들.
const TOUR: TourStep[] = [
  { target: ".week", text: "지난 일주일이에요. 끝낸 날, 조정한 날, 못 한 날이 표시돼요." },
  { target: ".tiles", text: "숫자는 인증한 만큼만 올라가요." },
];
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
  const week = Array.from({ length: 7 }, (_, index) => dayRecord(goals, history.proofs, history.adjusted, addDays(today, index - 6), today, history.repairs));
  const streak = streakOf(goals, history.proofs, history.adjusted, today, 120, history.repairs);
  // 휴지통에 넣은 목표의 인증은 세지 않는다.
  const live = new Set(goals.map((goal) => goal.id));
  const proofs = history.proofs.filter((proof) => proof.passed && proof.date >= week[0].date && live.has(proof.goal_id)).length;
  // 지난 날이 하나도 없고 인증도 없으면 0으로 채운 칸 대신 빈 상태를 보여 준다.
  const nothingYet = proofs === 0 && !week.some((day) => day.state === "done" || day.state === "adjusted" || day.state === "missed");

  return (
    <div className="screen records">
      <header className="headline">
        <div className="headline-row">
          <p className="date">최근 일주일</p>
          {goals.length > 0 && !nothingYet && <TourButton id="records" />}
        </div>
        <h1>기록</h1>
      </header>

      {goals.length === 0 ? (
        <EmptyState title="아직 기록이 없어요" art="stack" action={<ButtonLink href="/goals/new">코치에게 목표 말하기</ButtonLink>}>
          계획을 받고 하루를 인증하면 여기에 쌓여요.
        </EmptyState>
      ) : nothingYet ? (
        <EmptyState title="첫 기록을 기다리고 있어요" art="stack" action={<ButtonLink href="/today" variant="soft">오늘 할 일 보기</ButtonLink>}>
          오늘 할 일을 인증하면 여기에 하루씩 쌓여요.
        </EmptyState>
      ) : (
        <>
          <RecordsView week={week} streak={streak} proofs={proofs} />
          <CoachTour id="records" steps={TOUR} need=".week" />
        </>
      )}
      <TabBar active="records" />
    </div>
  );
}
