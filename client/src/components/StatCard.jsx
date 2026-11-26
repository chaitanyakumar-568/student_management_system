export default function StatCard({ label, value, hint, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-200" aria-hidden="true" />
      ) : (
        <p className="mt-1 truncate text-3xl font-bold text-slate-900">{value}</p>
      )}
      {hint && !loading && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
