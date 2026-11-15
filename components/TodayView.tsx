import { CoachTour, TourButton, type TourStep } from "@/components/CoachTour";
import { ReplanButton } from "@/components/GoalActions";
import { regeneratePlan } from "@/app/goals/actions";
import { TaskVerify } from "@/components/TaskVerify";
import { StallNudge } from "@/components/StallNudge";
import { Celebrate, StreakBadge } from "@/components/Celebrate";
import { LockState, LockSync, StartButton, VerifyNext } from "@/components/TodayActions";
import { ButtonLink, EmptyState, RowLink, TabBar } from "@/components/ui";
import { formatMinutes, formatToday, goalTag, lockLabels, tasksOn, type Goal, type Proof } from "@/lib/goals";
import type { Unplanned } from "@/lib/supabase";

type Props = {
  goals: Goal[];
  today: string;
  proofs: Proof[];
  lockTargets: string[];
  started: boolean;
  streak: number;
  tomorrow: string[];
  missed?: string | null; // "어제 못 한 일 2가지가 있어요". 있으면 정리하러 가는 줄을 보여 준다.
  unplanned?: Unplanned | null; // 계획이 없는 목표(만들지 못했거나 목표일이 지나 지운 것). 오늘 할 일이 없을 때 그 목표로 안내한다.
  next?: { id: string; title: string } | null; // 계획이 끝나 다음 계획을 물을 목표(인증이 밀린 채 끝났거나 매주 반복)
  achieved?: boolean; // 끝난 계획을 모두 인증해 해냈는지
  adjustedToday?: boolean; // 오늘 코치와 조정했는지
};

// 잠그는 곳이 여럿이면 첫 번째만 적고 나머지는 수로 줄인다.
function shortLocks(targets: string[]) {
  const labels = lockLabels(targets);
  // "인스타그램 릴스"처럼 화면까지 고른 것은 화면 이름만 적어 한 줄에 들어가게 한다.
  const first = labels[0]?.includes(" ") ? labels[0].split(" ").pop() : labels[0];
  return labels.length > 1 ? `${first} 외 ${labels.length - 1}개` : (first ?? "");
}

// 오늘 할 일이 있는 목표의 맥락 한 줄: 어느 목표의 몇째 주인지, 남은 날, 오늘 걸리는 시간.
function contextOf(goals: Goal[], today: string, minutes: number) {
  const week = (goal: Goal) => goal.plan?.weeks?.find((item) => item.start <= today && today <= item.end) ?? null;
  const parts: string[] = [];
  if (goals.length === 1) {
    const [goal] = goals;
    parts.push(goal.title);
    if (goal.kind !== "finish") parts.push(goalTag(goal));
    const current = week(goal);
    if (current) parts.push(`${current.week}주차`);
  } else if (goals.length > 1) {
    parts.push(`${goals[0].title} 외 ${goals.length - 1}개`);
  }
  if (minutes > 0) parts.push(`약 ${formatMinutes(minutes)}`);
  const focus = goals.length === 1 ? week(goals[0])?.focus : null;
  return { line: parts.join(" · "), focus };
}

// 처음 온 사람에게 코치가 짚어 주는 것들. 화면에 없는 것은 알아서 건너뛴다.
const TOUR: TourStep[] = [
  { target: ".today-list", text: "오늘 할 일이에요. 누르면 인증할 수 있어요." },
  { target: ".today .dock .btn", text: "시작하면 고른 앱이 잠겨요. 다 인증하기 전에는 풀리지 않아요." },
  { target: `.tabbar a[href="/coach"]`, text: "버거운 날엔 시작하기 전에 코치에게 말해 주세요." },
];

