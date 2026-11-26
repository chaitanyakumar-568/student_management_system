/*
 * Creates the initial admin account.
 *   npm run seed:admin
 *
 * Safe by design:
 *  - Reads credentials from environment variables (never from source code).
 *  - If an admin with that email already exists, it does NOTHING (never resets a password).
 *  - To deliberately reset a password, run with:  RESET_ADMIN_PASSWORD=true npm run seed:admin
 */
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Admin = require('../models/Admin');
const { EMAIL_RE } = require('../utils/validators');

async function seed() {
  env.validateEnv();

  const name = (process.env.ADMIN_NAME || 'Administrator').trim();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !EMAIL_RE.test(email)) throw new Error('ADMIN_EMAIL is missing or invalid.');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters.');

  await connectDB();

  const existing = await Admin.findOne({ email });
  if (existing) {
    if (process.env.RESET_ADMIN_PASSWORD === 'true') {
      existing.passwordHash = await bcrypt.hash(password, 12);
      await existing.save();
      console.log(`Password reset for admin ${email} (RESET_ADMIN_PASSWORD=true).`);
    } else {
      console.log(`Admin ${email} already exists. Nothing changed (password was NOT reset).`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.create({ name, email, passwordHash });
  console.log(`Admin created: ${email}`);
}

seed()
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
