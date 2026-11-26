const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'sms_token';

function signToken(adminId) {
  return jwt.sign({ sub: String(adminId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
}

function cookieOptions() {
  const sameSite = env.getSameSite ? env.getSameSite() : 'lax';
  return {
    httpOnly: true,
    // SameSite=None requires Secure, so force it in that case too
    secure: env.isProduction || sameSite === 'none',
    sameSite,
    path: '/',
  };
}

function setAuthCookie(res, token) {
  const decoded = jwt.decode(token);
  const maxAge = decoded && decoded.exp ? decoded.exp * 1000 - Date.now() : undefined;
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

// CSRF token bound to the session: HMAC(secret, jwt). An attacker's site cannot
// read it (CORS blocks cross-origin reads) and cannot guess it.
function csrfTokenFor(jwtString) {
  return crypto.createHmac('sha256', env.jwtSecret).update(`csrf:${jwtString}`).digest('hex');
}

module.exports = {
  COOKIE_NAME,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  csrfTokenFor,
};
