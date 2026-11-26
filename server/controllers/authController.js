const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { validateLoginPayload } = require('../utils/validators');
const { signToken, setAuthCookie, clearAuthCookie, csrfTokenFor } = require('../utils/token');

// A valid bcrypt hash used to keep response time constant when the email is unknown
// (prevents account enumeration via timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const publicAdmin = (admin) => ({
  id: admin._id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
});

exports.login = asyncHandler(async (req, res) => {
  const { errors, data } = validateLoginPayload(req.body);
  if (Object.keys(errors).length) throw new AppError('Please fix the highlighted fields', 400, errors);

  const admin = await Admin.findOne({ email: data.email }).select('+passwordHash');
  const hashToCheck = admin ? admin.passwordHash : DUMMY_HASH;
  const ok = await bcrypt.compare(data.password, hashToCheck);

  if (!admin || !ok) {
    // Same message for unknown email and wrong password
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(admin._id);
  setAuthCookie(res, token);

  res.json({
    success: true,
    message: 'Logged in successfully',
    data: { admin: publicAdmin(admin), csrfToken: csrfTokenFor(token) },
  });
});

exports.logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { admin: publicAdmin(req.admin), csrfToken: csrfTokenFor(req.authToken) },
  });
});
