import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalRow } from "@/components/GoalRow";
import { Pagination } from "@/components/Pagination";
import { ButtonLink, EmptyState, Icon, Notice } from "@/components/ui";
import { KIND_FILTERS, LIMITS, PAGE_SIZE, type KindFilter } from "@/lib/goals";
import { isConfigured, listGoals } from "@/lib/supabase";

export const metadata: Metadata = { title: "내 목표" };
export const dynamic = "force-dynamic";

type Search = Promise<{ page?: string; q?: string; kind?: string; notice?: string }>;

export default async function GoalsPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const q = (search.q ?? "").trim().slice(0, LIMITS.search);
  const kind: KindFilter = KIND_FILTERS.some((item) => item.value === search.kind) ? (search.kind as KindFilter) : "all";
  const requested = Number(search.page);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  // 검색어와 종류는 주소에 남겨서, 새로고침하거나 공유해도 같은 목록이 보이게 한다.
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (kind !== "all") params.kind = kind;
  const filtered = Boolean(q) || kind !== "all";
  const kindHref = (value: KindFilter) => {
    const query = new URLSearchParams(q ? { q } : {});
    if (value !== "all") query.set("kind", value);
    return query.size ? `/goals?${query}` : "/goals";
  };

  const header = (
    <>
      <div className="brandbar">
        {/* 첫 화면은 정적 랜딩이라 Link 대신 a로 간다. */}
        <a href="/" className="wordmark" aria-label="Do-er 소개로">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/original-wordmark.png" width={82} height={24} alt="do-er" />
        </a>
      </div>
      <header className="headline headline-row">
        <h1>내 목표</h1>
        <Link href="/goals/new" className="add-btn">
          <Icon name="plus" size={17} weight={2.2} />새 목표
        </Link>
      </header>
    </>
  );

  if (!isConfigured()) {
    return (
      <main className="screen">
        {header}
        <Notice tone="error">저장소가 아직 연결되지 않았어요. README의 환경 변수 안내대로 Supabase 주소와 키를 설정해 주세요.</Notice>
      </main>
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
    <main className="screen">
      {header}
      {search.notice === "deleted" && <Notice tone="success">목표를 지웠어요.</Notice>}

      {(total > 0 || filtered) && (
        <div className="finder">
          <form className="search" action="/goals" role="search">
            <label className="sr-only" htmlFor="q">
              목표 찾기
            </label>
            <Icon name="search" size={18} />
            <input id="q" name="q" type="search" defaultValue={q} placeholder="목표 이름으로 찾기" maxLength={LIMITS.search} enterKeyHint="search" />
            {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
          </form>
          <nav className="filters" aria-label="목표의 종류">
            {KIND_FILTERS.map((item) => (
              <Link key={item.value} href={kindHref(item.value)} aria-current={kind === item.value ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {goals.length === 0 ? (
        filtered ? (
          <EmptyState title="조건에 맞는 목표가 없어요" action={<ButtonLink href="/goals" variant="soft">전체 보기</ButtonLink>}>
            찾는 말이나 종류를 바꿔 보세요.
          </EmptyState>
        ) : (
          <EmptyState title="아직 목표가 없어요" action={<ButtonLink href="/goals/new">첫 목표 적기</ButtonLink>}>
            해내고 싶은 일 하나와 하루에 낼 시간을 적어 주세요.
          </EmptyState>
        )
      ) : (
        <section className="section" aria-labelledby="list-title">
          <div className="section-head">
            <h2 id="list-title" className="sr-only">
              목표 목록
            </h2>
            <span className="count">{filtered ? `찾은 목표 ${total}개` : `모두 ${total}개`}</span>
          </div>
          <ul className="goal-list">
            {goals.map((goal) => (
              <GoalRow key={goal.id} goal={goal} />
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} params={params} basePath="/goals" />
        </section>
      )}
    </main>
  );
}