// 오늘 화면의 본문. 여러 목표의 계획에서 오늘 날짜의 할 일만 꺼내 한 목록으로 보여 준다.
// 위에서부터: 맥락 한 줄 → 잠금 상태(남은 수) → 놓친 날 → 할 일 → 이번 주 초점 → 코치의 한마디 → 버튼.
export function TodayView({ goals, today, proofs, lockTargets, started, streak, tomorrow, missed, unplanned, next, achieved, adjustedToday }: Props) {
  const tasks = goals.flatMap((goal) => tasksOn(goal, today).map((task) => ({ task, goal })));
  const proofOf = (goalId: string, taskId: string) => proofs.find((proof) => proof.goal_id === goalId && proof.task_id === taskId) ?? null;
  const passed = tasks.filter(({ task, goal }) => proofOf(goal.id, task.id)?.passed).length;
  const total = tasks.reduce((sum, { task }) => sum + task.minutes, 0);
  const allDone = tasks.length > 0 && passed === tasks.length;
  const locked = started && !allDone && tasks.length > 0 && lockTargets.length > 0;
  const left = tasks.length - passed;
  const active = goals.filter((goal) => tasksOn(goal, today).length > 0);
  const context = contextOf(active, today, total);
  // 앞으로 할 일이 남은 계획이 하나도 없으면, 쉬는 날이 아니라 계획이 끝난 것이다.
  const ahead = goals.some((goal) => goal.plan?.days?.some((day) => day.date > today && day.tasks.length > 0));
  // 목표일까지 인증이 없어 계획을 지운 목표. 목표 화면에서 다시 짜거나 지운다.
  const expiredState = unplanned?.expired ? (
    <EmptyState title="목표일이 마감됐어요" art="candle" action={<ButtonLink href={`/goals/${unplanned.id}`}>계획 재조정하기</ButtonLink>}>
      &lsquo;{unplanned.title}&rsquo; 목표일까지 인증이 없어 계획을 지웠어요. 목표는 그대로 있어요.
    </EmptyState>
  ) : null;

  return (
    <div className="screen today">
      <LockSync active={locked} targets={lockTargets} left={left} />
      <header className="headline">
        <div className="headline-row">
          <p className="date">{formatToday()}</p>
          {/* 연속 기록은 이틀째부터. 첫날의 "오늘이 첫날"은 알려 주는 것이 없다. */}
          {goals.length > 0 && streak >= 2 && <StreakBadge streak={streak} doneToday={allDone} />}
          {tasks.length > 0 && <TourButton id="today" />}
        </div>
        <h1>{allDone ? "오늘 몫을 다 했어요" : "오늘 할 일"}</h1>
        {context.line && <p className="today-context">{context.line}</p>}
      </header>

      {tasks.length > 0 && (
        <LockState
          tone={allDone ? "done" : locked ? "lock" : "idle"}
          hasLocks={lockTargets.length > 0}
          started={started}
          locks={shortLocks(lockTargets)}
          passed={passed}
          total={tasks.length}
        />
      )}

      {missed && (
        <div className="section rows recover-row">
          <RowLink href="/goals/new?talk=recover" icon="repeat" title={missed} sub="옮겨서 이어 하거나 넘길 수 있어요" />
        </div>
      )}

      {goals.length === 0 ? (
        expiredState ? (
          expiredState
        ) : unplanned ? (
          <EmptyState title="계획을 아직 만들지 못했어요" art="goals" action={<ReplanButton action={regeneratePlan.bind(null, unplanned.id)} label="계획 다시 만들기" primary />}>
            목표는 저장돼 있어요. 누르면 코치가 계획을 다시 짜요. 1분쯤 걸려요.
          </EmptyState>
        ) : (
          <EmptyState title="아직 계획이 없어요" art="goals" action={<ButtonLink href="/goals/new">코치에게 목표 말하기</ButtonLink>}>
            목표를 말하면 코치가 날짜별 계획을 짜요.
          </EmptyState>
        )
      ) : tasks.length === 0 ? (
        !ahead && next ? (
          <EmptyState title="계획한 기간이 끝났어요" art="cup" action={<ButtonLink href={`/goals/new?talk=next&goal=${next.id}`}>다음 계획 받기</ButtonLink>}>
            &lsquo;{next.title}&rsquo; 코치와 이어서 짤지, 새로 짤지 정해요.
          </EmptyState>
        ) : !ahead && expiredState ? (
          expiredState
        ) : !ahead && achieved ? (
          <EmptyState title="목표를 해냈어요" art="check" action={<ButtonLink href="/goals/new">새 목표 말하기</ButtonLink>}>
            계획한 일을 모두 인증했어요. 다음 목표가 있으면 코치에게 말해 주세요.
          </EmptyState>
        ) : !ahead ? (
          <EmptyState title="계획한 기간이 끝났어요" art="cup" action={<ButtonLink href="/goals" variant="soft">내 목표 보기</ButtonLink>}>
            목표 화면에서 계획을 이어 갈 수 있어요.
          </EmptyState>
        ) : adjustedToday ? (
          <EmptyState title="오늘 몫은 조정으로 옮겼어요" art="stone" action={<ButtonLink href="/goals" variant="soft">전체 계획 보기</ButtonLink>}>
            옮긴 날에 이어서 하면 돼요.
          </EmptyState>
        ) : (
          <EmptyState title="오늘은 쉬는 날이에요" art="stone" action={<ButtonLink href="/goals" variant="soft">전체 계획 보기</ButtonLink>}>
            잠금도 걸리지 않아요.
          </EmptyState>
        )
      ) : (
        <>
          <section className="group" aria-label="오늘 할 일 목록">
            <ol className="today-list section">
              {tasks.map(({ task, goal }) => {
                const proof = proofOf(goal.id, task.id);
                return (
                  <TaskVerify
                    key={`${goal.id}-${task.id}`}
                    goalId={goal.id}
                    goalTitle={goal.title}
                    task={task}
                    proof={proof && { passed: proof.passed, reason: proof.reason, appealed: Boolean(proof.appeal) }}
                  />
                );
              })}
            </ol>
            {context.focus && !allDone && <p className="group-foot">이번 주 · {context.focus}</p>}
          </section>

          <StallNudge today={today} left={left} started={started} />

          {started && !allDone && <VerifyNext />}

          {!allDone && !started && (
            <div className="dock">
              <StartButton today={today} rows={tasks.map(({ task, goal }) => ({ task, goalTitle: goal.title }))} lockTargets={lockTargets} />
            </div>
          )}
        </>
      )}
      {allDone && <Celebrate today={today} streak={streak} count={tasks.length} tomorrow={tomorrow} unlocked={started && lockTargets.length > 0} />}
      {goals.length > 0 && <CoachTour id="today" steps={TOUR} need=".today-list" />}
      <TabBar active="today" />
    </div>
  );
}
