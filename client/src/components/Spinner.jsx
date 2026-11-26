export default function Spinner({ label = 'Loading...', small = false }) {
  const size = small ? 'h-4 w-4' : 'h-8 w-8';
  return (
    <div className="flex items-center gap-3 text-slate-500" role="status">
      <svg className={`${size} animate-spin text-brand-600`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {!small && <span className="text-sm">{label}</span>}
      {small && <span className="sr-only">{label}</span>}
    </div>
  );
}
