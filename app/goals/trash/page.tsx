import type { Metadata } from "next";
import { TrashRow } from "@/components/GoalActions";
import { ButtonLink, EmptyState, NavButton, Notice } from "@/components/ui";
import { TRASH_DAYS } from "@/lib/goals";
import { isConfigured, listTrash, sweepGoals } from "@/lib/supabase";
import { purgeGoal, restoreGoal } from "../actions";

export const metadata: Metadata = { title: "휴지통" };
export const dynamic = "force-dynamic";

// 지운 목표는 30일 동안 여기 남는다. 그 뒤에는 화면을 열 때 서버가 완전히 지운다(lib/supabase.ts의 sweepGoals).
function leftLabel(deletedAt: string) {
  const left = TRASH_DAYS - Math.floor((Date.now() - Date.parse(deletedAt)) / 86_400_000);
  return left <= 1 ? "내일 완전히 지워져요" : `${left}일 뒤 완전히 지워져요`;
}

export default async function TrashPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  if (isConfigured()) await sweepGoals();
  const goals = isConfigured() ? await listTrash() : [];
  return (
    <div className="screen screen-warm trash">
      <div className="topbar">
        <NavButton href="/goals" icon="chevL" label="내 목표로" />
      </div>
      <header className="headline">
        <p className="date">지운 지 {TRASH_DAYS}일이 지나면 완전히 지워져요</p>
        <h1>휴지통</h1>
      </header>
      {notice === "purged" && <Notice tone="success">완전히 지웠어요.</Notice>}
      {goals.length === 0 ? (
        <EmptyState title="휴지통이 비었어요" art="stone" action={<ButtonLink href="/goals" variant="soft">내 목표 보기</ButtonLink>}>
          지운 목표는 여기에 {TRASH_DAYS}일 동안 남아요.
        </EmptyState>
      ) : (
        <ul className="section rows trash-list">
          {goals.map((goal) => (
            <TrashRow key={goal.id} title={goal.title} left={leftLabel(goal.deleted_at)} restore={restoreGoal.bind(null, goal.id)} purge={purgeGoal.bind(null, goal.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
