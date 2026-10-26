import { CoachTour, type TourStep } from "@/components/CoachTour";
import { TaskVerify } from "@/components/TaskVerify";
import { StallNudge } from "@/components/StallNudge";
import { Celebrate, StreakBadge } from "@/components/Celebrate";
import { LockSync, StartButton, VerifyNext } from "@/components/TodayActions";
import { Art, ButtonLink, EmptyState, Icon, TabBar } from "@/components/ui";
import {
  formatMinutes,
  formatToday,
  lockLabels,
  tasksOn,
  type Goal,
  type Proof,
} from "@/lib/goals";

type Props = {
  goals: Goal[];
  today: string;
  proofs: Proof[];
  lockTargets: string[];
  started: boolean;
  streak: number;
  tomorrow: string[];
};

// 잠그는 곳이 여럿이면 첫 번째만 적고 나머지는 수로 줄인다.
function shortLocks(targets: string[]) {
  const labels = lockLabels(targets);
  // "인스타그램 릴스"처럼 화면까지 고른 것은 화면 이름만 적어 한 줄에 들어가게 한다.
  const first = labels[0]?.includes(" ")
    ? labels[0].split(" ").pop()
    : labels[0];
  return labels.length > 1
    ? `${first} 외 ${labels.length - 1}개`
    : (first ?? "");
}

// 처음 온 사람에게 코치가 짚어 주는 것들. 화면에 없는 것은 알아서 건너뛴다.
const TOUR: TourStep[] = [
  { text: "반가워요. 이 화면 쓰는 법을 30초만 알려 드릴게요." },
  {
    target: ".today-list",
    text: "오늘 할 일은 제가 정해 둬요. 하나씩 눌러서 인증하면 돼요.",
  },
  {
    target: ".today .dock .btn",
    text: "시작하면 고른 앱이 잠겨요. 다 인증하면 풀리고, 중간에 바로 푸는 방법은 없어요.",
  },
  {
    target: `.tabbar a[href="/goals/new"]`,
    text: "버거운 날엔 코치에게 말해 주세요. 바꿀 방법과 그 대가를 보여 드릴게요.",
  },
  {
    target: `.tabbar a[href="/goals"]`,
    text: "전체 계획과 제가 그렇게 짠 이유는 목표에서 볼 수 있어요.",
  },
];

// 오늘 화면의 본문. 여러 목표의 계획에서 오늘 날짜의 할 일만 꺼내 한 목록으로 보여 준다.
export function TodayView({
  goals,
  today,
  proofs,
  lockTargets,
  started,
  streak,
  tomorrow,
}: Props) {
  const tasks = goals.flatMap((goal) =>
    tasksOn(goal, today).map((task) => ({ task, goal })),
  );
  const proofOf = (goalId: string, taskId: string) =>
    proofs.find(
      (proof) => proof.goal_id === goalId && proof.task_id === taskId,
    ) ?? null;
  const passed = tasks.filter(
    ({ task, goal }) => proofOf(goal.id, task.id)?.passed,
  ).length;
  const total = tasks.reduce((sum, { task }) => sum + task.minutes, 0);
  const allDone = tasks.length > 0 && passed === tasks.length;
  const locked = started && !allDone && tasks.length > 0;
  const left = tasks.length - passed;

  return (
    <div className="screen today">
      <LockSync active={locked} targets={lockTargets} left={left} />
      <header className="headline">
        <div className="headline-row">
          <p className="date">{formatToday()}</p>
          {goals.length > 0 && (
            <StreakBadge streak={streak} doneToday={allDone} />
          )}
        </div>
        <h1>{allDone ? "오늘 몫을 다 했어요" : "오늘 할 일"}</h1>
      </header>

      {goals.length === 0 ? (
        <EmptyState
          title="아직 계획이 없어요"
          action={
            <ButtonLink href="/goals/new">코치에게 목표 말하기</ButtonLink>
          }
        >
          목표를 말하면 코치가 날짜별 계획을 짜요.
        </EmptyState>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="오늘은 쉬는 날이에요"
          action={
            <ButtonLink href="/goals" variant="soft">
              전체 계획 보기
            </ButtonLink>
          }
        >
          잠금도 걸리지 않아요.
        </EmptyState>
      ) : (
        <>
          {/* 오늘의 주인공 하나: 남은 수와 잠금 상태. 오른쪽 자물쇠 오브제가 상태를 함께 보여 준다. */}
          <section
            className="hero"
            data-tone={allDone ? "done" : locked ? "lock" : "idle"}
          >
            <div className="hero-text">
              <p className="hero-label">
                {allDone ? "오늘 몫 끝" : locked ? "잠금 중" : "시작 전"}
              </p>
              <p className="hero-num">
                <b>{allDone ? tasks.length : left}</b>
                <span>{allDone ? "가지 모두 인증" : "가지 남음"}</span>
              </p>
              <p
                className="status"
                data-tone={allDone ? "done" : locked ? "lock" : "idle"}
                role="status"
              >
                <Icon
                  name={allDone ? "check" : "lock"}
                  size={15}
                  weight={2.2}
                />
                {allDone
                  ? lockTargets.length
                    ? "잠금이 풀렸어요"
                    : "모두 인증했어요"
                  : locked
                    ? `${shortLocks(lockTargets) || "고른 앱"} 잠김`
                    : lockTargets.length
                      ? `시작하면 잠겨요 · ${shortLocks(lockTargets)}`
                      : "잠글 앱을 아직 고르지 않았어요"}
              </p>
            </div>
            <Art
              name={allDone ? "lock-open" : locked ? "lock" : "stone"}
              size={108}
              className="hero-art"
              priority
            />
          </section>

          <section aria-label="오늘 할 일 목록">
            <ol className="today-list">
              {tasks.map(({ task, goal }) => {
                const proof = proofOf(goal.id, task.id);
                return (
                  <TaskVerify
                    key={`${goal.id}-${task.id}`}
                    goalId={goal.id}
                    goalTitle={goal.title}
                    task={task}
                    proof={
                      proof && {
                        passed: proof.passed,
                        reason: proof.reason,
                        appealed: Boolean(proof.appeal),
                      }
                    }
                  />
                );
              })}
            </ol>
          </section>

          <div className="today-sum">
            {passed > 0 && (
              <div
                className="progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={tasks.length}
                aria-valuenow={passed}
                aria-label="오늘 인증한 할 일"
              >
                <i style={{ width: `${(passed / tasks.length) * 100}%` }} />
              </div>
            )}
          </div>

          {locked && <VerifyNext />}

          {!allDone && !started && (
            <div className="dock">
              <StartButton
                today={today}
                rows={tasks.map(({ task, goal }) => ({
                  task,
                  goalTitle: goal.title,
                }))}
                lockTargets={lockTargets}
              />
            </div>
          )}
        </>
      )}
      {allDone && (
        <Celebrate
          today={today}
          streak={streak}
          count={tasks.length}
          tomorrow={tomorrow}
        />
      )}
      <StallNudge today={today} left={left} started={started} />
      {goals.length > 0 && (
        <CoachTour id="today" steps={TOUR} need=".today-list" />
      )}
      <TabBar active="today" />
    </div>
  );
}
