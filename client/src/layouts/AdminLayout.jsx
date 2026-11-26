import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      toast.info('You have been logged out.');
    } catch {
      toast.info('Logged out locally. The server could not be reached.');
    } finally {
      setLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 p-4">
      <div className="mb-8 flex items-center gap-2 px-2 pt-2 text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold">S</span>
        <span className="text-base font-semibold leading-tight">Student<br />Management</span>
      </div>
      <nav className="flex-1 space-y-1" aria-label="Main">
        <NavLink to="/dashboard" className={linkClass} onClick={() => setMenuOpen(false)}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />
          </svg>
          Dashboard
        </NavLink>
      </nav>
      <div className="border-t border-slate-700 pt-4">
        <p className="truncate px-2 text-sm font-medium text-white">{admin?.name}</p>
        <p className="truncate px-2 text-xs text-slate-400">{admin?.email}</p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loggingOut && <Spinner small label="Logging out" />}
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">{sidebar}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-slate-900 px-4 py-3 text-white lg:hidden">
        <span className="font-semibold">Student Management</span>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 hover:bg-slate-800"
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">{sidebar}</div>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
