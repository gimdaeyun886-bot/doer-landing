// 놓친 날 이어 가기. 지난 며칠 동안 인증하지 못한 할 일을 찾고, 옮기거나 넘기는 안을 만들고, 받은 안을 다시 검사한다.
// 계산만 하는 곳이라 서버와 브라우저가 함께 쓸 수 있다. 저장과 AI 호출은 app/goals/actions.ts가 한다.
import { addDays, formatMinutes, planEnd, tasksOn, totalMinutes, weekdayOf, type AdjustOption, type Goal, type Plan, type PlanTask, type Proof } from "./goals";

// 오늘부터 거꾸로 며칠 안의 놓친 일까지 정리할 수 있는지.
export const RECOVER_DAYS = 3;
// 옮겨 받는 날의 상한: 그날 원래 분량(또는 목표의 하루 시간 중 큰 것)의 두 배까지. 테스트 주간에 맞춰 볼 값이다.
// 1.5배로 두면 하루 시간의 절반이 넘는 과제는 어디에도 들어가지 못했다(2026-11-12 계산 확인).
export const STRETCH = 2;
// 옮겨 받을 수 있는 날: 오늘부터 7일 뒤까지.
export const AHEAD = 7;
// 기록을 되살리는 정리는 7일에 한 번까지.
export const REPAIR_EVERY = 7;

export type Missed = { goal: Goal; date: string; task: PlanTask };
export type RecoverMove = { goal_id: string; task_id: string; to_date: string };
export type RecoverPick = { moves: RecoverMove[]; drops: { goal_id: string; task_id: string }[] };
// 정리 기록 한 줄(adjustments, kind='recover').
export type RecoveryRow = { for_date: string; repairs: boolean };

const keyOf = (goalId: string, taskId: string) => `${goalId}:${taskId}`;

// 날짜를 짧게: 어제, 그제, 아니면 요일.
export function dayWord(date: string, today: string) {
  if (date === addDays(today, -1)) return "어제";
  if (date === addDays(today, -2)) return "그제";
  if (date === today) return "오늘";
  return `${weekdayOf(date)}요일`;
}

// 아직 정리하지 않은 지난 날의, 인증하지 못한 할 일. 옮겨 온 일(carried)은 다시 옮기지 않으므로 넣지 않는다.
export function findMissed(goals: Goal[], proofs: Proof[], resolved: Set<string>, today: string): Missed[] {
  const passed = new Set(proofs.filter((proof) => proof.passed).map((proof) => `${proof.date}|${keyOf(proof.goal_id, proof.task_id)}`));
  const missed: Missed[] = [];
  for (let back = RECOVER_DAYS; back >= 1; back--) {
    const date = addDays(today, -back);
    if (resolved.has(date)) continue;
    for (const goal of goals) {
      for (const task of tasksOn(goal, date)) {
        if (task.carried || passed.has(`${date}|${keyOf(goal.id, task.id)}`)) continue;
        missed.push({ goal, date, task });
      }
    }
  }
  return missed;
}

// 오늘 화면의 한 줄: "어제 못 한 일 2가지가 있어요".
export function missedLine(missed: Missed[], today: string) {
  if (!missed.length) return null;
  const dates = [...new Set(missed.map((item) => item.date))];
  const when = dates.length === 1 ? dayWord(dates[0], today) : `지난 ${RECOVER_DAYS}일 동안`;
  return `${when} 못 한 일 ${missed.length}가지가 있어요`;
}

// 기록을 되살리는 정리를 지금 쓸 수 있는지. 최근 7일 안에 이미 썼으면 안 된다.
export const canRepair = (rows: RecoveryRow[], today: string) => !rows.some((row) => row.repairs && row.for_date >= addDays(today, -REPAIR_EVERY));

type Ctx = { goals: Goal[]; missed: Missed[]; today: string; todayOpen: boolean };

// 그 목표에서 옮겨 받을 수 있는 날인지. 쉬는 날, 계획 밖, 매주 반복 목표는 안 된다.
// 오늘은 오늘 할 일이 아직 남아 있을 때만 받는다(다 끝낸 날에 다시 잠금이 걸리지 않게).
function canReceive(goal: Goal, date: string, ctx: Ctx) {
  if (goal.kind === "ongoing" || !goal.plan) return false;
  if (date < ctx.today || date > addDays(ctx.today, AHEAD)) return false;
  if (date === ctx.today && !ctx.todayOpen) return false;
  const end = planEnd(goal.plan);
  if (end && date > end) return false;
  if (goal.kind === "dated" && goal.deadline && date > goal.deadline) return false;
  return tasksOn(goal, date).length > 0;
}

