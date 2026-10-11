export default function Loading() {
  return (
    <div className="loading" role="status" aria-live="polite" aria-busy="true">
      <p className="loading-status">
        <span className="spinner" aria-hidden="true" />
        불러오는 중이에요…
      </p>
      <div className="loading-preview" aria-hidden="true">
        <div>
          <span className="skeleton skeleton-heading" />
          <span className="skeleton skeleton-description" />
        </div>
        <span className="skeleton skeleton-toolbar" />
        <div className="task-grid">
          {[0, 1, 2, 3, 4, 5].map((card) => (
            <div className="skeleton-card" key={card}>
              <span className="skeleton skeleton-short" />
              <span className="skeleton skeleton-title" />
              <span className="skeleton skeleton-meta" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
