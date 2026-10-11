import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Pagination } from "@/components/Pagination";
import { TaskCard } from "@/components/TaskCard";
import { Button, ButtonLink, EmptyState, Notice, PageHeader } from "@/components/ui";
import { isConfigured, listTasks } from "@/lib/supabase";
import { PAGE_SIZE, STATUS_FILTERS, type StatusFilter } from "@/lib/tasks";

export const metadata: Metadata = { title: "오늘 할 일" };
export const dynamic = "force-dynamic";

type Search = Promise<{ page?: string; q?: string; status?: string; notice?: string }>;

export default async function TasksPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const q = (search.q ?? "").trim().slice(0, 40);
  const status: StatusFilter = STATUS_FILTERS.some((item) => item.value === search.status) ? (search.status as StatusFilter) : "all";
  const requested = Number(search.page);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (status !== "all") params.status = status;
  const filtered = Boolean(q) || status !== "all";

  const header = (
    <PageHeader
      eyebrow="실행 기록"
      title="오늘 할 일"
      description="할 일을 등록하고, 끝낸 증거 이미지를 올려 인증해요."
      action={<ButtonLink href="/tasks/new">할 일 등록</ButtonLink>}
    />
  );

  if (!isConfigured()) {
    return (
      <>
        {header}
        <Notice tone="error">저장소가 아직 연결되지 않았어요. README의 환경 변수 안내대로 Supabase 주소와 키를 설정해 주세요.</Notice>
      </>
    );
  }

  const { tasks, total } = await listTasks({ page, q, status });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // 삭제 등으로 페이지 수가 줄었을 때는 마지막 페이지로 보낸다.
  if (page > totalPages) {
    const query = new URLSearchParams(params);
    if (totalPages > 1) query.set("page", String(totalPages));
    redirect(query.size ? `/tasks?${query}` : "/tasks");
  }

  return (
    <>
      {header}
      {search.notice === "deleted" && <Notice tone="success">할 일을 삭제했어요.</Notice>}

      <form className="filters" action="/tasks" role="search">
        <label className="sr-only" htmlFor="q">
          할 일 또는 목표 검색
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="할 일 또는 목표 검색" maxLength={40} />
        <label className="sr-only" htmlFor="status">
          인증 상태
        </label>
        <select id="status" name="status" defaultValue={status}>
          {STATUS_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          찾기
        </Button>
        {filtered && (
          <ButtonLink href="/tasks" variant="ghost">
            조건 지우기
          </ButtonLink>
        )}
      </form>

      {tasks.length === 0 ? (
        filtered ? (
          <EmptyState title="조건에 맞는 할 일이 없어요" action={<ButtonLink href="/tasks" variant="secondary">전체 보기</ButtonLink>}>
            검색어나 인증 상태를 바꿔 보세요.
          </EmptyState>
        ) : (
          <EmptyState title="아직 등록한 할 일이 없어요" action={<ButtonLink href="/tasks/new">첫 할 일 등록하기</ButtonLink>}>
            오늘 끝낼 수 있는 크기의 일 하나부터 적어 보세요.
          </EmptyState>
        )
      ) : (
        <>
          <p className="result-count">
            {filtered ? "찾은 할 일" : "전체"} {total}개 · {page}/{totalPages}쪽
          </p>
          <ul className="task-grid">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} params={params} />
        </>
      )}
    </>
  );
}
