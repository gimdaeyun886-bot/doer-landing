import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalCard } from "@/components/GoalCard";
import { Pagination } from "@/components/Pagination";
import { ButtonLink, EmptyState, Icon, Notice, TabBar } from "@/components/ui";
import { KIND_FILTERS, PAGE_SIZE, type KindFilter } from "@/lib/goals";
import { isConfigured, listGoals } from "@/lib/supabase";

export const metadata: Metadata = { title: "내 목표" };
export const dynamic = "force-dynamic";

type Search = Promise<{ page?: string; q?: string; kind?: string; notice?: string }>;

export default async function GoalsPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const q = (search.q ?? "").trim().slice(0, 40);
  const kind: KindFilter = KIND_FILTERS.some((item) => item.value === search.kind) ? (search.kind as KindFilter) : "all";
  const requested = Number(search.page);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (kind !== "all") params.kind = kind;
  const filtered = Boolean(q) || kind !== "all";
  const kindHref = (value: KindFilter) => {
    const query = new URLSearchParams(q ? { q } : {});
    if (value !== "all") query.set("kind", value);
    return query.size ? `/goals?${query}` : "/goals";
  };

  if (!isConfigured()) {
    return (
      <div className="screen screen-warm goals">
        <header className="headline">
          <h1>내 목표</h1>
        </header>
        <Notice tone="error">저장소가 아직 연결되지 않았어요. README의 환경 변수 안내대로 Supabase 주소와 키를 설정해 주세요.</Notice>
        <TabBar active="goals" />
      </div>
    );
  }

  const { goals, total } = await listGoals({ page, q, kind });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // 지우기 등으로 페이지 수가 줄었을 때는 마지막 페이지로 보낸다.
  if (page > totalPages) {
    const query = new URLSearchParams(params);
    if (totalPages > 1) query.set("page", String(totalPages));
    redirect(query.size ? `/goals?${query}` : "/goals");
  }

  return (
    <div className="screen screen-warm goals">
      <header className="headline headline-row">
        <div>
          <h1>내 목표</h1>
        </div>
        <Link href="/goals/new" className="add-btn">
          <Icon name="plus" size={17} weight={2.2} />새 목표
        </Link>
      </header>
      {search.notice === "deleted" && <Notice tone="success">목표를 지웠어요.</Notice>}

      {(total > 5 || filtered) && (
        <>
          <form className="search" action="/goals" role="search">
            <label className="sr-only" htmlFor="q">
              목표 찾기
            </label>
            <Icon name="search" size={18} />
            <input id="q" name="q" type="search" defaultValue={q} placeholder="목표 찾기" maxLength={40} />
            {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
          </form>
          <nav className="filters" aria-label="목표의 모양">
            {KIND_FILTERS.map((item) => (
              <Link key={item.value} href={kindHref(item.value)} aria-current={kind === item.value ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      )}

      {goals.length === 0 ? (
        filtered ? (
          <EmptyState title="조건에 맞는 목표가 없어요" action={<ButtonLink href="/goals" variant="soft">전체 보기</ButtonLink>}>
            찾는 말을 바꿔 보세요.
          </EmptyState>
        ) : (
          <EmptyState title="아직 목표가 없어요" action={<ButtonLink href="/goals/new">코치에게 목표 말하기</ButtonLink>}>
            하나만 말해 주세요. 계획은 코치가 짜요.
          </EmptyState>
        )
      ) : (
        <>
          <ul className="goal-list">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} params={params} basePath="/goals" />
        </>
      )}
      <TabBar active="goals" />
    </div>
  );
}
