/*
 * Backend API tests (Jest + Supertest).
 * Uses MONGODB_URI_TEST if set, otherwise spins up an in-memory MongoDB (mongodb-memory-server).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_that_is_definitely_longer_than_32_chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://placeholder';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const createApp = require('../app');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

let mongod;
let app;

const ADMIN = { email: 'admin@test.com', password: 'Str0ng!Passw0rd' };
const sample = { name: 'Asha Rao', rollNumber: '00123', branch: 'CSE', address: '12 MG Road, Vijayawada' };

// Logs in and returns a supertest agent (keeps the cookie) plus the CSRF token.
async function loginAgent() {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send(ADMIN);
  expect(res.status).toBe(200);
  return { agent, csrf: res.body.data.csrfToken, res };
}

beforeAll(async () => {
  let uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri('sms_test');
  }
  await mongoose.connect(uri);
  await Student.init();
  await Admin.init();
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Student.deleteMany({});
  await Admin.deleteMany({});
  await Admin.create({
    name: 'Test Admin',
    email: ADMIN.email,
    passwordHash: await bcrypt.hash(ADMIN.password, 4),
  });
});

describe('Authentication', () => {
  test('login succeeds with valid credentials, sets HTTP-only cookie, hides sensitive data', async () => {
    const res = await request(app).post('/api/auth/login').send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.admin.email).toBe(ADMIN.email);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    expect(res.body.data.token).toBeUndefined(); // JWT must not be in the body

    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/sms_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  test('login fails with wrong password and unknown email using the same message', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: 'wrong-password' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'whatever123' });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.message).toBe('Invalid email or password');
    expect(unknown.body.message).toBe(bad.body.message);
    expect(bad.headers['set-cookie']).toBeUndefined();
  });

  test('login validates missing/invalid fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.errors.email).toBeDefined();
    expect(res.body.errors.password).toBeDefined();
  });

  test('login rejects NoSQL operator injection', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: '' }, password: { $ne: '' } });
    expect(res.status).toBe(400);
  });

  test('/me returns the admin when logged in (auth persists across requests)', async () => {
    const { agent } = await loginAgent();
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.admin.email).toBe(ADMIN.email);
    expect(res.body.data.admin.passwordHash).toBeUndefined();
  });

  test('/me is denied without a cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('logout clears the cookie and blocks subsequent access', async () => {
    const { agent } = await loginAgent();
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(out.headers['set-cookie'].join(';')).toMatch(/sms_token=;/);
    const after = await agent.get('/api/students');
    expect(after.status).toBe(401);
  });

  test('expired and tampered tokens are rejected', async () => {
    const admin = await Admin.findOne({ email: ADMIN.email });
    const expired = jwt.sign({ sub: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: -10 });
    const forged = jwt.sign({ sub: String(admin._id) }, 'some-other-secret-that-is-long-enough-123');
    const r1 = await request(app).get('/api/students').set('Cookie', `sms_token=${expired}`);
    const r2 = await request(app).get('/api/students').set('Cookie', `sms_token=${forged}`);
    expect(r1.status).toBe(401);
    expect(r1.body.message).toMatch(/expired/i);
    expect(r2.status).toBe(401);
  });

  test('a valid token for a deleted admin is rejected', async () => {
    const { agent } = await loginAgent();
    await Admin.deleteMany({});
    const res = await agent.get('/api/students');
    expect(res.status).toBe(401);
  });
});

describe('Authorization: every student endpoint requires admin auth', () => {
  const id = '64b7f0c2a1b2c3d4e5f60718';
  const cases = [
    ['get', '/api/students'],
    ['get', '/api/students/stats'],
    ['get', `/api/students/${id}`],
    ['post', '/api/students'],
    ['put', `/api/students/${id}`],
    ['delete', `/api/students/${id}`],
  ];
  test.each(cases)('%s %s -> 401 without authentication', async (method, url) => {
    const res = await request(app)[method](url).send(sample);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('CSRF protection', () => {
  test('state-changing request without X-CSRF-Token is rejected even with a valid cookie', async () => {
    const { agent } = await loginAgent();
    const res = await agent.post('/api/students').send(sample);
    expect(res.status).toBe(403);
    expect(await Student.countDocuments()).toBe(0);
  });

  test('wrong CSRF token is rejected', async () => {
    const { agent } = await loginAgent();
    const res = await agent.post('/api/students').set('X-CSRF-Token', 'nope').send(sample);
    expect(res.status).toBe(403);
  });
});

describe('Student CRUD', () => {
  test('creates a student (preserves leading zeros, trims whitespace)', async () => {
    const { agent, csrf } = await loginAgent();
    const res = await agent
      .post('/api/students')
      .set('X-CSRF-Token', csrf)
      .send({ ...sample, name: '  Asha Rao  ', rollNumber: ' 00123 ' });
    expect(res.status).toBe(201);
    expect(res.body.data.student.rollNumber).toBe('00123');
    expect(res.body.data.student.name).toBe('Asha Rao');
    expect(res.body.data.student.createdAt).toBeDefined();
  });

  test('ignores unexpected fields (mass assignment)', async () => {
    const { agent, csrf } = await loginAgent();
    const res = await agent
      .post('/api/students')
      .set('X-CSRF-Token', csrf)
      .send({ ...sample, _id: '64b7f0c2a1b2c3d4e5f60718', isAdmin: true, createdAt: '2000-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.data.student._id).not.toBe('64b7f0c2a1b2c3d4e5f60718');
    expect(res.body.data.student.isAdmin).toBeUndefined();
    expect(new Date(res.body.data.student.createdAt).getFullYear()).not.toBe(2000);
  });

  test('rejects missing required fields with field-level errors', async () => {
    const { agent, csrf } = await loginAgent();
    const res = await agent.post('/api/students').set('X-CSRF-Token', csrf).send({ name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        rollNumber: expect.any(String),
        branch: expect.any(String),
        address: expect.any(String),
      })
    );
  });

  test('rejects non-string values (operator injection) on create', async () => {
    const { agent, csrf } = await loginAgent();
    const res = await agent
      .post('/api/students')
      .set('X-CSRF-Token', csrf)
      .send({ ...sample, rollNumber: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  test('duplicate roll number returns 409 on create and update', async () => {
    const { agent, csrf } = await loginAgent();
    await agent.post('/api/students').set('X-CSRF-Token', csrf).send(sample).expect(201);
    const dup = await agent.post('/api/students').set('X-CSRF-Token', csrf).send({ ...sample, name: 'Other Person' });
    expect(dup.status).toBe(409);
    expect(dup.body.errors.rollNumber).toBeDefined();

    const second = await agent
      .post('/api/students')
      .set('X-CSRF-Token', csrf)
      .send({ ...sample, rollNumber: '00124' })
      .expect(201);
    const upd = await agent
      .put(`/api/students/${second.body.data.student._id}`)
      .set('X-CSRF-Token', csrf)
      .send({ ...sample, rollNumber: '00123' });
    expect(upd.status).toBe(409);
  });

  test('lists, searches, paginates and fetches a single student', async () => {
    const { agent, csrf } = await loginAgent();
    for (let i = 1; i <= 12; i += 1) {
      await agent
        .post('/api/students')
        .set('X-CSRF-Token', csrf)
        .send({ ...sample, name: i === 3 ? 'Zed Unique' : `Student ${i}`, rollNumber: String(1000 + i) })
        .expect(201);
    }
    const page1 = await agent.get('/api/students?limit=5&page=1');
    expect(page1.status).toBe(200);
    expect(page1.body.data.students).toHaveLength(5);
    expect(page1.body.data.pagination).toMatchObject({ total: 12, totalPages: 3, page: 1 });

    const byName = await agent.get('/api/students?search=zed');
    expect(byName.body.data.students).toHaveLength(1);
    const byRoll = await agent.get('/api/students?search=1011');
    expect(byRoll.body.data.students[0].rollNumber).toBe('1011');

    // regex metacharacters are escaped, not interpreted
    const weird = await agent.get('/api/students?search=.*');
    expect(weird.status).toBe(200);
    expect(weird.body.data.students).toHaveLength(0);

    const one = await agent.get(`/api/students/${byName.body.data.students[0]._id}`);
    expect(one.status).toBe(200);
    expect(one.body.data.student.name).toBe('Zed Unique');
  });

  test('stats endpoint returns totals', async () => {
    const { agent, csrf } = await loginAgent();
    await agent.post('/api/students').set('X-CSRF-Token', csrf).send(sample).expect(201);
    await agent.post('/api/students').set('X-CSRF-Token', csrf).send({ ...sample, rollNumber: '2', branch: 'ECE' }).expect(201);
    const res = await agent.get('/api/students/stats');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ total: 2, totalBranches: 2, addedLast7Days: 2 });
  });

  test('updates a student', async () => {
    const { agent, csrf } = await loginAgent();
    const created = await agent.post('/api/students').set('X-CSRF-Token', csrf).send(sample).expect(201);
    const id = created.body.data.student._id;
    const res = await agent
      .put(`/api/students/${id}`)
      .set('X-CSRF-Token', csrf)
      .send({ ...sample, branch: 'ECE', address: 'New Address 5' });
    expect(res.status).toBe(200);
    expect(res.body.data.student.branch).toBe('ECE');
    const stored = await Student.findById(id);
    expect(stored.address).toBe('New Address 5');
  });

  test('update validates data and handles missing students / invalid ids', async () => {
    const { agent, csrf } = await loginAgent();
    const created = await agent.post('/api/students').set('X-CSRF-Token', csrf).send(sample).expect(201);
    const bad = await agent
      .put(`/api/students/${created.body.data.student._id}`)
      .set('X-CSRF-Token', csrf)
      .send({ ...sample, name: '' });
    expect(bad.status).toBe(400);

    const missing = await agent.put('/api/students/64b7f0c2a1b2c3d4e5f60718').set('X-CSRF-Token', csrf).send(sample);
    expect(missing.status).toBe(404);

    const invalid = await agent.put('/api/students/not-an-id').set('X-CSRF-Token', csrf).send(sample);
    expect(invalid.status).toBe(400);
  });

  test('deletes a student; second delete and invalid id are handled', async () => {
    const { agent, csrf } = await loginAgent();
    const created = await agent.post('/api/students').set('X-CSRF-Token', csrf).send(sample).expect(201);
    const id = created.body.data.student._id;

    const del = await agent.delete(`/api/students/${id}`).set('X-CSRF-Token', csrf);
    expect(del.status).toBe(200);
    expect(await Student.countDocuments()).toBe(0);

    const again = await agent.delete(`/api/students/${id}`).set('X-CSRF-Token', csrf);
    expect(again.status).toBe(404);

    const invalid = await agent.delete('/api/students/xyz').set('X-CSRF-Token', csrf);
    expect(invalid.status).toBe(400);

    const get = await agent.get(`/api/students/${id}`);
    expect(get.status).toBe(404);
  });
});

describe('Security headers, CORS and error handling', () => {
  test('sets Helmet headers and does not reveal Express', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('CORS allows only the configured origin', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const bad = await request(app).get('/api/health').set('Origin', 'http://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('unknown routes return JSON 404; malformed JSON returns 400 without stack traces', async () => {
    const nf = await request(app).get('/api/nope');
    expect(nf.status).toBe(404);
    expect(nf.body.success).toBe(false);

    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).not.toMatch(/at .*\.js/);
  });
});
