const mongoose = require('mongoose');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidObjectId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id) && mongoose.isValidObjectId(id);
}

// Mass-assignment protection: only these fields are ever read from the request body.
const STUDENT_FIELDS = ['name', 'rollNumber', 'branch', 'address'];

const LIMITS = { name: 100, rollNumber: 30, branch: 100, address: 300 };

function pickStudentFields(body) {
  const out = {};
  if (!body || typeof body !== 'object') return out;
  for (const field of STUDENT_FIELDS) {
    if (body[field] !== undefined) {
      // Reject objects/arrays (NoSQL operator injection like { "$ne": "" })
      out[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  }
  return out;
}

// Returns { errors, data }. `errors` is {} when valid.
function validateStudentPayload(body) {
  const data = pickStudentFields(body);
  const errors = {};
  const labels = { name: 'Name', rollNumber: 'Roll number', branch: 'Branch', address: 'Address' };

  for (const field of STUDENT_FIELDS) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = `${labels[field]} is required`;
    } else if (typeof value !== 'string') {
      errors[field] = `${labels[field]} must be text`;
    } else if (value.length > LIMITS[field]) {
      errors[field] = `${labels[field]} must be at most ${LIMITS[field]} characters`;
    }
  }
  if (!errors.name && data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  return { errors, data };
}

function validateLoginPayload(body) {
  const errors = {};
  const email = body && typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body && typeof body.password === 'string' ? body.password : '';
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  else if (password.length > 200) errors.password = 'Password is too long';
  return { errors, data: { email, password } };
}

module.exports = {
  EMAIL_RE,
  escapeRegex,
  isValidObjectId,
  pickStudentFields,
  validateStudentPayload,
  validateLoginPayload,
};
