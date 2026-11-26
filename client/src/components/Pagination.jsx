export default function Pagination({ page, totalPages, total, limit, onPageChange }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-600">
        Showing <span className="font-semibold">{from}</span>–<span className="font-semibold">{to}</span> of{' '}
        <span className="font-semibold">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <span className="text-sm text-slate-600" aria-current="page">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
