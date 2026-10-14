import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalCard } from "@/components/GoalCard";
import { Pagination } from "@/components/Pagination";
import { ButtonLink, EmptyState, Icon, Notice } from "@/components/ui";
import { KIND_FILTERS, LIMITS, PAGE_SIZE, SORTS, daysLeft, type KindFilter, type Sort } from "@/lib/goals";
import { goalSummary, isConfigured, listGoals } from "@/lib/supabase";

export const metadata: Metadata = { title: "내 목표" };
export const dynamic = "force-dynamic";

type Search = Promise<{ page?: string; q?: string; kind?: string; sort?: string; notice?: string }>;

export default async function GoalsPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const q = (search.q ?? "").trim().slice(0, LIMITS.search);
  const kind: KindFilter = KIND_FILTERS.some((item) => item.value === search.kind) ? (search.kind as KindFilter) : "all";
  const sort: Sort = search.sort === "deadline" ? "deadline" : "recent";
  const requested = Number(search.page);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  // 검색어, 종류, 정렬은 주소에 남겨서 새로고침하거나 공유해도 같은 목록이 보이게 한다.
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (kind !== "all") params.kind = kind;
  if (sort !== "recent") params.sort = sort;
  const filtered = Boolean(q) || kind !== "all";
  const href = (change: Record<string, string | null>) => {
    const query = new URLSearchParams(params);
    for (const [key, value] of Object.entries(change)) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    return query.size ? `/goals?${query}` : "/goals";
  };

  const brand = (
    <div className="brandbar">
      {/* 첫 화면은 정적 랜딩이라 Link 대신 a로 간다. */}
      <a href="/" className="wordmark" aria-label="Do-er 소개로">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/original-wordmark.png" width={78} height={23} alt="do-er" />
      </a>
      <Link href="/goals/new" className="add-btn">
        <Icon name="plus" size={16} weight={2.4} />새 목표
      </Link>
    </div>
  );

  if (!isConfigured()) {
    return (
      <main className="screen">
        {brand}
        <Notice tone="error">저장소가 아직 연결되지 않았어요. README의 환경 변수 안내대로 Supabase 주소와 키를 설정해 주세요.</Notice>
      </main>
    );
  }

  const [{ goals, total }, summary] = await Promise.all([listGoals({ page, q, kind, sort }), goalSummary()]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // 지우기 등으로 페이지 수가 줄었을 때는 마지막 페이지로 보낸다.
  if (page > totalPages) redirect(href({ page: totalPages > 1 ? String(totalPages) : null }));

  if (summary.total === 0) {
    return (
      <main className="screen">
        {brand}
        {search.notice === "deleted" && <Notice tone="success">목표를 지웠어요.</Notice>}
        <div className="welcome">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/study-character-v4.webp" width={220} height={196} alt="" />
          <h1>해내고 싶은 일,{"\n"}하나만 적어 볼까요?</h1>
          <p>목표와 하루에 낼 시간을 적으면 목표일까지 몇 시간을 쓸 수 있는지 계산해 드려요.</p>
          <ButtonLink href="/goals/new">첫 목표 적기</ButtonLink>
        </div>
      </main>
    );
  }

  const next = summary.next;
  return (
    <main className="screen">
      {brand}
      <header className="list-head">
        <h1>내 목표</h1>
        <p>
          {summary.total}개
          {next && (
            <>
              {" · "}가장 가까운 목표일 <b>{daysLeft(next.deadline) === 0 ? "D-DAY" : `D-${daysLeft(next.deadline)}`}</b>
            </>
          )}
        </p>
      </header>
      {search.notice === "deleted" && <Notice tone="success">목표를 지웠어요.</Notice>}

      <div className="finder">
        <form className="search" action="/goals" role="search">
          <label className="sr-only" htmlFor="q">
            목표 찾기
          </label>
          <Icon name="search" size={18} />
          <input id="q" name="q" type="search" defaultValue={q} placeholder="목표 이름으로 찾기" maxLength={LIMITS.search} enterKeyHint="search" />
          {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
          {sort !== "recent" && <input type="hidden" name="sort" value={sort} />}
        </form>
        <div className="finder-row">
          <nav className="filters" aria-label="목표의 종류">
            {KIND_FILTERS.map((item) => (
              <Link key={item.value} href={href({ kind: item.value === "all" ? null : item.value, page: null })} aria-current={kind === item.value ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <nav className="sorts" aria-label="정렬">
          {SORTS.map((item) => (
            <Link key={item.value} href={href({ sort: item.value === "recent" ? null : item.value, page: null })} aria-current={sort === item.value ? "true" : undefined}>
              {item.label}
            </Link>
          ))}
          {filtered && <span className="found">찾은 목표 {total}개</span>}
        </nav>
      </div>

      {goals.length === 0 ? (
        <EmptyState title="조건에 맞는 목표가 없어요" action={<ButtonLink href="/goals" variant="soft">전체 보기</ButtonLink>}>
          찾는 말이나 종류를 바꿔 보세요.
        </EmptyState>
      ) : (
        <section aria-label="목표 목록">
          <ul className="goal-list">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} params={params} basePath="/goals" />
        </section>
      )}
    </main>
  );
}
