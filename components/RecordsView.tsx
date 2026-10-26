import { Section } from "@/components/ui";
import { formatDay, weekdayOf } from "@/lib/goals";
import type { DayRecord, DayState } from "@/lib/streak";

const STATE_LABEL: Record<DayState, string> = { done: "끝냄", adjusted: "조정하고 끝냄", missed: "못 함", rest: "쉬는 날", pending: "오늘, 아직", before: "계획 전" };

// 지난 일주일의 숫자로 코치가 건네는 한마디. AI를 부르지 않고 규칙으로 만든다.
function coachLine(days: DayRecord[]) {
  const work = days.filter((day) => day.state !== "rest" && day.state !== "pending" && day.state !== "before");
  const kept = work.filter((day) => day.state === "done" || day.state === "adjusted").length;
  const missed = work.filter((day) => day.state === "missed");
  if (!work.length) return "아직 돌아볼 날이 없어요. 오늘부터 하루씩 쌓여요.";
  if (!missed.length) return `할 일이 있던 ${work.length}일을 모두 지켰어요. 이 흐름 그대로 가요.`;
  const last = missed[missed.length - 1];
  return `${work.length}일 가운데 ${kept}일을 지켰어요. ${weekdayOf(last.date)}요일이 비었는데, 그날이 버거웠다면 다음엔 코치에게 미리 말해 주세요.`;
}

// 기록 화면의 본문: 한 주 막대와 숫자 타일.
export function RecordsView({ week, streak, proofs }: { week: DayRecord[]; streak: number; proofs: number }) {
  const kept = week.filter((day) => day.state === "done" || day.state === "adjusted").length;
  const adjusted = week.filter((day) => day.state === "adjusted").length;
  return (
    <>
            <Section>
              <ol className="week" aria-label="최근 일주일">
                {week.map((day) => (
                  <li key={day.date} data-state={day.state} aria-label={`${formatDay(day.date)}, ${STATE_LABEL[day.state]}`}>
                    <span>{weekdayOf(day.date)}</span>
                    <i />
                  </li>
                ))}
              </ol>
              <ul className="week-legend" aria-hidden="true">
                <li data-state="done">끝냄</li>
                <li data-state="adjusted">조정</li>
                <li data-state="missed">못 함</li>
                <li data-state="rest">쉼</li>
              </ul>
              <p className="plain">{coachLine(week)}</p>
            </Section>
  
            <Section title="숫자로 보면">
              <dl className="tiles">
                <div>
                  <dt>연속 기록</dt>
                  <dd>
                    {streak}
                    <small>일</small>
                  </dd>
                </div>
                <div>
                  <dt>지킨 날</dt>
                  <dd>
                    {kept}
                    <small>/ 7일</small>
                  </dd>
                </div>
                <div>
                  <dt>인증한 할 일</dt>
                  <dd>
                    {proofs}
                    <small>가지</small>
                  </dd>
                </div>
                <div>
                  <dt>조정한 날</dt>
                  <dd>
                    {adjusted}
                    <small>일</small>
                  </dd>
                </div>
              </dl>
            </Section>
    </>
  );
}
