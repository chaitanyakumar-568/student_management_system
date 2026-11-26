import { useEffect, useRef } from 'react';

// Accessible modal: Esc to close, click backdrop to close, focus trapped inside, focus restored on close.
export default function Modal({ title, onClose, children, locked = false }) {
  const panelRef = useRef(null);
  // Keep the latest callbacks/flags in refs so the effect below runs only once per open
  // (otherwise it would re-run on every parent render and steal focus while typing).
  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);
  onCloseRef.current = onClose;
  lockedRef.current = locked;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const focusables = () =>
      panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');

    // Focus the first form field (or first focusable) on open
    const first = panel.querySelector('input, textarea, select') || focusables()[0];
    first?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !lockedRef.current) {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(focusables()).filter((el) => !el.disabled);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="rounded p-1 text-2xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-40"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
