import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon, NavButton, Section } from "@/components/ui";
import { adjustmentRule, formatDate, formatDateTime, isUuid, todayInSeoul } from "@/lib/goals";
import { getGoal, isConfigured, signedUrl } from "@/lib/supabase";

export const metadata: Metadata = { title: "코치가 이렇게 짠 이유" };
export const dynamic = "force-dynamic";

// 코치가 계획을 이렇게 짠 이유: 근거, 가정한 것, 주마다의 흐름, 코치에게 알려 준 것.
export default async function WhyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = isUuid(id) && isConfigured() ? await getGoal(id) : null;
  const plan = goal?.plan_status === "ready" && goal.plan?.days ? goal.plan : null;
  if (!goal || !plan) notFound();
  const today = todayInSeoul();
  const materialSrc = await signedUrl(goal.material_path);

  return (
    <article className="screen why">
      <div className="topbar">
        <NavButton href={`/goals/${goal.id}`} icon="chevL" label="목표로 돌아가기" />
      </div>
      <header className="headline">
        <p className="date">{goal.title}</p>
        <h1>코치가 이렇게 짠 이유</h1>
      </header>

      <Section title="근거">
        <ul className="basis">
          {plan.basis.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      {plan.assumptions.length > 0 && (
        <Section title="코치가 가정한 것" aside="다르면 목표 고치기에서 알려 주세요">
          <ul className="bullets">
            {plan.assumptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="주마다 하는 일">
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
                      {current && " · 이번 주"}
                    </small>
                  </span>
                  <Icon name="chevR" size={16} />
                </summary>
                <p className="week-why">{week.why}</p>
                <ul className="bullets">
                  {week.items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </Section>

      <Section title="코치에게 알려 준 것">
        <p className="plain">{goal.note || "적어 둔 상황이 없어요."}</p>
        {materialSrc && (
          <a href={materialSrc} target="_blank" rel="noreferrer" className="told-thumb" aria-label="올린 자료 크게 보기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={materialSrc} alt={`${goal.title} 목차·범위 자료`} />
          </a>
        )}
      </Section>

      <Section title="계획을 조정하면">
        <p className="plain">{adjustmentRule(goal.kind)}</p>
      </Section>

      <p className="stamp">
        등록 {formatDateTime(goal.created_at)} · 수정 {formatDateTime(goal.updated_at)}
      </p>
    </article>
  );
}
