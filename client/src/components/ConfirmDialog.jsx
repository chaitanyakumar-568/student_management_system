import Modal from './Modal.jsx';
import Spinner from './Spinner.jsx';

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel} locked={busy}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
          {busy && <Spinner small label="Deleting" />}
          {busy ? 'Deleting...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
