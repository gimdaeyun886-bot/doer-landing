import { DeleteGoalButton, ReplanButton } from "@/components/GoalActions";
import { ButtonLink, CoachLine, Icon, NavButton, Notice, Pill, kindTone } from "@/components/ui";
import { adjustmentRule, formatDate, formatDateTime, formatMinutes, goalTag, type Goal } from "@/lib/goals";

type SimpleAction = (prev: { message?: string }, formData: FormData) => Promise<{ message?: string }>;

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  "created-noplan": { tone: "error", text: "목표는 저장했지만 계획을 만들지 못했어요. 아래에서 다시 시도해 주세요." },
  updated: { tone: "success", text: "고친 내용을 저장했어요." },
  replanned: { tone: "success", text: "달라진 내용에 맞춰 계획을 다시 짰어요." },
  "updated-noplan": { tone: "error", text: "고친 내용은 저장했지만 계획을 다시 만들지 못했어요. 아래에서 다시 시도해 주세요." },
};

// 목표 상세 화면의 본문. 실제 화면과 디자인 미리보기가 함께 쓴다.
export function GoalDetail({ goal, notice, materialSrc, replan, remove, backHref = "/goals", editHref }: { goal: Goal; notice?: string; materialSrc: string | null; replan: SimpleAction; remove: SimpleAction; backHref?: string; editHref?: string }) {
  const plan = goal.plan_status === "ready" ? goal.plan : null;
  const today = plan?.today ?? [];

  return (
    <article className="screen screen-warm detail">
      <div className="topbar">
        <NavButton href={backHref} icon="chevL" label="내 목표로" />
        <DeleteGoalButton action={remove} title={goal.title} />
      </div>
      {notice && NOTICES[notice] && <Notice tone={NOTICES[notice].tone}>{NOTICES[notice].text}</Notice>}

      <header className="detail-head">
        <Pill tone={kindTone(goal.kind)}>{goalTag(goal)}</Pill>
        <h1>{goal.title}</h1>
        <p className="meta">
          <span>
            <Icon name={goal.kind === "ongoing" ? "repeat" : "cal"} size={14} />
            {goal.kind === "dated" && goal.deadline ? formatDate(goal.deadline) : goal.kind === "ongoing" ? "계속 이어 가기" : "기한 없음"}
          </span>
          <span>
            <Icon name="clock" size={14} />
            {goal.kind === "ongoing" ? "한 번에" : "하루"} {formatMinutes(goal.daily_minutes)}
          </span>
          {goal.lock_targets.length > 0 && (
            <span>
              <Icon name="lock" size={14} />
              {goal.lock_targets.join("·")}
            </span>
          )}
        </p>
      </header>

      {plan ? (
        <>
          <CoachLine>{plan.summary}</CoachLine>

          <section className="card" aria-labelledby="today-title">
            <div className="card-head">
              <h2 id="today-title">오늘 할 일</h2>
              <span>
                {today.length}개 · {formatMinutes(today.reduce((sum, task) => sum + task.minutes, 0))}
              </span>
            </div>
            <ol className="tasks">
              {today.map((task, index) => (
                <li key={index}>
                  <span className={`num num-${kindTone(goal.kind)}`}>{index + 1}</span>
                  <div>
                    <div className="task-top">
                      <h3>{task.title}</h3>
                      <span>{formatMinutes(task.minutes)}</span>
                    </div>
                    <p>{task.detail}</p>
                    <p className="verify">
                      <Icon name="camera" size={15} />
                      <span>
                        <b>{task.verify_method}</b>
                        {task.verify_guide}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card" aria-labelledby="weeks-title">
            <div className="card-head">
              <h2 id="weeks-title">전체 계획</h2>
              <span>{plan.weeks.length}주</span>
            </div>
            <div className="weeks">
              {plan.weeks.map((week) => (
                <details key={week.week} open={week.week === 1}>
                  <summary>
                    <i>{week.week}</i>
                    <span>{week.focus}</span>
                    {week.week === 1 ? <em>이번 주</em> : <Icon name="chevR" size={16} />}
                  </summary>
                  <ul>
                    {week.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </details>
              ))}
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
          <p>목표는 저장돼 있어요. 코치에게 계획을 다시 부탁해 보세요.</p>
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
          <p className="muted">{materialSrc ? "목차·범위 사진 1장" : "올린 자료가 없어요."}</p>
        </div>
      </section>

      <p className="stamp">
        등록 {formatDateTime(goal.created_at)} · 수정 {formatDateTime(goal.updated_at)}
      </p>

      <div className="dock">
        {plan && <ReplanButton action={replan} label="계획 다시 만들기" />}
        <ButtonLink href={editHref ?? `/goals/${goal.id}/edit`} variant="soft">
          목표 고치기
        </ButtonLink>
      </div>
    </article>
  );
}
