"use client";

import { useMemo, useState } from "react";
import { VERIFY_TYPES, addDays, formatDay, formatMinutes, planEnd, totalMinutes, verifyTypeOf, type Plan } from "@/lib/goals";
import { Icon } from "./ui";

const HEAD = ["일", "월", "화", "수", "목", "금", "토"];
const monthOf = (date: string) => date.slice(0, 7);
const monthLabel = (month: string) => `${Number(month.slice(0, 4))}년 ${Number(month.slice(5))}월`;

// 전체 계획을 달력으로 보여 준다. 날짜를 누르면 그날 할 일이 아래에 펼쳐진다.
// passed: 인증을 통과한 과제 id 목록.
export function PlanCalendar({ plan, today, deadline, passed }: { plan: Plan; today: string; deadline: string | null; passed: string[] }) {
  const start = plan.weeks[0].start;
  const end = planEnd(plan) ?? start;
  const byDate = useMemo(() => new Map(plan.days.map((day) => [day.date, day.tasks])), [plan]);
  const done = useMemo(() => new Set(passed), [passed]);
  const initial = today >= start && today <= end ? today : start;
  const [month, setMonth] = useState(monthOf(initial));
  const [selected, setSelected] = useState(initial);

  // 그 달의 칸: 1일의 요일만큼 비우고 날짜를 채운다.
  const first = `${month}-01`;
  const offset = new Date(`${first}T00:00:00Z`).getUTCDay();
  const length = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  const cells = Array.from({ length: offset + length }, (_, index) => (index < offset ? null : addDays(first, index - offset)));
  const shift = (step: number) => monthOf(addDays(step > 0 ? `${month}-28` : first, step > 0 ? 4 : -1));

  const tasks = byDate.get(selected);
  const week = plan.weeks.find((item) => selected >= item.start && selected <= item.end);

  return (
    <div className="cal">
      <div className="cal-nav">
        <button type="button" className="icon-btn" onClick={() => setMonth(shift(-1))} disabled={month <= monthOf(start)} aria-label="이전 달">
          <Icon name="chevL" size={18} weight={2} />
        </button>
        <b aria-live="polite">{monthLabel(month)}</b>
        <button type="button" className="icon-btn" onClick={() => setMonth(shift(1))} disabled={month >= monthOf(end)} aria-label="다음 달">
          <Icon name="chevR" size={18} weight={2} />
        </button>
      </div>

      <div className="cal-grid" role="grid" aria-label={`${monthLabel(month)} 계획`}>
        {HEAD.map((day) => (
          <span key={day} className="cal-head" role="columnheader">
            {day}
          </span>
        ))}
        {/* 달이 바뀔 때마다 칸이 차례로 다시 나타나게 한다. */}
        {cells.map((date, index) => {
          if (!date) return <span key={`${month}-blank-${index}`} />;
          const inPlan = date >= start && date <= end;
          const dayTasks = byDate.get(date);
          const count = dayTasks?.length ?? 0;
          const allDone = count > 0 && dayTasks!.every((task) => done.has(task.id));
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              className="cal-cell"
              style={{ animationDelay: `${(index - offset) * 16}ms` }}
              disabled={!inPlan}
              aria-pressed={selected === date}
              aria-label={`${formatDay(date)}${inPlan ? (count ? `, 할 일 ${count}개` : dayTasks ? ", 쉬는 날" : ", 주 단위 계획") : ""}`}
              data-today={date === today || undefined}
              data-deadline={date === deadline || undefined}
              data-past={date < today || undefined}
              onClick={() => setSelected(date)}
            >
              <span>{Number(date.slice(8))}</span>
              {inPlan && (
                <i data-kind={allDone ? "done" : count ? "tasks" : dayTasks ? "rest" : "later"}>
                  {allDone ? <Icon name="check" size={11} weight={3} /> : Array.from({ length: Math.min(count, 3) }, (_, dot) => <em key={dot} />)}
                </i>
              )}
            </button>
          );
        })}
      </div>

      <section key={selected} className="cal-day" aria-live="polite">
        <header>
          <h3>
            {formatDay(selected)}
            {selected === today && <em>오늘</em>}
            {selected === deadline && <em data-kind="deadline">목표일</em>}
          </h3>
          {week && (
            <p>
              {week.week}주차 · {week.focus}
            </p>
          )}
        </header>
        {tasks && tasks.length > 0 ? (
          <>
            <ol className="day-tasks">
              {tasks.map((task) => {
                const type = VERIFY_TYPES[verifyTypeOf(task)];
                const passed = done.has(task.id);
                return (
                  <li key={task.id} data-done={passed || undefined}>
                    <details>
                      <summary>
                        <span className="check" aria-hidden="true">
                          {passed && <Icon name="check" size={15} weight={3} />}
                        </span>
                        <span className="today-text">
                          <b>{task.title}</b>
                          <small>
                            {passed ? "인증 끝" : type.label} · 약 {formatMinutes(task.minutes)}
                          </small>
                        </span>
                        <Icon name="chevR" size={16} />
                      </summary>
                      <p>{task.detail}</p>
                      <p className="day-verify">
                        <Icon name={type.icon} size={15} />
                        {task.verify_method}
                      </p>
                    </details>
                  </li>
                );
              })}
            </ol>
            <p className="cal-sum">
              {tasks.length}가지 · 약 {formatMinutes(totalMinutes(tasks))}
            </p>
          </>
        ) : tasks ? (
          <p className="cal-empty">쉬는 날이에요.</p>
        ) : (
          <div className="cal-empty">
            <p>가까워지면 날짜별 할 일로 풀어요. 지금은 주 단위예요.</p>
            {week && (
              <ul>
                {week.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