// 그날 더 넣을 수 있는 분.
// 조정(오늘 일을 다른 날로 옮기기)도 같은 상한을 쓴다.
export function room(goal: Pick<Goal, "plan" | "plan_status" | "daily_minutes">, date: string) {
  const tasks = tasksOn(goal, date);
  const base = totalMinutes(tasks.filter((task) => !task.carried));
  return Math.max(0, Math.round(STRETCH * Math.max(goal.daily_minutes, base)) - totalMinutes(tasks));
}

// 코치에게 알려 줄, 목표마다 옮겨 받을 수 있는 날과 그날 더 넣을 수 있는 분.
export function slotsFor(ctx: Ctx) {
  const goals = [...new Map(ctx.missed.map((item) => [item.goal.id, item.goal])).values()];
  return goals.flatMap((goal) =>
    Array.from({ length: AHEAD + 1 }, (_, ahead) => addDays(ctx.today, ahead))
      .filter((date) => canReceive(goal, date, ctx) && room(goal, date) > 0)
      .map((date) => ({ goal_id: goal.id, date, room: room(goal, date), load: totalMinutes(tasksOn(goal, date)) })),
  );
}

// 기본안 "남은 날에 나눠 하기": 오래된 것부터, 아직 아무것도 더하지 않은 가장 이른 날에 하나씩 넣는다.
// 그런 날이 없으면 들어갈 수 있는 가장 이른 날에 넣고, 어디에도 안 들어가는 것은 넘긴다.
export function spread(ctx: Ctx): RecoverPick {
  const used = new Map<string, number>();
  const pick: RecoverPick = { moves: [], drops: [] };
  const fits = (goal: Goal, date: string, minutes: number) => canReceive(goal, date, ctx) && room(goal, date) - (used.get(`${goal.id}|${date}`) ?? 0) >= minutes;
  const dates = Array.from({ length: AHEAD + 1 }, (_, ahead) => addDays(ctx.today, ahead));
  for (const { goal, task } of ctx.missed) {
    const date = goal.kind === "ongoing" ? undefined : (dates.find((day) => !used.has(`${goal.id}|${day}`) && fits(goal, day, task.minutes)) ?? dates.find((day) => fits(goal, day, task.minutes)));
    if (!date) {
      pick.drops.push({ goal_id: goal.id, task_id: task.id });
      continue;
    }
    used.set(`${goal.id}|${date}`, (used.get(`${goal.id}|${date}`) ?? 0) + task.minutes);
    pick.moves.push({ goal_id: goal.id, task_id: task.id, to_date: date });
  }
  return pick;
}

// 브라우저나 AI가 보낸 안을 다시 검사한다. 놓친 일이 아닌 것은 버리고, 언급하지 않은 놓친 일은 넘긴 것으로 본다.
// 옮기는 날이 규칙(쉬는 날, 범위, 하루 상한, 매주 반복)에 어긋나면 안 전체를 버린다(null). 대가 설명이 틀어지기 때문이다.
export function checkPick(raw: unknown, ctx: Ctx): RecoverPick | null {
  const source = (raw ?? {}) as { moves?: unknown; drops?: unknown };
  const moves = Array.isArray(source.moves) ? source.moves : [];
  const byKey = new Map(ctx.missed.map((item) => [keyOf(item.goal.id, item.task.id), item]));
  const used = new Map<string, number>();
  const seen = new Set<string>();
  const pick: RecoverPick = { moves: [], drops: [] };
  for (const entry of moves) {
    const move = (entry ?? {}) as Partial<RecoverMove>;
    const key = keyOf(String(move.goal_id), String(move.task_id));
    const item = byKey.get(key);
    if (!item || seen.has(key)) continue;
    const to = String(move.to_date);
    const slot = `${item.goal.id}|${to}`;
    if (!canReceive(item.goal, to, ctx) || room(item.goal, to) - (used.get(slot) ?? 0) < item.task.minutes) return null;
    used.set(slot, (used.get(slot) ?? 0) + item.task.minutes);
    seen.add(key);
    pick.moves.push({ goal_id: item.goal.id, task_id: item.task.id, to_date: to });
  }
  for (const item of ctx.missed) {
    if (!seen.has(keyOf(item.goal.id, item.task.id))) pick.drops.push({ goal_id: item.goal.id, task_id: item.task.id });
  }
  return pick;
}

// 이번 정리로 기록을 되살릴 날: 놓친 일을 모두 옮긴 날 가운데 가장 최근 하루.
export function repairDate(pick: RecoverPick, missed: Missed[]) {
  const moved = new Set(pick.moves.map((move) => keyOf(move.goal_id, move.task_id)));
  const dates = [...new Set(missed.map((item) => item.date))].sort().reverse();
  return dates.find((date) => missed.filter((item) => item.date === date).every((item) => moved.has(keyOf(item.goal.id, item.task.id)))) ?? null;
}

