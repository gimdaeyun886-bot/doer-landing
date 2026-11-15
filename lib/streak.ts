// 연속 기록과 하루하루의 상태. 서버에서 계획·인증·조정 기록으로 계산한다.
import { addDays, tasksOn, type Goal, type Proof } from "./goals";

// done: 할 일을 모두 인증함 / adjusted: 코치와 조정한 뒤 남은 것을 끝냄(놓친 일을 옮겨 모두 인증한 날 포함) / missed: 못 함
// rest: 할 일이 없는 날 / pending: 오늘인데 아직 남음 / before: 계획을 받기 전
export type DayState = "done" | "adjusted" | "missed" | "rest" | "pending" | "before";
export type DayRecord = { date: string; state: DayState; tasks: number; passed: number };

// 놓친 날을 정리하며 옮긴 일(carried)이 모두 인증됐는지. repairs에 든 날만 이렇게 되살린다(lib/recover.ts).
function repaired(goals: Goal[], proofs: Proof[], date: string, left: string[]) {
  const ok = new Set(proofs.filter((proof) => proof.passed).map((proof) => `${proof.goal_id}:${proof.task_id}`));
  const copies = new Map<string, boolean>();
  for (const goal of goals)
    for (const day of goal.plan?.days ?? [])
      for (const task of day.tasks)
        if (task.carried?.date === date) copies.set(`${goal.id}:${task.carried.task_id}`, copies.get(`${goal.id}:${task.carried.task_id}`) || ok.has(`${goal.id}:${task.id}`));
  return left.length > 0 && left.every((key) => copies.get(key) === true);
}

export function dayRecord(goals: Goal[], proofs: Proof[], adjusted: Set<string>, date: string, today: string, repairs?: Set<string>): DayRecord {
  const tasks = goals.flatMap((goal) => tasksOn(goal, date).map((task) => `${goal.id}:${task.id}`));
  const ok = new Set(proofs.filter((proof) => proof.passed && proof.date === date).map((proof) => `${proof.goal_id}:${proof.task_id}`));
  const passed = tasks.filter((key) => ok.has(key)).length;
  const finished = passed === tasks.length;
  const starts = goals.map((goal) => goal.plan?.weeks?.[0]?.start).filter((start): start is string => Boolean(start));
  const first = starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null;
  let state: DayState;
  if (!tasks.length && (!first || date < first)) state = "before";
  else if (adjusted.has(date) && finished) state = "adjusted";
  else if (!tasks.length) state = "rest";
  else if (finished) state = "done";
  else if (date !== today && repairs?.has(date) && repaired(goals, proofs, date, tasks.filter((key) => !ok.has(key)))) state = "adjusted";
  else state = date === today ? "pending" : "missed";
  return { date, state, tasks: tasks.length, passed };
}

// 오늘부터 거꾸로 세어 이어진 날 수. 쉬는 날은 세지도 끊지도 않고, 오늘이 아직이면 어제까지를 센다.
export function streakOf(goals: Goal[], proofs: Proof[], adjusted: Set<string>, today: string, lookback = 120, repairs?: Set<string>) {
  let streak = 0;
  for (let back = 0; back < lookback; back++) {
    const { state } = dayRecord(goals, proofs, adjusted, addDays(today, -back), today, repairs);
    if (state === "done" || state === "adjusted") streak++;
    else if (state === "missed") break;
  }
  return streak;
}

export const MILESTONES = [3, 7, 14, 30, 50, 100];
