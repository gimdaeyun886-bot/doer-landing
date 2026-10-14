// 목록과 상세를 불러오는 동안 보이는 자리표시.
export default function Loading() {
  return (
    <main className="screen" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">불러오는 중이에요</span>
      <span className="skeleton skeleton-bar" aria-hidden="true" />
      <span className="skeleton skeleton-title" aria-hidden="true" />
      <span className="skeleton skeleton-row" aria-hidden="true" />
      <span className="skeleton skeleton-row" aria-hidden="true" />
      <span className="skeleton skeleton-row" aria-hidden="true" />
    </main>
  );
}