// 고르면 생기는 일. 사업 규칙이라 AI가 아니라 코드가 쓴다.
export function describePick(pick: RecoverPick, ctx: Ctx, repairOk: boolean) {
  const byKey = new Map(ctx.missed.map((item) => [keyOf(item.goal.id, item.task.id), item]));
  const parts: string[] = [];
  const added = new Map<string, number>();
  for (const move of pick.moves) added.set(move.to_date, (added.get(move.to_date) ?? 0) + (byKey.get(keyOf(move.goal_id, move.task_id))?.task.minutes ?? 0));
  if (added.size) {
    const list = [...added].sort(([a], [b]) => a.localeCompare(b)).map(([date, minutes]) => `${date === ctx.today ? "오늘" : `${weekdayOf(date)}요일`}에 ${formatMinutes(minutes)}`);
    parts.push(`${list.join(", ")}이 더해져요.`);
  }
  const dropped = pick.drops.map((drop) => byKey.get(keyOf(drop.goal_id, drop.task_id))).filter((item): item is Missed => Boolean(item));
  const ongoing = dropped.filter((item) => item.goal.kind === "ongoing").length;
  const others = dropped.length - ongoing;
  if (others) parts.push(`${others}가지는 다시 하지 않아요${dropped.some((item) => item.goal.kind === "dated") ? ". 그만큼 준비가 줄어요." : "."}`);
  if (ongoing) parts.push("매주 반복 목표는 몰아서 하지 않고 다음 회차를 그대로 해요.");
  const repair = repairOk ? repairDate(pick, ctx.missed) : null;
  const missedDates = [...new Set(ctx.missed.map((item) => item.date))];
  if (repair) parts.push(`옮긴 일을 모두 인증하면 ${dayWord(repair, ctx.today)} 기록이 '조정'으로 바뀌어요.`);
  else if (pick.moves.length && !repairOk && repairDate(pick, ctx.missed)) parts.push(`기록을 되살리는 건 7일에 한 번이라, ${missedDates.map((date) => dayWord(date, ctx.today)).join("·")} 기록은 '못 함'으로 남아요.`);
  else parts.push(`${missedDates.map((date) => dayWord(date, ctx.today)).join("·")} 기록은 '못 함'으로 남아요.`);
  return parts.join(" ");
}

// 코드가 만드는 기본안. AI가 없거나 실패해도 이것만으로 정리할 수 있다.
export function basicOptions(ctx: Ctx, repairOk: boolean): AdjustOption[] {
  const options: AdjustOption[] = [];
  const spreadPick = spread(ctx);
  if (spreadPick.moves.length) {
    const all = !spreadPick.drops.some((drop) => ctx.missed.find((item) => item.goal.id === drop.goal_id && item.task.id === drop.task_id)?.goal.kind !== "ongoing");
    // 받는 날이 하루뿐이면 "나눠 하기"가 아니라 그날 이어 하기다.
    const days = [...new Set(spreadPick.moves.map((move) => move.to_date))];
    const label = !all ? "들어가는 것만 옮기기" : days.length > 1 ? "남은 날에 나눠 하기" : days[0] === ctx.today ? "오늘 이어 하기" : `${weekdayOf(days[0])}요일에 이어 하기`;
    options.push({ label, impact: describePick(spreadPick, ctx, repairOk), ...spreadPick });
  }
  const dropAll: RecoverPick = { moves: [], drops: ctx.missed.map((item) => ({ goal_id: item.goal.id, task_id: item.task.id })) };
  options.push({ label: "이번엔 넘기기", impact: describePick(dropAll, ctx, repairOk), ...dropAll });
  return options;
}

// 고른 안을 계획에 반영한다. 지난 날의 계획은 그대로 두고, 옮길 일의 사본을 받는 날에 더한다.
export function applyPick(pick: RecoverPick, missed: Missed[]): Map<string, Plan> {
  const byKey = new Map(missed.map((item) => [keyOf(item.goal.id, item.task.id), item]));
  const plans = new Map<string, Plan>();
  for (const move of pick.moves) {
    const item = byKey.get(keyOf(move.goal_id, move.task_id));
    if (!item?.goal.plan) continue;
    const plan = plans.get(item.goal.id) ?? (structuredClone(item.goal.plan) as Plan);
    plans.set(item.goal.id, plan);
    const day = plan.days.find((entry) => entry.date === move.to_date);
    if (!day) continue;
    const ids = new Set(day.tasks.map((task) => task.id));
    let n = 1;
    while (ids.has(`${move.to_date}-c${n}`)) n++;
    day.tasks.push({ ...item.task, id: `${move.to_date}-c${n}`, carried: { date: item.date, task_id: item.task.id } });
  }
  return plans;
}

export type { Ctx as RecoverContext };
