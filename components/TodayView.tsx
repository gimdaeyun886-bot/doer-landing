import Link from "next/link";
import { StartButton } from "@/components/GoalActions";
import { ButtonLink, CoachLine, EmptyState, Icon, Notice, TabBar, kindTone } from "@/components/ui";
import { formatMinutes, formatToday, type Goal } from "@/lib/goals";

// 오늘 화면의 본문. 여러 목표의 할 일을 하루치로 합쳐 보여 준다. 실제 화면과 디자인 미리보기가 함께 쓴다.
export function TodayView({ goals, notice, goalHref = (id: string) => `/goals/${id}` }: { goals: Goal[]; notice?: string; goalHref?: (id: string) => string }) {
  const tasks = goals.flatMap((goal) => (goal.plan?.today ?? []).map((task) => ({ ...task, goal })));
  const total = tasks.reduce((sum, task) => sum + task.minutes, 0);
  const locks = [...new Set(goals.flatMap((goal) => goal.lock_targets))];
  const lead = goals[0]?.plan?.summary;

  return (
    <div className="screen screen-warm today">
      <header className="headline">
        <p className="date">{formatToday()}</p>
        <h1>오늘 할 일</h1>
      </header>
      {notice === "created" && <Notice tone="success">계획을 만들었어요. 오늘 할 일을 확인해 보세요.</Notice>}

      {tasks.length === 0 ? (
        <EmptyState title="아직 오늘 할 일이 없어요" action={<ButtonLink href="/goals/new">코치에게 목표 말하기</ButtonLink>}>
          해내고 싶은 걸 코치에게 말하면, 계획을 짜서 오늘 몫을 나눠 줘요.
        </EmptyState>
      ) : (
        <>
          {lead && <CoachLine>{lead}</CoachLine>}
          <section className="card" aria-label="오늘 할 일 목록">
            <ol className="today-list">
              {tasks.map((task, index) => (
                <li key={`${task.goal.id}-${index}`}>
                  <Link href={goalHref(task.goal.id)}>
                    <span className={`num num-${kindTone(task.goal.kind)}`}>{index + 1}</span>
                    <span className="today-text">
                      <b>{task.title}</b>
                      <small>{task.goal.title}</small>
                    </span>
                    <span className="today-min">{formatMinutes(task.minutes)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
          <p className="today-sum">
            <span>{tasks.length}가지</span>
            <b>모두 {formatMinutes(total)}</b>
          </p>

          <div className="dock">
            <p className="lock-note">
              <Icon name="lock" size={15} weight={2} />
              {locks.length ? `시작하면 ${locks.join("·")} 화면이 잠기고, 모두 인증하면 열려요` : "시작하면 고른 화면이 잠기고, 모두 인증하면 열려요"}
            </p>
            <StartButton lockTargets={locks} />
          </div>
        </>
      )}
      <TabBar active="today" />
    </div>
  );
}
