import { useState } from 'react';
import Spinner from './Spinner.jsx';

const FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', max: 100, placeholder: 'e.g. Asha Rao', autoComplete: 'off' },
  { name: 'rollNumber', label: 'Roll number', type: 'text', max: 30, placeholder: 'e.g. 00123', autoComplete: 'off' },
  { name: 'branch', label: 'Branch', type: 'text', max: 100, placeholder: 'e.g. Computer Science', autoComplete: 'off' },
  { name: 'address', label: 'Address', type: 'textarea', max: 300, placeholder: 'Street, city, state', autoComplete: 'off' },
];

const EMPTY = { name: '', rollNumber: '', branch: '', address: '' };

// Client-side validation mirrors the server rules (the server remains the source of truth).
export function validate(values) {
  const errors = {};
  const v = (k) => String(values[k] ?? '').trim();
  if (!v('name')) errors.name = 'Name is required';
  else if (v('name').length < 2) errors.name = 'Name must be at least 2 characters';
  else if (v('name').length > 100) errors.name = 'Name must be at most 100 characters';
  if (!v('rollNumber')) errors.rollNumber = 'Roll number is required';
  else if (v('rollNumber').length > 30) errors.rollNumber = 'Roll number must be at most 30 characters';
  if (!v('branch')) errors.branch = 'Branch is required';
  else if (v('branch').length > 100) errors.branch = 'Branch must be at most 100 characters';
  if (!v('address')) errors.address = 'Address is required';
  else if (v('address').length > 300) errors.address = 'Address must be at most 300 characters';
  return errors;
}

export default function StudentForm({ initialValues, submitLabel, onSubmit, onCancel, serverErrors = {}, busy }) {
  const [values, setValues] = useState({ ...EMPTY, ...(initialValues || {}) });
  const [clientErrors, setClientErrors] = useState({});
  const [touched, setTouched] = useState({});

  const errors = { ...serverErrors, ...clientErrors };
  const show = (name) => (touched[name] || serverErrors[name] || clientErrors[name]) && errors[name];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...values, [name]: value };
    setValues(next);
    if (touched[name] || clientErrors[name]) {
      const all = validate(next);
      setClientErrors((prev) => {
        const copy = { ...prev };
        if (all[name]) copy[name] = all[name];
        else delete copy[name];
        return copy;
      });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    const all = validate(values);
    setClientErrors((prev) => {
      const copy = { ...prev };
      if (all[name]) copy[name] = all[name];
      else delete copy[name];
      return copy;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (busy) return; // prevent duplicate submissions
    const found = validate(values);
    setClientErrors(found);
    setTouched({ name: true, rollNumber: true, branch: true, address: true });
    if (Object.keys(found).length) return;
    onSubmit({
      name: values.name.trim(),
      rollNumber: values.rollNumber.trim(),
      branch: values.branch.trim(),
      address: values.address.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {FIELDS.map((f) => {
        const err = show(f.name);
        const id = `student-${f.name}`;
        const common = {
          id,
          name: f.name,
          value: values[f.name],
          onChange: handleChange,
          onBlur: handleBlur,
          placeholder: f.placeholder,
          maxLength: f.max,
          autoComplete: f.autoComplete,
          disabled: busy,
          'aria-invalid': err ? 'true' : 'false',
          'aria-describedby': err ? `${id}-error` : undefined,
          className: `input ${err ? 'input-error' : ''}`,
        };
        return (
          <div key={f.name}>
            <label htmlFor={id} className="label">
              {f.label} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {f.type === 'textarea' ? <textarea rows={3} {...common} /> : <input type={f.type} {...common} />}
            {err && (
              <p id={`${id}-error`} className="field-error" role="alert">
                {err}
              </p>
            )}
          </div>
        );
      })}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy && <Spinner small label="Saving" />}
          {busy ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
