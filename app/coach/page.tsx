import type { Metadata } from "next";
import { NewGoalRow } from "@/components/CoachHub";
import { CoachTour, TourButton, type TourStep } from "@/components/CoachTour";
import { CoachMark, Notice, RowLink, Section, TabBar } from "@/components/ui";
import { formatToday, tasksOn } from "@/lib/goals";
import { missedLine } from "@/lib/recover";
import { isConfigured, recoveryState } from "@/lib/supabase";

export const metadata: Metadata = { title: "코치" };
export const dynamic = "force-dynamic";

// 코치 탭을 처음 열면 짚어 주는 것들.
const TOUR: TourStep[] = [
  { target: ".coach-hub .group .rows", text: "버거운 날엔 여기서 오늘 계획을 조정해요. 바꾸면 그만큼 대가가 있어요." },
  { target: `.coach-hub a[href="/goals/new"]`, text: "새 목표도 여기서 코치에게 말해요." },
];

// 코치 탭. 지금 할 수 있는 대화(오늘 조정, 놓친 날 정리, 새 목표)를 상황에 맞게 한 줄씩 보여 준다.
export default async function CoachHubPage() {
  if (!isConfigured()) {
    return (
      <div className="screen coach-hub">
        <Notice tone="error">저장소가 아직 연결되지 않았어요.</Notice>
        <TabBar active="coach" />
      </div>
    );
  }
  const { ctx, history } = await recoveryState();
  const passed = new Set(history.proofs.filter((proof) => proof.passed && proof.date === ctx.today).map((proof) => `${proof.goal_id}:${proof.task_id}`));
  const left = ctx.goals.flatMap((goal) => tasksOn(goal, ctx.today).map((task) => `${goal.id}:${task.id}`)).filter((key) => !passed.has(key)).length;
  const missed = missedLine(ctx.missed, ctx.today);

  return (
    <div className="screen coach-hub">
      <header className="headline">
        <div className="headline-row">
          <p className="date">{formatToday()}</p>
          <TourButton id="coach" />
        </div>
        <h1>코치</h1>
      </header>
      <div className="hub-hello">
        <CoachMark size={48} />
        <p>사정을 말하면 바꿀 방법과 그 대가를 함께 보여 드려요.</p>
      </div>

      <section className="group">
        <div className="section-head">
          <h2>오늘</h2>
        </div>
        <div className="section rows">
          {left > 0 ? (
            <RowLink href="/goals/new?talk=adjust" icon="swap" title="오늘 계획 조정하기" sub={`남은 할 일 ${left}가지 · 버거운 날에`} />
          ) : (
            <div className="row row-quiet">
              <span className="row-text">
                <b>오늘 조정할 할 일이 없어요</b>
                <small>{ctx.goals.length ? "남은 할 일이 있을 때 여기서 조정해요" : "목표를 정하면 여기서 조정할 수 있어요"}</small>
              </span>
            </div>
          )}
          {missed && <RowLink href="/goals/new?talk=recover" icon="repeat" title={missed} sub="옮겨서 이어 하거나 넘길 수 있어요" />}
        </div>
      </section>

      <Section title="목표" className="rows">
        <NewGoalRow />
      </Section>
      <CoachTour id="coach" steps={TOUR} />
      <TabBar active="coach" />
    </div>
  );
}
