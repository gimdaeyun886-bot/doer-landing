import type { Metadata } from "next";
import Link from "next/link";
import { GoalCard } from "@/components/GoalCard";
import { Pagination } from "@/components/Pagination";
import { Icon, TabBar } from "@/components/ui";
import { KIND_FILTERS } from "@/lib/goals";
import { SAMPLE_GOALS } from "@/lib/sample";

export const metadata: Metadata = { title: "디자인 미리보기" };
export const dynamic = "force-dynamic";

// 저장소 없이 화면 디자인만 확인하는 페이지. 예시 데이터를 보여 주고 아무것도 저장하지 않는다.
export default function PreviewListPage() {
  return (
    <div className="screen screen-warm goals">
      <header className="headline headline-row">
        <div>
          <p className="date">진행 중 {SAMPLE_GOALS.length}개 · 미리보기</p>
          <h1>내 목표</h1>
        </div>
        <Link href="/goals/new" className="add-btn">
          <Icon name="plus" size={17} weight={2.2} />새 목표
        </Link>
      </header>
      <div className="search">
        <Icon name="search" size={18} />
        <input type="search" placeholder="목표 찾기" aria-label="목표 찾기" />
      </div>
      <nav className="filters" aria-label="목표의 모양">
        {KIND_FILTERS.map((item, index) => (
          <Link key={item.value} href="/goals/preview" aria-current={index === 0 ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <ul className="goal-list">
        {SAMPLE_GOALS.map((goal) => (
          <GoalCard key={goal.id} goal={goal} href={`/goals/preview/${goal.id}`} />
        ))}
      </ul>
      <Pagination page={1} totalPages={2} params={{}} basePath="/goals/preview" />
      <TabBar active="goals" />
    </div>
  );
}
