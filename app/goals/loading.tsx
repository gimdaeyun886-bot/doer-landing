export default function Loading() {
  return (
    <div className="screen screen-warm loading" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">불러오는 중이에요</span>
      <span className="skeleton skeleton-title" aria-hidden="true" />
      <span className="skeleton skeleton-card" aria-hidden="true" />
      <span className="skeleton skeleton-card" aria-hidden="true" />
      <span className="skeleton skeleton-card" aria-hidden="true" />
    </div>
  );
}
