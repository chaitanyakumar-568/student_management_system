
# Student Management System (MERN)

A full-stack, database-backed admin app: **MongoDB + Express + React (Vite) + Node.js**.
Only an authenticated administrator can add, view, update and delete student records.

> **Verification status (please read):** the code was written and syntax-checked with Node, but
> `npm install` was blocked in the environment where it was generated, so **the automated tests,
> the Vite build and a live run against MongoDB have NOT been executed yet.** Follow
> [Run the tests](#run-the-automated-tests) and the [manual checklist](#manual-test-checklist) on your
> machine to verify it. If something fails, send me the error output and I will fix it.

---

## 1. Architecture

```
student-management-system/
├── README.md
├── .gitignore
├── server/                      # Express API
│   ├── server.js                # entry: validates env, connects DB, starts HTTP server
│   ├── app.js                   # builds the Express app (helmet, cors, routes, error handler)
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   ├── env.js               # env validation + cookie/sameSite helpers
│   │   └── db.js                # Mongoose connection module
│   ├── models/
│   │   ├── Admin.js             # name, email (unique), passwordHash (select:false)
│   │   └── Student.js           # name, rollNumber (unique String), branch, address (+timestamps)
│   ├── middleware/
│   │   ├── auth.js              # requireAuth: verifies JWT cookie + admin exists in DB
│   │   ├── csrf.js              # verifyCsrf: X-CSRF-Token check on POST/PUT/DELETE
│   │   ├── sanitize.js          # strips $operators / dotted keys (NoSQL injection)
│   │   ├── rateLimiter.js       # login limiter (10 / 15 min) + global API limiter
│   │   └── errorHandler.js      # notFound + centralized JSON error handler
│   ├── controllers/
│   │   ├── authController.js    # login, logout, me
│   │   └── studentController.js # list/search/paginate, stats, get, create, update, delete
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── studentRoutes.js     # router.use(requireAuth, verifyCsrf) -> protects ALL routes
│   ├── scripts/seedAdmin.js     # creates the first admin (never overwrites a password)
│   ├── utils/                   # AppError, asyncHandler, token (JWT/cookies/CSRF), validators
│   └── tests/api.test.js        # Jest + Supertest
└── client/                      # React (Vite + Tailwind CSS v3)
    ├── package.json, vite.config.js, tailwind.config.js, postcss.config.js, index.html
    ├── .env.example
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── context/             # AuthContext (session check on refresh), ToastContext
        ├── services/            # api.js (axios + CSRF + 401 handling), authService, studentService
        ├── hooks/useDebounce.js
        ├── layouts/AdminLayout.jsx          # sidebar / mobile drawer, logout
        ├── components/          # ProtectedRoute, Modal, ConfirmDialog, StudentForm,
        │                        # StudentTable, Pagination, StatCard, Spinner
        └── pages/               # LoginPage, DashboardPage, NotFoundPage
```

## 2. Authentication flow

1. **Login** – `POST /api/auth/login` with email + password. The server looks up the admin, compares the
   password with `bcrypt.compare` (a dummy hash is compared when the email is unknown, so timing does not
   reveal which emails exist), and returns the same `401 Invalid email or password` for both failures.
2. **Session cookie** – on success the server signs a JWT (`HS256`, `JWT_EXPIRES_IN`) and sets it in the
   `sms_token` cookie: `HttpOnly`, `Secure` (production / `SameSite=None`), `SameSite=Lax` (dev) or `Strict`
   (prod). JavaScript can never read the JWT; it is never stored in `localStorage` or returned in JSON.
3. **CSRF token** – the login and `/auth/me` responses include `csrfToken = HMAC(JWT_SECRET, jwt)`. The React app
   keeps it **in memory only** and sends it as `X-CSRF-Token` on every POST/PUT/DELETE. The server recomputes
   and compares it (timing-safe). A malicious site can make the browser send the cookie, but cannot read the
   token (CORS blocks reading our responses), so forged requests get `403`.
4. **Every protected request** – `requireAuth` reads the cookie, verifies signature/expiry, then **loads the
   admin from MongoDB** (a deleted admin's old token stops working). Identity is never taken from the body,
   query or headers.
5. **Page refresh** – `AuthContext` calls `GET /api/auth/me` on load. `ProtectedRoute` shows a spinner until it
   answers, then renders the dashboard (cookie valid) or redirects to `/login` (no/expired cookie).
6. **Expired session mid-use** – any `401` from a data call clears client auth state and the guard redirects to login.
7. **Logout** – `POST /api/auth/logout` clears the cookie; later API calls return `401`.

Frontend route protection is only UX. The backend enforces auth on **all** student endpoints
(`router.use(requireAuth, verifyCsrf)` in `studentRoutes.js`), including both `GET`s.

## 3. Prerequisites

- Node.js **18+** (developed against Node 22) and npm
- MongoDB: a local install **or** a free MongoDB Atlas cluster

## 4. Setup

### 4.1 MongoDB

- **Local:** install MongoDB Community Edition and start it. URI: `mongodb://127.0.0.1:27017/student_management`
- **Atlas:** create a free cluster → *Database Access*: add a user with a strong password →
  *Network Access*: add your IP → *Connect → Drivers*: copy the `mongodb+srv://...` string and put your
  user/password in it (URL-encode special characters in the password).

### 4.2 Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 4.3 Environment files

```bash
# macOS / Linux
cp server/.env.example server/.env
cp client/.env.example client/.env
# Windows PowerShell
copy server\.env.example server\.env
copy client\.env.example client\.env
```

Edit `server/.env`:

| Variable | Meaning |
|---|---|
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | Mongo connection string |
| `JWT_SECRET` | Long random secret (≥ 32 chars, the server refuses to start otherwise) |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d`, `8h` |
| `CLIENT_URL` | Exact frontend origin for CORS, e.g. `http://localhost:5173` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used **only** by the seed script (password ≥ 10 chars) |
| `COOKIE_SAMESITE` (optional) | `lax` / `strict` / `none` |
| `TRUST_PROXY` (optional) | `true` behind a reverse proxy / PaaS |

`client/.env`: `VITE_API_URL=http://localhost:5000/api`

### 4.4 Generate a strong JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Paste the output as `JWT_SECRET`.

### 4.5 Seed the admin account

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env` to your own values, then:

```bash
cd server
npm run seed:admin
```

- The password is hashed with bcrypt (cost 12) before it is stored.
- If that email already exists the script **changes nothing**. To deliberately reset a password:
  `RESET_ADMIN_PASSWORD=true npm run seed:admin` (PowerShell: `$env:RESET_ADMIN_PASSWORD='true'; npm run seed:admin`).
- There is **no** public registration route. After seeding you may delete `ADMIN_PASSWORD` from `.env`.

### 4.6 Run

```bash
# terminal 1
cd server && npm run dev        # or: npm start
# terminal 2
cd client && npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:5000> (health check: <http://localhost:5000/api/health>)

Sign in with the seeded email/password.

## 5. API documentation

All responses are JSON: `{ "success": true|false, "message": "...", "data": {...}, "errors": { "field": "msg" } }`.
All `/api/students*` routes need the auth cookie; `POST/PUT/DELETE` also need header `X-CSRF-Token`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | – (rate limited) | Body `{email, password}` → sets cookie; returns `{admin, csrfToken}` |
| POST | `/api/auth/logout` | – | Clears cookie |
| GET | `/api/auth/me` | cookie | Returns `{admin, csrfToken}` |
| GET | `/api/students?search=&page=1&limit=10` | cookie | Paginated list; `search` matches name or roll number (case-insensitive, literal). `limit` max 100 |
| GET | `/api/students/stats` | cookie | `{total, addedThisMonth, addedLast7Days, totalBranches, topBranch}` |
| GET | `/api/students/:id` | cookie | One student |
| POST | `/api/students` | cookie + CSRF | Body `{name, rollNumber, branch, address}` → `201` |
| PUT | `/api/students/:id` | cookie + CSRF | Same body (all four fields required) |
| DELETE | `/api/students/:id` | cookie + CSRF | Deletes the record |

Status codes: `200`, `201`, `400` (validation / bad id / bad JSON), `401` (no/invalid/expired session, bad
credentials), `403` (CSRF), `404` (not found), `409` (duplicate roll number), `413`, `429` (rate limit),
`503` (database unavailable), `500` (generic message only – stack traces are logged server-side, never returned).

## 6. Security configuration

| Practice | Where |
|---|---|
| bcrypt password hashing (cost 12), hash is `select:false` and never serialized | `models/Admin.js`, `scripts/seedAdmin.js` |
| JWT in HttpOnly cookie; `Secure` in production; `SameSite` Lax (dev) / Strict (prod) | `utils/token.js`, `config/env.js` |
| CSRF: session-bound HMAC token in `X-CSRF-Token` + SameSite cookies | `middleware/csrf.js` |
| Helmet headers; `x-powered-by` disabled | `app.js` |
| CORS limited to `CLIENT_URL` with credentials | `app.js` |
| Login rate limit (10 failed attempts / 15 min / IP) + global API limit | `middleware/rateLimiter.js` |
| NoSQL-injection defence: operator keys stripped, non-string fields rejected, regex input escaped | `middleware/sanitize.js`, `utils/validators.js` |
| Mass-assignment protection: only `name, rollNumber, branch, address` are read | `utils/validators.js` |
| Body size limit 10 kb; centralized error handler hides internals | `app.js`, `middleware/errorHandler.js` |
| All secrets from env; `.env` is git-ignored; server refuses weak/missing `JWT_SECRET` | `config/env.js`, `.gitignore` |

**Local development:** frontend `localhost:5173` and API `localhost:5000` are the *same site*, so `SameSite=Lax`
cookies work over plain HTTP.

**Deployment checklist**

1. Serve both apps over **HTTPS**; set `NODE_ENV=production` (cookie becomes `Secure` + `SameSite=Strict`).
2. If frontend and API are on the **same registrable domain** (e.g. `app.example.com` + `api.example.com`) keep
   `Strict`/`Lax`. If they are on **different sites**, set `COOKIE_SAMESITE=none` (forces `Secure`); the CSRF token
   still protects writes.
3. Set `CLIENT_URL` to the exact deployed frontend origin; set `VITE_API_URL` to the deployed API (`.../api`) **before** building the client.
4. Behind a proxy/PaaS set `TRUST_PROXY=true` so the rate limiter sees real client IPs.
5. Use a unique 64-byte `JWT_SECRET`, a restricted Atlas user, and IP allow-listing. Rotate secrets if leaked
   (rotating `JWT_SECRET` logs everyone out).
6. Build the client with `npm run build` and host `client/dist` on a static host / CDN; add a CSP appropriate to that host.
7. Change the seeded password after first login in real deployments and remove `ADMIN_PASSWORD` from the server env.

## 7. Run the automated tests

```bash
cd server
npm test
```

`tests/api.test.js` uses Jest + Supertest. By default it starts an in-memory MongoDB via
`mongodb-memory-server` (downloads a MongoDB binary on first run; needs internet). To use your own database instead:

```bash
MONGODB_URI_TEST="mongodb://127.0.0.1:27017/sms_test" npm test      # the test DB is wiped by the tests!
```

Covered: valid/invalid login (same error for both), no secrets in responses, cookie flags, NoSQL-operator
injection, expired/forged/orphaned tokens, **401 on every student endpoint without auth**, CSRF rejection,
create (trim + leading zeros), mass-assignment, validation errors, duplicate roll numbers (create + update),
list/search/pagination/regex-escaping, stats, get, update, delete (+ second delete/invalid id), logout then
access denial, `/me` persistence, Helmet/CORS, JSON 404 and malformed JSON.

## 8. Manual test checklist

Start MongoDB, the API and the client, then in the browser:

- [ ] Open `/dashboard` while logged out → redirected to `/login`.
- [ ] Wrong password → "Invalid email or password"; empty fields / bad email → field messages.
- [ ] Correct login → dashboard with welcome message and summary cards.
- [ ] **Refresh** the dashboard → still logged in (no flash to login).
- [ ] **Create:** *Add Student* → submit empty (field errors) → fill in → success toast, row appears, cards update.
- [ ] Add the same roll number again → "A student with this roll number already exists" under the field.
- [ ] Roll number `00123` is displayed with its leading zeros.
- [ ] **Read/search:** type a name or roll number → list filters; nonsense → empty state; add 11+ students → pagination works.
- [ ] **Update:** *Edit* → form pre-filled → change branch → *Update* → row changes. Change roll number to an existing one → duplicate error.
- [ ] **Delete:** *Delete* → confirmation dialog → *Cancel* keeps it; *Delete* removes it and updates the list/cards.
- [ ] Stop the API → list shows an error with *Try again*; restart and retry.
- [ ] **Logout** → back at login; press browser Back / open `/dashboard` → redirected to login.
- [ ] With the API running, `curl -i http://localhost:5000/api/students` → `401`.
- [ ] Resize to phone width → sidebar becomes a menu button, table becomes cards.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `Missing required environment variables` | Create `server/.env` from `.env.example` |
| `JWT_SECRET must be at least 32 characters` | Generate one (see 4.4) |
| `MongoDB connection failed` / `ECONNREFUSED` | Start `mongod`, or fix the URI; for Atlas allow your IP and URL-encode the password |
| `Authentication failed` (Atlas) | Wrong DB user/password |
| `Admin ... already exists. Nothing changed` | Expected; use `RESET_ADMIN_PASSWORD=true` to reset |
| Browser CORS error | `CLIENT_URL` must exactly equal the frontend origin (scheme + host + port, no trailing slash); restart the API |
| Login "works" but next request is `401` | Cookie not stored: use `http://localhost:5173` (not `127.0.0.1`) consistently, check `VITE_API_URL`, and in production use HTTPS + proper `COOKIE_SAMESITE` |
| `403 Missing/Invalid CSRF token` | Session started in another tab/after secret change; refresh the page or log in again |
| `429 Too many login attempts` | Wait 15 minutes (or restart the API in development) |
| `EADDRINUSE` | Change `PORT` (and `VITE_API_URL`) or stop the other process |
| Tests: mongodb-memory-server download fails | Use `MONGODB_URI_TEST` with a local MongoDB |
| Vite port 5173 busy | The config uses `strictPort`; free the port (CORS expects 5173) |

## 10. npm scripts

| Where | Script | Purpose |
|---|---|---|
| server | `npm start` | Run API |
| server | `npm run dev` | Run API with nodemon |
| server | `npm run seed:admin` | Create the initial admin |
| server | `npm test` | Jest + Supertest |
| client | `npm run dev` | Vite dev server (5173) |
| client | `npm run build` | Production build to `client/dist` |
| client | `npm run preview` | Preview the production build |

# student_management_system
MERN application

