import type { Metadata } from "next";
import Link from "next/link";
import { GoalCard } from "@/components/GoalCard";
import { ButtonLink, Icon, PageHeader } from "@/components/ui";
import { DEADLINE_FILTERS } from "@/lib/goals";
import { SAMPLE_GOALS } from "@/lib/sample";

export const metadata: Metadata = { title: "디자인 미리보기" };

// 저장소 없이 화면 디자인만 확인하는 페이지. 예시 데이터를 보여 주고 아무것도 저장하지 않는다.
export default function PreviewListPage() {
  return (
    <>
      <PageHeader overline="디자인 미리보기" title="내 목표" description="목표를 알려 주면 AI 코치가 계획을 짜고 오늘 할 일로 나눠요." />
      <ButtonLink href="/goals/new" className="btn-block">
        <Icon name="plus" />새 목표 등록
      </ButtonLink>
      <div className="search">
        <Icon name="search" />
        <input type="search" placeholder="목표 검색" aria-label="목표 검색" />
      </div>
      <nav className="tabs" aria-label="목표 종류">
        {DEADLINE_FILTERS.map((item, index) => (
          <Link key={item.value} href="/goals/preview" aria-current={index === 0 ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      <p className="result-count">전체 {SAMPLE_GOALS.length}개</p>
      <ul className="goal-list">
        {SAMPLE_GOALS.map((goal) => (
          <GoalCard key={goal.id} goal={goal} href={`/goals/preview/${goal.id}`} />
        ))}
      </ul>
    </>
  );
}
