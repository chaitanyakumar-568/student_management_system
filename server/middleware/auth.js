const Admin = require('../models/Admin');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { COOKIE_NAME, verifyToken, clearAuthCookie } = require('../utils/token');

// Verifies the JWT from the HTTP-only cookie AND re-checks the admin exists in the database.
// Nothing about identity or role is ever read from the request body, query or headers.
const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) throw new AppError('Authentication required. Please log in.', 401);

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw new AppError(expired ? 'Session expired. Please log in again.' : 'Invalid session. Please log in again.', 401);
  }

  const admin = await Admin.findById(payload.sub);
  if (!admin) {
    clearAuthCookie(_res);
    throw new AppError('Account no longer exists. Please log in again.', 401);
  }

  req.admin = admin;
  req.authToken = token;
  next();
});

module.exports = { requireAuth };
