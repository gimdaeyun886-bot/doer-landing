import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteGoalButton } from "@/components/DeleteGoalButton";
import { ButtonLink, Icon, NavButton, Notice, Pill, Section } from "@/components/ui";
import { KINDS, formatDate, formatDateTime, formatMinutes, goalTag, isUuid, kindTone, timeBudget } from "@/lib/goals";
import { getGoal, isConfigured, materialUrl } from "@/lib/supabase";
import { deleteGoal } from "../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

// 형식이 틀린 주소는 저장소에 묻지 않고 바로 '없는 목표'로 보낸다.
async function load(id: string) {
  return isUuid(id) && isConfigured() ? getGoal(id) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const goal = await load((await params).id).catch(() => null);
  return goal ? { title: goal.title, description: `${goalTag(goal)} · 하루 ${formatMinutes(goal.daily_minutes)}` } : { title: "목표를 찾을 수 없어요" };
}

const NOTICES: Record<string, string> = { created: "목표를 저장했어요.", updated: "고친 내용을 저장했어요." };

export default async function GoalPage({ params, searchParams }: { params: Params; searchParams: Promise<{ notice?: string }> }) {
  const { id } = await params;
  const goal = await load(id);
  if (!goal) notFound();
  const notice = NOTICES[(await searchParams).notice ?? ""];
  const photo = materialUrl(goal);
  const kind = KINDS.find((item) => item.value === goal.kind)!;

  return (
    <main className="screen detail">
      <div className="topbar">
        <NavButton href="/goals" icon="chevL" label="목록으로 돌아가기" />
        <DeleteGoalButton action={deleteGoal.bind(null, goal.id)} title={goal.title} />
      </div>
      {notice && <Notice tone="success">{notice}</Notice>}

      <header className="detail-head">
        <Pill tone={kindTone(goal.kind)}>{goalTag(goal)}</Pill>
        <h1>{goal.title}</h1>
        <p className="meta">
          {goal.deadline ? `${formatDate(goal.deadline)}까지` : kind.label} · 하루 {formatMinutes(goal.daily_minutes)}
        </p>
      </header>

      <Section title="한눈에">
        <dl className="facts">
          <div>
            <dt>기한</dt>
            <dd>{goal.deadline ? formatDate(goal.deadline) : kind.label}</dd>
          </div>
          <div>
            <dt>쓸 수 있는 시간</dt>
            <dd>{timeBudget(goal)}</dd>
          </div>
          <div>
            <dt>언제</dt>
            <dd className={goal.schedule ? undefined : "muted"}>{goal.schedule ?? "정하지 않았어요"}</dd>
          </div>
        </dl>
      </Section>

      <Section title="지금 상황">
        <p className={goal.note ? "plain" : "plain muted"}>{goal.note ?? "적지 않았어요."}</p>
      </Section>

      <Section title="실행할 때 잠글 앱" aside={goal.lock_apps.length ? `${goal.lock_apps.length}개` : undefined}>
        {goal.lock_apps.length ? (
          <ul className="tags" aria-label="잠글 앱">
            {goal.lock_apps.map((app) => (
              <li key={app}>
                <Icon name="lock" size={14} weight={2} />
                {app}
              </li>
            ))}
          </ul>
        ) : (
          <p className="plain muted">고르지 않았어요. 전화, 메신저, 검색은 언제나 열려 있어요.</p>
        )}
      </Section>

      <Section title="자료 사진">
        {photo ? (
          <a className="material-view" href={photo} target="_blank" rel="noreferrer" aria-label="자료 사진 크게 보기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`${goal.title} 자료 사진`} />
          </a>
        ) : (
          <p className="material-empty">
            <Icon name="image" size={20} />
            올린 사진이 없어요. 목표 고치기에서 목차나 범위 사진을 올릴 수 있어요.
          </p>
        )}
      </Section>

      <Section title="기록">
        <dl className="facts">
          <div>
            <dt>만든 때</dt>
            <dd>{formatDateTime(goal.created_at)}</dd>
          </div>
          <div>
            <dt>고친 때</dt>
            <dd>{goal.updated_at !== goal.created_at ? formatDateTime(goal.updated_at) : "아직 고치지 않았어요"}</dd>
          </div>
        </dl>
      </Section>

      <div className="dock">
        <ButtonLink href={`/goals/${goal.id}/edit`} variant="soft">
          <Icon name="pen" size={18} />
          목표 고치기
        </ButtonLink>
      </div>
    </main>
  );
}
