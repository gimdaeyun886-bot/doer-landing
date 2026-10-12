import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalCard } from "@/components/GoalCard";
import { Pagination } from "@/components/Pagination";
import { ButtonLink, EmptyState, Icon, Notice, PageHeader } from "@/components/ui";
import { DEADLINE_FILTERS, PAGE_SIZE, type DeadlineFilter } from "@/lib/goals";
import { isConfigured, listGoals } from "@/lib/supabase";

export const metadata: Metadata = { title: "내 목표" };
export const dynamic = "force-dynamic";

type Search = Promise<{ page?: string; q?: string; deadline?: string; notice?: string }>;

export default async function GoalsPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const q = (search.q ?? "").trim().slice(0, 40);
  const deadline: DeadlineFilter = DEADLINE_FILTERS.some((item) => item.value === search.deadline) ? (search.deadline as DeadlineFilter) : "all";
  const requested = Number(search.page);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (deadline !== "all") params.deadline = deadline;
  const filtered = Boolean(q) || deadline !== "all";
  const filterHref = (value: DeadlineFilter) => {
    const query = new URLSearchParams(q ? { q } : {});
    if (value !== "all") query.set("deadline", value);
    return query.size ? `/goals?${query}` : "/goals";
  };

  const header = <PageHeader overline="Do-er" title="내 목표" description="목표를 알려 주면 AI 코치가 계획을 짜고 오늘 할 일로 나눠요." />;

  if (!isConfigured()) {
    return (
      <>
        {header}
        <Notice tone="error">저장소가 아직 연결되지 않았어요. README의 환경 변수 안내대로 Supabase 주소와 키를 설정해 주세요.</Notice>
      </>
    );
  }

  const { goals, total } = await listGoals({ page, q, deadline });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // 삭제 등으로 페이지 수가 줄었을 때는 마지막 페이지로 보낸다.
  if (page > totalPages) {
    const query = new URLSearchParams(params);
    if (totalPages > 1) query.set("page", String(totalPages));
    redirect(query.size ? `/goals?${query}` : "/goals");
  }

  return (
    <>
      {header}
      {search.notice === "deleted" && <Notice tone="success">목표를 삭제했어요.</Notice>}

      <ButtonLink href="/goals/new" className="btn-block">
        <Icon name="plus" />새 목표 등록
      </ButtonLink>

      <form className="search" action="/goals" role="search">
        <label className="sr-only" htmlFor="q">
          목표 검색
        </label>
        <Icon name="search" />
        <input id="q" name="q" type="search" defaultValue={q} placeholder="목표 검색" maxLength={40} />
        {deadline !== "all" && <input type="hidden" name="deadline" value={deadline} />}
      </form>
      <nav className="tabs" aria-label="목표 종류">
        {DEADLINE_FILTERS.map((item) => (
          <Link key={item.value} href={filterHref(item.value)} aria-current={deadline === item.value ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>

      {goals.length === 0 ? (
        filtered ? (
          <EmptyState icon="search" title="조건에 맞는 목표가 없어요" action={<ButtonLink href="/goals" variant="secondary">전체 보기</ButtonLink>}>
            검색어나 종류를 바꿔 보세요.
          </EmptyState>
        ) : (
          <EmptyState title="아직 등록한 목표가 없어요">준비하는 시험 하나만 알려 주세요. 계획은 코치가 짜요.</EmptyState>
        )
      ) : (
        <>
          <p className="result-count">
            {filtered ? "찾은 목표" : "전체"} {total}개{totalPages > 1 && ` · ${page}/${totalPages}쪽`}
          </p>
          <ul className="goal-list">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} params={params} basePath="/goals" />
        </>
      )}
    </>
  );
}
