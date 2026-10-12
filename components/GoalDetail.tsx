import { DeleteGoalButton, ReplanButton } from "@/components/GoalActions";
import { BackLink, ButtonLink, Icon, Notice, Pill } from "@/components/ui";
import { adjustmentRule, daysLeft, deadlineLabel, formatDate, formatDateTime, formatMinutes, type Goal } from "@/lib/goals";

type SimpleAction = (prev: { message?: string }, formData: FormData) => Promise<{ message?: string }>;

// 목표 상세 화면의 본문. 실제 화면과 디자인 미리보기가 함께 쓴다.
const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  created: { tone: "success", text: "목표를 등록하고 계획을 만들었어요." },
  "created-noplan": { tone: "error", text: "목표는 등록했지만 계획을 만들지 못했어요. 아래에서 다시 시도해 주세요." },
  updated: { tone: "success", text: "수정한 내용을 저장했어요." },
  replanned: { tone: "success", text: "달라진 내용에 맞춰 계획을 다시 짰어요." },
  "updated-noplan": { tone: "error", text: "수정은 저장했지만 계획을 다시 만들지 못했어요. 아래에서 다시 시도해 주세요." },
};

export function GoalDetail({ goal, notice, materialSrc, replan, remove, backHref = "/goals", editHref }: { goal: Goal; notice?: string; materialSrc: string | null; replan: SimpleAction; remove: SimpleAction; backHref?: string; editHref?: string }) {
  const plan = goal.plan_status === "ready" ? goal.plan : null;
  const today = plan?.today ?? [];
  const total = today.reduce((sum, task) => sum + task.minutes, 0);
  const urgent = goal.exam_date ? daysLeft(goal.exam_date) <= 14 : false;

  return (
    <article className="detail">
      <BackLink href={backHref}>내 목표</BackLink>
      {notice && NOTICES[notice] && <Notice tone={NOTICES[notice].tone}>{NOTICES[notice].text}</Notice>}

      <header className="detail-header">
        <Pill tone={goal.exam_date ? (urgent ? "accent" : "neutral") : "coach"}>{deadlineLabel(goal.exam_date)}</Pill>
        <h1>{goal.title}</h1>
        <dl className="facts">
          <div>
            <dt>
              <Icon name="calendar" />
              시험일
            </dt>
            <dd>{goal.exam_date ? formatDate(goal.exam_date) : "기한 없음"}</dd>
          </div>
          <div>
            <dt>
              <Icon name="clock" />
              하루 시간
            </dt>
            <dd>{formatMinutes(goal.daily_minutes)}</dd>
          </div>
        </dl>
      </header>

      {plan ? (
        <>
          <section className="coach-card" aria-labelledby="coach-title">
            <span className="coach-mark" aria-hidden="true">
              <Icon name="sparkle" />
            </span>
            <div>
              <h2 id="coach-title">코치의 계획</h2>
              <p>{plan.summary}</p>
            </div>
          </section>

          <section className="card" aria-labelledby="today-title">
            <div className="card-head">
              <h2 id="today-title">오늘 할 일</h2>
              <Pill tone="accent">
                {today.length}개 · {formatMinutes(total)}
              </Pill>
            </div>
            <ol className="today">
              {today.map((task, index) => (
                <li key={index}>
                  <span className="today-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="today-body">
                    <div className="today-top">
                      <h3>{task.title}</h3>
                      <span className="today-minutes">{formatMinutes(task.minutes)}</span>
                    </div>
                    <p>{task.detail}</p>
                    <p className="verify">
                      <Icon name="camera" />
                      <span>
                        <b>맞춤 인증 · {task.verify_method}</b>
                        {task.verify_guide}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="card-foot">할 일과 인증 방법은 코치가 정해요. 직접 고치는 대신, 버거우면 코치에게 사유를 말해 조정해요.</p>
          </section>

          <section className="lock-band" aria-label="잠금 안내">
            <span className="lock-mark" aria-hidden="true">
              <Icon name="lock" />
            </span>
            <div>
              <p>
                <b>{today.length}개를 모두 인증하면 잠근 화면이 열려요</b>
              </p>
              <p>릴스·쇼츠처럼 내가 고른 화면이 대상이에요. 잠금과 인증은 앱에서 제공할 기능이에요.</p>
            </div>
          </section>

          <section className="rule" aria-label="조정 규칙">
            <Icon name="swap" />
            <p>{adjustmentRule(goal.exam_date)}</p>
          </section>

          <section className="card" aria-labelledby="weeks-title">
            <div className="card-head">
              <h2 id="weeks-title">전체 계획</h2>
              <Pill>{plan.weeks.length}주</Pill>
            </div>
            <div className="weeks">
              {plan.weeks.map((week) => (
                <details key={week.week} open={week.week === 1}>
                  <summary>
                    <span className="week-number">{week.week}주차</span>
                    <span className="week-focus">{week.focus}</span>
                    <Icon name="chevron" />
                  </summary>
                  <ul>
                    {week.items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
            {!goal.exam_date && <p className="card-foot">기한 없는 목표라 처음 4주만 먼저 보여 줘요.</p>}
          </section>
        </>
      ) : (
        <section className="card plan-missing" aria-labelledby="missing-title">
          <span className="empty-mark" aria-hidden="true">
            <Icon name="sparkle" />
          </span>
          <h2 id="missing-title">아직 계획이 없어요</h2>
          <p>목표는 저장돼 있어요. 코치에게 계획을 다시 부탁해 보세요.</p>
          <ReplanButton action={replan} label="계획 만들기" />
        </section>
      )}

      <section className="card" aria-labelledby="info-title">
        <div className="card-head">
          <h2 id="info-title">코치에게 알려 준 것</h2>
        </div>
        {goal.note ? <p className="note">{goal.note}</p> : <p className="muted">적어 둔 메모가 없어요.</p>}
        <h3 className="sub-title">시험 범위·교재 목차</h3>
        {materialSrc ? (
          <a href={materialSrc} target="_blank" rel="noreferrer" className="material-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={materialSrc} alt={`${goal.title} 시험 범위 자료`} />
          </a>
        ) : (
          <div className="material-empty">
            <Icon name="image" />
            <p>올린 자료가 없어요. 목차 사진을 올리면 단원 이름에 맞춰 계획을 짜요.</p>
          </div>
        )}
      </section>

      <p className="stamp">
        등록 {formatDateTime(goal.created_at)} · 수정 {formatDateTime(goal.updated_at)}
        {goal.plan_generated_at && ` · 계획 ${formatDateTime(goal.plan_generated_at)}`}
      </p>

      <div className="detail-actions">
        {plan && <ReplanButton action={replan} label="계획 다시 만들기" />}
        <div className="detail-actions-row">
          <DeleteGoalButton action={remove} title={goal.title} />
          <ButtonLink href={editHref ?? `/goals/${goal.id}/edit`} variant="secondary">
            목표 수정
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
