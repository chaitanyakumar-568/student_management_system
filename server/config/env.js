require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const required = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];

function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy server/.env.example to server/.env and fill them in.`
    );
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
}

function getSameSite() {
  const value = (process.env.COOKIE_SAMESITE || '').toLowerCase();
  if (['lax', 'strict', 'none'].includes(value)) return value;
  return isProduction ? 'strict' : 'lax';
}

module.exports = {
  validateEnv,
  isProduction,
  getSameSite,
  get port() {
    return Number(process.env.PORT) || 5000;
  },
  get clientUrl() {
    return process.env.CLIENT_URL.replace(/\/+$/, '');
  },
  get jwtSecret() {
    return process.env.JWT_SECRET;
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '1d';
  },
  get trustProxy() {
    return process.env.TRUST_PROXY === 'true';
  },
};
