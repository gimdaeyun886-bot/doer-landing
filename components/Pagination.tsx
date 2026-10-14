import Link from "next/link";
import { Icon } from "./ui";

// 현재 찾는 조건을 유지한 채 페이지 번호만 바꾼 주소를 만든다.
export function Pagination({ page, totalPages, params, basePath }: { page: number; totalPages: number; params: Record<string, string>; basePath: string }) {
  if (totalPages <= 1) return null;
  const href = (target: number) => {
    const query = new URLSearchParams(params);
    if (target > 1) query.set("page", String(target));
    else query.delete("page");
    const text = query.toString();
    return text ? `${basePath}?${text}` : basePath;
  };
  const arrow = (target: number, enabled: boolean, icon: "chevL" | "chevR", label: string) =>
    enabled ? (
      <Link href={href(target)} aria-label={label}>
        <Icon name={icon} size={18} weight={2} />
      </Link>
    ) : (
      <span aria-disabled="true">
        <Icon name={icon} size={18} weight={2} />
      </span>
    );

  return (
    <nav className="pagination" aria-label="페이지 이동">
      {arrow(page - 1, page > 1, "chevL", "이전 페이지")}
      <p>
        <b aria-current="page">{page}</b> / {totalPages}
      </p>
      {arrow(page + 1, page < totalPages, "chevR", "다음 페이지")}
    </nav>
  );
}
