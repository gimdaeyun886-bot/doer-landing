import { StartButton } from "@/components/GoalActions";
import { TaskVerify } from "@/components/TaskVerify";
import { ButtonLink, CoachLine, EmptyState, Icon, Notice, TabBar, kindTone } from "@/components/ui";
import { formatMinutes, formatToday, tasksOn, type Goal, type Proof } from "@/lib/goals";

// 오늘 화면의 본문. 여러 목표의 계획에서 오늘 날짜의 할 일만 꺼내 한 목록으로 보여 준다.
export function TodayView({ goals, today, proofs, lockTargets }: { goals: Goal[]; today: string; proofs: Proof[]; lockTargets: string[] }) {
  const tasks = goals.flatMap((goal) => tasksOn(goal, today).map((task) => ({ task, goal })));
  const proofOf = (goalId: string, taskId: string) => proofs.find((proof) => proof.goal_id === goalId && proof.task_id === taskId) ?? null;
  const passed = tasks.filter(({ task, goal }) => proofOf(goal.id, task.id)?.passed).length;
  const total = tasks.reduce((sum, { task }) => sum + task.minutes, 0);
  const allDone = tasks.length > 0 && passed === tasks.length;
  const locks = lockTargets.join("·");

  return (
    <div className="screen screen-warm today">
      <header className="headline">
        <p className="date">{formatToday()}</p>
        <h1>{allDone ? "오늘 몫을\n다 해냈어요" : "오늘 할 일"}</h1>
      </header>

      {goals.length === 0 ? (
        <EmptyState title="아직 계획이 없어요" action={<ButtonLink href="/goals/new">코치에게 목표 말하기</ButtonLink>}>
          해내고 싶은 걸 코치에게 말하면, 끝나는 날까지의 계획을 짜서 매일 오늘 몫을 보여 줘요.
        </EmptyState>
      ) : tasks.length === 0 ? (
        <EmptyState title="오늘은 쉬는 날이에요" action={<ButtonLink href="/goals" variant="soft">전체 계획 보기</ButtonLink>}>
          계획에 오늘 할 일이 없어요. 잠금도 걸리지 않아요.
        </EmptyState>
      ) : (
        <>
          {allDone ? (
            <Notice tone="success">{lockTargets.length ? `${tasks.length}가지를 모두 인증했어요. ${locks} 잠금이 풀려요.` : `${tasks.length}가지를 모두 인증했어요.`}</Notice>
          ) : (
            <CoachLine>오늘 자정까지 아래 {tasks.length}가지를 끝내고 사진으로 인증해 주세요. 할 일을 누르면 인증할 수 있어요.</CoachLine>
          )}

          <section className="card" aria-label="오늘 할 일 목록">
            <ol className="today-list">
              {tasks.map(({ task, goal }, index) => {
                const proof = proofOf(goal.id, task.id);
                return <TaskVerify key={`${goal.id}-${task.id}`} goalId={goal.id} goalTitle={goal.title} tone={kindTone(goal.kind)} index={index} task={task} proof={proof && { passed: proof.passed, reason: proof.reason }} />;
              })}
            </ol>
          </section>
          <p className="today-sum">
            <span>
              {tasks.length}가지 중 <b>{passed}가지 인증</b>
            </span>
            <span>모두 약 {formatMinutes(total)}</span>
          </p>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={passed} aria-label="오늘 인증한 할 일">
            <i style={{ width: `${(passed / tasks.length) * 100}%` }} />
          </div>

          {!allDone && (
            <div className="dock">
              <p className="lock-note">
                <Icon name="lock" size={15} weight={2} />
                {lockTargets.length ? `시작하면 잠겨요: ${locks}. 모두 인증하면 열려요` : "잠글 앱을 아직 고르지 않았어요"}
              </p>
              <StartButton lockTargets={lockTargets} />
            </div>
          )}
        </>
      )}
      <TabBar active="today" />
    </div>
  );
}
