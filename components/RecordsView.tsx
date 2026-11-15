import { Icon, Section, type IconName } from "@/components/ui";
import { formatDay, weekdayOf } from "@/lib/goals";
import type { DayRecord, DayState } from "@/lib/streak";

const STATE_LABEL: Record<DayState, string> = { done: "끝냄", adjusted: "조정하고 끝냄", missed: "못 함", rest: "쉬는 날", pending: "오늘, 아직", before: "계획 전" };
// 색만으로 나누지 않도록 칸 안에 모양을 함께 둔다.
const STATE_MARK: Partial<Record<DayState, IconName>> = { done: "check", adjusted: "swap", missed: "x" };

// 지난 일주일의 숫자로 코치가 건네는 한마디. AI를 부르지 않고 규칙으로 만든다.
function coachLine(days: DayRecord[]) {
  const work = days.filter((day) => day.state !== "rest" && day.state !== "pending" && day.state !== "before");
  // 지킨 날: 할 일을 모두 인증한 날, 또는 조정한 뒤 남은 것을 인증한 날. 조정으로 할 일을 모두 옮긴 날은 지킨 날로 세지 않는다.
  const kept = work.filter((day) => day.state === "done" || (day.state === "adjusted" && day.passed > 0)).length;
  const missed = work.filter((day) => day.state === "missed");
  if (!work.length) return "아직 돌아볼 날이 없어요. 오늘부터 하루씩 쌓여요.";
  // 칭찬은 숫자와 맞을 때만. 조정한 날은 따로 밝힌다.
  const moved = work.filter((day) => day.state === "adjusted" && day.passed === 0).length;
  const adjusted = work.filter((day) => day.state === "adjusted").length - moved;
  const note = (adjusted ? ` 그중 ${adjusted}일은 코치와 조정한 날이에요.` : "") + (moved ? ` ${moved}일은 할 일을 다른 날로 옮겼어요.` : "");
  if (!kept) return `아직 인증으로 지킨 날은 없어요.${note}`;
  if (!missed.length && kept === work.length) return `할 일이 있던 ${work.length}일을 모두 지켰어요.${note}`;
  const last = missed[missed.length - 1];
  return `${work.length}일 가운데 ${kept}일을 지켰어요.${note} ${weekdayOf(last.date)}요일이 비었는데, 버거운 날엔 시작하기 전에 코치에게 말해 주세요.`;
}

// 기록 화면의 본문: 한 주 막대와 숫자 타일.
export function RecordsView({ week, streak, proofs }: { week: DayRecord[]; streak: number; proofs: number }) {
  const kept = week.filter((day) => day.state === "done" || day.state === "adjusted").length;
  // 할 일이 있던 날만 센다. 계획 전과 쉬는 날은 빼고, 아직 끝나지 않은 오늘도 뺀다.
  const workDays = week.filter((day) => day.state === "done" || day.state === "adjusted" || day.state === "missed").length;
  const adjusted = week.filter((day) => day.state === "adjusted").length;
  return (
    <>
      <Section>
        <ol className="week" aria-label="최근 일주일">
          {week.map((day) => (
            <li key={day.date} data-state={day.state} aria-label={`${formatDay(day.date)}, ${STATE_LABEL[day.state]}`}>
              <span>{weekdayOf(day.date)}</span>
              <i>{STATE_MARK[day.state] && <Icon name={STATE_MARK[day.state]!} size={14} weight={2.2} />}</i>
            </li>
          ))}
        </ol>
        <ul className="week-legend" aria-hidden="true">
          <li data-state="done"><Icon name="check" size={12} weight={2.4} />끝냄</li>
          <li data-state="adjusted"><Icon name="swap" size={12} weight={2.4} />조정</li>
          <li data-state="missed"><Icon name="x" size={12} weight={2.4} />못 함</li>
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
              <small>/ {workDays}일</small>
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
