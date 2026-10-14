import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTile } from "@/components/AppTile";
import { DeleteGoalButton } from "@/components/DeleteGoalButton";
import { MonthCalendar } from "@/components/MonthCalendar";
import { Icon, NavButton, Notice, Section } from "@/components/ui";
import { formatDate, formatDateTime, formatMinutes, goalTag, isUuid, kindInfo, kindTone, outlook, progress, todayInSeoul, weekdaysText } from "@/lib/goals";
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
  if (!goal) return { title: "목표를 찾을 수 없어요" };
  const description = `${goalTag(goal)} · ${weekdaysText(goal.weekdays)} 하루 ${formatMinutes(goal.daily_minutes)}`;
  return { title: goal.title, description, openGraph: { title: goal.title, description } };
}

const NOTICES: Record<string, string> = { created: "목표를 저장했어요.", updated: "고친 내용을 저장했어요." };

export default async function GoalPage({ params, searchParams }: { params: Params; searchParams: Promise<{ notice?: string }> }) {
  const { id } = await params;
  const goal = await load(id);
  if (!goal) notFound();
  const notice = NOTICES[(await searchParams).notice ?? ""];
  const photo = materialUrl(goal);
  const kind = kindInfo(goal.kind);
  const look = outlook(goal);
  const passed = progress(goal);
  const edited = goal.updated_at !== goal.created_at;

  return (
    <main className="screen detail">
      <div className="topbar">
        <NavButton href="/goals" icon="chevL" label="목록으로 돌아가기" />
        <div className="topbar-actions">
          <Link href={`/goals/${goal.id}/edit`} className="nav-btn" aria-label="이 목표 고치기">
            <Icon name="pen" size={20} />
          </Link>
          <DeleteGoalButton action={deleteGoal.bind(null, goal.id)} title={goal.title} />
        </div>
      </div>
      {notice && <Notice tone="success">{notice}</Notice>}

      <header className="hero">
        <span className={`hero-tag tone-${kindTone(goal.kind)}`}>{goalTag(goal)}</span>
        <h1>{goal.title}</h1>
        <p>{goal.deadline ? `${formatDate(goal.deadline)}까지` : kind.label}</p>
        {passed && (
          <div className="hero-progress">
            <span className="bar" role="progressbar" aria-label="지나간 기간" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(passed.ratio * 100)}>
              <span style={{ width: `${Math.max(3, passed.ratio * 100)}%` }} />
            </span>
            <p>
              <span>{passed.passed ? `${passed.passed}일 지났어요` : "오늘 시작"}</span>
              <span>{passed.left ? `${passed.left}일 남았어요` : "오늘이 목표일"}</span>
            </p>
          </div>
        )}
      </header>

      <Section title={goal.kind === "dated" ? "목표일까지" : "앞으로"} aside={look.label}>
        <MonthCalendar today={todayInSeoul()} deadline={goal.kind === "dated" ? goal.deadline : null} weekdays={goal.weekdays} />
        <dl className="facts">
          <div>
            <dt>할 때</dt>
            <dd>
              {weekdaysText(goal.weekdays)} · 하루 {formatMinutes(goal.daily_minutes)}
            </dd>
          </div>
          {goal.schedule && (
            <div>
              <dt>시간대</dt>
              <dd>{goal.schedule}</dd>
            </div>
          )}
        </dl>
      </Section>

      <Section title="실행할 때 잠글 앱" aside={goal.lock_apps.length ? `${goal.lock_apps.length}개` : undefined}>
        {goal.lock_apps.length ? (
          <ul className="app-list" aria-label="잠글 앱">
            {goal.lock_apps.map((app) => (
              <li key={app}>
                <AppTile name={app} size={44} />
                <span>{app}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="plain muted">고르지 않았어요.</p>
        )}
        <p className="row-hint">전화, 메신저, 검색은 언제나 열려 있어요.</p>
      </Section>

      <Section title="지금 상황">
        <p className={goal.note ? "plain" : "plain muted"}>{goal.note ?? "적지 않았어요."}</p>
      </Section>

      <Section title="자료 사진">
        {photo ? (
          <a className="material-view" href={photo} target="_blank" rel="noreferrer" aria-label="자료 사진 크게 보기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`${goal.title} 자료 사진`} />
          </a>
        ) : (
          <Link href={`/goals/${goal.id}/edit`} className="material-empty">
            <Icon name="image" size={22} />
            <span>
              <b>올린 사진이 없어요</b>
              <small>목차나 시험 범위를 찍어 올려 두세요</small>
            </span>
            <Icon name="chevR" size={16} />
          </Link>
        )}
      </Section>

      <p className="stamp">
        {formatDateTime(goal.created_at)}에 만들었어요{edited && ` · ${formatDateTime(goal.updated_at)}에 고쳤어요`}
      </p>
    </main>
  );
}
