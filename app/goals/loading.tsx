export default function Loading() {
  return (
    <div className="loading" role="status" aria-live="polite" aria-busy="true">
      <p className="loading-status">
        <span className="spinner" aria-hidden="true" />
        불러오는 중이에요…
      </p>
      <div aria-hidden="true">
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-card" />
        <span className="skeleton skeleton-card" />
      </div>
    </div>
  );
}
