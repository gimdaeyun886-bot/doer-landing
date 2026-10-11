import Link from "next/link";

// 현재 검색 조건을 유지한 채 페이지 번호만 바꾼 주소를 만든다.
export function Pagination({ page, totalPages, params }: { page: number; totalPages: number; params: Record<string, string> }) {
  if (totalPages <= 1) return null;
  const href = (target: number) => {
    const query = new URLSearchParams(params);
    if (target > 1) query.set("page", String(target));
    else query.delete("page");
    const text = query.toString();
    return text ? `/tasks?${text}` : "/tasks";
  };
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);

  return (
    <nav className="pagination" aria-label="페이지 이동">
      {page > 1 ? <Link href={href(page - 1)}>이전</Link> : <span aria-disabled="true">이전</span>}
      <ol>
        {pages.map((n, index) => (
          <li key={n}>
            {index > 0 && n - pages[index - 1] > 1 && <span className="gap">…</span>}
            {n === page ? <span aria-current="page">{n}</span> : <Link href={href(n)}>{n}</Link>}
          </li>
        ))}
      </ol>
      {page < totalPages ? <Link href={href(page + 1)}>다음</Link> : <span aria-disabled="true">다음</span>}
    </nav>
  );
}
