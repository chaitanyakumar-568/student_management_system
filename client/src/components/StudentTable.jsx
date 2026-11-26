export default function StudentTable({ students, onEdit, onDelete }) {
  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Roll Number</th>
              <th scope="col" className="px-4 py-3">Branch</th>
              <th scope="col" className="px-4 py-3">Address</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {students.map((s) => (
              <tr key={s._id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{s.name}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{s.rollNumber}</td>
                <td className="px-4 py-3 text-slate-700">{s.branch}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={s.address}>
                  {s.address}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    type="button"
                    className="btn-secondary mr-2 px-3 py-1.5"
                    onClick={() => onEdit(s)}
                    aria-label={`Edit ${s.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-danger px-3 py-1.5"
                    onClick={() => onDelete(s)}
                    aria-label={`Delete ${s.name}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {students.map((s) => (
          <li key={s._id} className="space-y-1 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-slate-900">{s.name}</p>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{s.rollNumber}</span>
            </div>
            <p className="text-sm text-slate-700">{s.branch}</p>
            <p className="text-sm text-slate-500">{s.address}</p>
            <div className="flex gap-2 pt-2">
              <button type="button" className="btn-secondary flex-1 py-1.5" onClick={() => onEdit(s)} aria-label={`Edit ${s.name}`}>
                Edit
              </button>
              <button type="button" className="btn-danger flex-1 py-1.5" onClick={() => onDelete(s)} aria-label={`Delete ${s.name}`}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
