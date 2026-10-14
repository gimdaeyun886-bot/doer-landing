"use client";

// 남은 기간을 달력으로 보여 준다. 할 수 있는 요일에 점, 목표일에 표시를 둔다.
import { useState } from "react";
import { DAY_NAMES, WEEK_ORDER, addDays, weekdayOf } from "@/lib/goals";
import { Icon } from "./ui";

type Props = { today: string; deadline: string | null; weekdays: number[] };

const monthKey = (date: string) => date.slice(0, 7);
function shiftMonth(key: string, by: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + by, 1));
  return date.toISOString().slice(0, 7);
}

export function MonthCalendar({ today, deadline, weekdays }: Props) {
  const first = monthKey(today);
  // 날짜 있는 목표는 목표일이 있는 달까지, 나머지는 석 달을 넘겨 볼 수 있다.
  const last = deadline ? monthKey(deadline) : shiftMonth(first, 2);
  const [month, setMonth] = useState(first);
  const [year, mon] = month.split("-").map(Number);

  const start = `${month}-01`;
  const lead = (weekdayOf(start) + 6) % 7; // 월요일부터 시작
  const length = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const cells = Array.from({ length: lead + length }, (_, index) => (index < lead ? null : addDays(start, index - lead)));

  const open = (date: string) => date >= today && (!deadline || date <= deadline) && weekdays.includes(weekdayOf(date));

  return (
    <div className="cal">
      <div className="cal-nav">
        <button type="button" className="nav-btn" onClick={() => setMonth(shiftMonth(month, -1))} disabled={month <= first} aria-label="이전 달">
          <Icon name="chevL" size={18} weight={2} />
        </button>
        <b aria-live="polite">
          {year}년 {mon}월
        </b>
        <button type="button" className="nav-btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= last} aria-label="다음 달">
          <Icon name="chevR" size={18} weight={2} />
        </button>
      </div>
      <div className="cal-grid" role="grid" aria-label={`${year}년 ${mon}월`}>
        {WEEK_ORDER.map((day) => (
          <span key={day} className="cal-head" role="columnheader">
            {DAY_NAMES[day]}
          </span>
        ))}
        {cells.map((date, index) =>
          date ? (
            <span
              key={date}
              role="gridcell"
              className="cal-cell"
              data-past={date < today || undefined}
              data-open={open(date) || undefined}
              data-today={date === today || undefined}
              data-goal={date === deadline || undefined}
              aria-label={`${Number(date.slice(8))}일${date === deadline ? ", 목표일" : open(date) ? ", 할 수 있는 날" : ""}${date === today ? ", 오늘" : ""}`}
            >
              {Number(date.slice(8))}
            </span>
          ) : (
            <span key={`blank-${index}`} aria-hidden="true" />
          ),
        )}
      </div>
      <p className="cal-legend" aria-hidden="true">
        <span className="legend-open" />할 수 있는 날
        {deadline && (
          <>
            <span className="legend-goal" />
            목표일
          </>
        )}
      </p>
    </div>
  );
}
