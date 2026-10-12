import { ClearChat, DeleteGoalButton, ReplanButton } from "@/components/GoalActions";
import { PlanCalendar } from "@/components/PlanCalendar";
import { ButtonLink, CoachLine, Icon, NavButton, Notice, Pill, kindTone } from "@/components/ui";
import { adjustmentRule, formatDate, formatDateTime, formatMinutes, goalTag, lockLabels, planEnd, type Goal, type Proof } from "@/lib/goals";

type SimpleAction = (prev: { message?: string }, formData: FormData) => Promise<{ message?: string }>;

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  created: { tone: "success", text: "계획을 다 짰어요. 달력에서 날짜를 눌러 하루하루 살펴보세요." },
  "created-noplan": { tone: "error", text: "목표는 저장했지만 계획을 만들지 못했어요. 아래에서 다시 시도해 주세요." },
  updated: { tone: "success", text: "고친 내용을 저장했어요." },
  replanned: { tone: "success", text: "달라진 내용에 맞춰 오늘부터의 계획을 다시 짰어요." },
  "updated-noplan": { tone: "error", text: "고친 내용은 저장했지만 계획을 다시 만들지 못했어요. 아래에서 다시 시도해 주세요." },
};

type Props = { goal: Goal; today: string; notice?: string; materialSrc: string | null; lockTargets: string[]; proofs: Proof[]; replan: SimpleAction; remove: SimpleAction };

export function GoalDetail({ goal, today, notice, materialSrc, lockTargets, proofs, replan, remove }: Props) {
  const plan = goal.plan_status === "ready" && goal.plan?.days ? goal.plan : null;
  const end = plan ? planEnd(plan) : null;

  return (
    <article className="screen screen-warm detail">
      <div className="topbar">
        <NavButton href="/goals" icon="chevL" label="내 목표로" />
        <DeleteGoalButton action={remove} title={goal.title} />
      </div>
      {(notice === "created" || notice === "created-noplan") && <ClearChat />}
      {notice && NOTICES[notice] && <Notice tone={NOTICES[notice].tone}>{NOTICES[notice].text}</Notice>}

      <header className="detail-head">
        <Pill tone={kindTone(goal.kind)}>{goalTag(goal)}</Pill>
        <h1>{goal.title}</h1>
        <p className="meta">
          <span>
            <Icon name={goal.kind === "ongoing" ? "repeat" : "cal"} size={14} />
            {goal.kind === "dated" && goal.deadline ? `${formatDate(goal.deadline)}까지` : goal.kind === "ongoing" ? "매주 반복" : end ? `${formatDate(end)}쯤 끝` : "날짜 없음"}
          </span>
          <span>
            <Icon name="clock" size={14} />
            {goal.schedule || `하루 ${formatMinutes(goal.daily_minutes)}`}
          </span>
          {lockTargets.length > 0 && (
            <span>
              <Icon name="lock" size={14} />
              {lockLabels(lockTargets).join(" · ")}
            </span>
          )}
        </p>
      </header>

      {plan ? (
        <>
          <CoachLine>{plan.summary}</CoachLine>

          <section className="card cal-card" aria-labelledby="cal-title">
            <div className="card-head">
              <h2 id="cal-title">전체 계획</h2>
              <span>
                {formatDate(plan.weeks[0].start)} ~ {end && formatDate(end)} · {plan.weeks.length}주
              </span>
            </div>
            <PlanCalendar plan={plan} today={today} deadline={goal.kind === "dated" ? goal.deadline : null} passed={proofs.filter((proof) => proof.passed).map((proof) => proof.task_id)} />
          </section>

          <section className="card basis" aria-labelledby="basis-title">
            <div className="card-head">
              <h2 id="basis-title">이렇게 짰어요</h2>
              <span>코치의 근거</span>
            </div>
            <ul>
              {plan.basis.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {plan.assumptions.length > 0 && (
              <div className="assume">
                <h3>말씀하지 않아 코치가 가정한 것</h3>
                <ul>
                  {plan.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>사실과 다르면 아래 &lsquo;목표 고치기&rsquo;의 &lsquo;지금 상황&rsquo;에 적어 주세요. 계획을 다시 짜요.</p>
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="weeks-title">
            <div className="card-head">
              <h2 id="weeks-title">주마다 하는 일</h2>
              <span>눌러서 이유 보기</span>
            </div>
            <div className="weeks">
              {plan.weeks.map((week) => {
                const current = today >= week.start && today <= week.end;
                return (
                  <details key={week.week} open={current} data-current={current || undefined}>
                    <summary>
                      <i>{week.week}</i>
                      <span>
                        {week.focus}
                        <small>
                          {formatDate(week.start)} ~ {formatDate(week.end)}
                        </small>
                      </span>
                      {current ? <em>이번 주</em> : <Icon name="chevR" size={16} />}
                    </summary>
                    <p className="week-why">{week.why}</p>
                    <ul>
                      {week.items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          </section>

          <p className="rule">
            <Icon name="swap" size={16} />
            {adjustmentRule(goal.kind)}
          </p>
        </>
      ) : (
        <section className="card plan-missing" aria-labelledby="missing-title">
          <h2 id="missing-title">아직 계획이 없어요</h2>
          <p>목표는 저장돼 있어요. 코치에게 계획을 부탁해 보세요. 1분쯤 걸려요.</p>
          <ReplanButton action={replan} label="계획 만들기" />
        </section>
      )}

      <section className="told" aria-labelledby="told-title">
        {materialSrc ? (
          <a href={materialSrc} target="_blank" rel="noreferrer" className="told-thumb" aria-label="올린 자료 크게 보기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={materialSrc} alt={`${goal.title} 목차·범위 자료`} />
          </a>
        ) : (
          <span className="told-thumb is-empty" aria-hidden="true">
            <Icon name="image" />
          </span>
        )}
        <div>
          <h2 id="told-title">코치에게 알려 준 것</h2>
          <p>{goal.note || "적어 둔 상황이 없어요."}</p>
          <p className="muted">{materialSrc ? "목차·범위 사진 1장을 읽고 짰어요" : "올린 자료가 없어요."}</p>
        </div>
      </section>

      <p className="stamp">
        등록 {formatDateTime(goal.created_at)} · 수정 {formatDateTime(goal.updated_at)}
      </p>

      <div className="dock">
        {plan && <ButtonLink href="/today">오늘 할 일 보기</ButtonLink>}
        {plan && <ReplanButton action={replan} label="계획 다시 만들기" />}
        <ButtonLink href={`/goals/${goal.id}/edit`} variant="soft">
          목표 고치기
        </ButtonLink>
      </div>
    </article>
  );
}
