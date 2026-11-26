const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { csrfTokenFor } = require('../utils/token');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Must run AFTER requireAuth. State-changing requests must carry an `X-CSRF-Token`
// header equal to HMAC(secret, session JWT). The token is returned by /api/auth/login
// and /api/auth/me, so only code that can read our JSON responses (our own frontend,
// allowed by CORS) can send it. Cookies alone are never enough to mutate data.
function verifyCsrf(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const sent = req.get('x-csrf-token');
  if (!sent || typeof sent !== 'string') {
    return next(new AppError('Missing CSRF token.', 403));
  }

  const expected = csrfTokenFor(req.authToken);
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(new AppError('Invalid CSRF token.', 403));
  }
  next();
}

module.exports = { verifyCsrf };
