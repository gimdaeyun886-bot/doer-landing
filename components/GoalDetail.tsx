import { CoachTour, type TourStep } from "@/components/CoachTour";
import { ClearChat, DeleteGoalButton, ReplanButton } from "@/components/GoalActions";
import { PlanCalendar } from "@/components/PlanCalendar";
import { ButtonLink, Icon, NavButton, Notice, Pill, RowLink, Section, kindTone } from "@/components/ui";
import { formatDate, formatMinutes, goalTag, planEnd, type Goal, type Proof } from "@/lib/goals";

type SimpleAction = (prev: { message?: string }, formData: FormData) => Promise<{ message?: string }>;

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  created: { tone: "success", text: "계획을 다 짰어요." },
  "created-noplan": { tone: "error", text: "목표는 저장했지만 계획을 만들지 못했어요. 아래에서 다시 시도해 주세요." },
  updated: { tone: "success", text: "저장했어요." },
  replanned: { tone: "success", text: "오늘부터의 계획을 다시 짰어요." },
  "updated-noplan": { tone: "error", text: "저장했지만 계획을 다시 만들지 못했어요. 아래에서 다시 시도해 주세요." },
};

// 계획을 막 받은 사람에게 코치가 짚어 주는 것들.
const TOUR: TourStep[] = [
  { text: "계획을 다 짰어요. 어떻게 보는지 잠깐 알려 드릴게요." },
  { target: ".cal-grid", text: "점이 찍힌 날에 할 일이 있어요. 날짜를 누르면 그날 할 일이 아래에 나와요." },
  { target: `a.row[href$="/why"]`, text: "제가 왜 이렇게 짰는지는 여기에 적어 뒀어요." },
  { target: ".detail .dock .btn", text: "이제 오늘 할 일을 보러 가요." },
];

type Props = { goal: Goal; today: string; notice?: string; proofs: Proof[]; materialSrc: string | null; replan: SimpleAction; remove: SimpleAction };

// 목표 한 개의 화면. 달력과 고른 날의 할 일이 중심이고, 코치가 이렇게 짠 이유는 한 줄 요약과 함께 따로 둔 화면으로 잇는다.
export function GoalDetail({ goal, today, notice, proofs, materialSrc, replan, remove }: Props) {
  const plan = goal.plan_status === "ready" && goal.plan?.days ? goal.plan : null;
  const end = plan ? planEnd(plan) : null;
  const until = goal.kind === "dated" && goal.deadline ? `${formatDate(goal.deadline)}까지` : goal.kind === "ongoing" ? "매주 반복" : end ? `${formatDate(end)}쯤 끝` : "날짜 없음";

  return (
    <article className="screen detail">
      <div className="topbar">
        <NavButton href="/goals" icon="chevL" label="내 목표로" />
        <DeleteGoalButton action={remove} title={goal.title} />
      </div>
      {(notice === "created" || notice === "created-noplan") && <ClearChat />}
      {notice === "created" && plan && <CoachTour id="plan" steps={TOUR} doneLabel="오늘 할 일 보기" doneHref="/today" />}
      {notice && NOTICES[notice] && <Notice tone={NOTICES[notice].tone}>{NOTICES[notice].text}</Notice>}

      <header className="detail-head">
        <Pill tone={kindTone(goal.kind)}>{goalTag(goal)}</Pill>
        <h1>{goal.title}</h1>
        <p className="meta">
          {until} · {goal.schedule || `하루 ${formatMinutes(goal.daily_minutes)}`}
        </p>
      </header>

      {plan ? (
        <>
          <Section>
            <PlanCalendar plan={plan} today={today} deadline={goal.kind === "dated" ? goal.deadline : null} passed={proofs.filter((proof) => proof.passed).map((proof) => proof.task_id)} />
          </Section>

          <Section title="코치가 이렇게 짠 이유">
            <p className="why-summary">{plan.summary}</p>
            <div className="rows">
              <RowLink href={`/goals/${goal.id}/why`} icon="chat" title="근거와 주별 흐름 보기" value={`근거 ${plan.basis.length}개 · ${plan.weeks.length}주`} />
            </div>
          </Section>
        </>
      ) : (
        <Section className="plan-missing">
          <h2>아직 계획이 없어요</h2>
          <p>코치에게 계획을 부탁해 보세요. 1분쯤 걸려요.</p>
          <ReplanButton action={replan} label="계획 만들기" />
        </Section>
      )}

      <Section title="올린 자료">
        {materialSrc ? (
          <a href={materialSrc} target="_blank" rel="noreferrer" className="material-view" aria-label="올린 자료 크게 보기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={materialSrc} alt={`${goal.title} 목차·범위 자료`} />
          </a>
        ) : (
          <p className="material-empty">
            <Icon name="image" size={20} />
            올린 자료가 없어요. 목표 고치기에서 목차나 범위 사진을 올릴 수 있어요.
          </p>
        )}
      </Section>

      <Section title="관리">
        <div className="rows">
          <RowLink href={`/goals/${goal.id}/edit`} icon="pen" title="목표 고치기" />
        </div>
        {plan && <ReplanButton action={replan} label="계획 다시 만들기" />}
      </Section>

      {plan && (
        <div className="dock">
          <ButtonLink href="/today">오늘 할 일 보기</ButtonLink>
        </div>
      )}
    </article>
  );
}
