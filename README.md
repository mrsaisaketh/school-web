# St. Xavier International School ERP

School management system: a React SPA and an Express REST API over Supabase
Postgres (Prisma). Deploys to Vercel as static frontend + one serverless function.

## Architecture

```
frontend/            React 19 + Vite + Tailwind SPA
  src/lib/api.js     every backend call goes through here (attaches bearer token)
  src/pages/         Login, Careers, and one dashboard per role
backend/
  app.js             the Express app (exported, no listener)
  server.js          local listener only
  lib/auth.js        bcrypt hashing, JWT signing, requireAuth(...roles)
  routes/            auth, students, staff, attendance, invoices, leave,
                     workUpdates, careers, reports, academic
  prisma/            schema.prisma (39 models), seed.js
api/index.js         Vercel entry — re-exports backend/app.js
vercel.json          /api/* to the function, everything else to the SPA
```

Runtime dependencies live in the **root** `package.json`. `backend/` has scripts
only, so the serverless function and local dev resolve one identical copy of
`@prisma/client`.

## Auth model

- Passwords are bcrypt hashed (cost 10). Nothing is stored in plaintext.
- Login returns a JWT (12h). The frontend stores it and sends it as
  `Authorization: Bearer <token>`.
- Every route except `POST /api/auth/login` and the public careers endpoints is
  behind `requireAuth(...roles)`. **Role and identity come from the token, never
  from the request body.**
- Students are pinned to their own records server-side: passing another
  `studentId` or `studentCode` is ignored, not honoured.
- Role groups: `ADMINS` (SUPER_ADMIN, ADMIN), `FINANCE` (+ACCOUNTS),
  `INTERNAL` (+STAFF).

Public without a token: `GET /api/public/site` (what the homepage shows — school
details, classes, subjects, faculty by name and designation only), `GET /api/careers`
(published jobs) and `POST /api/careers` (submitting an application). Listing
applicants or unpublished jobs requires an admin.

Sign-in is rate limited: 8 failed attempts per identifier in 15 minutes,
after which the endpoint answers 429 with `Retry-After`. Failures are recorded as
`LOGIN_FAILED` rows in `AuditLog`, so the count is shared by every API instance and
the attempts are auditable. See `backend/lib/rateLimit.js`.

## Local setup

```bash
npm install && npm install --prefix frontend
cp .env.example .env      # then fill in the values
npm run db:push           # sync schema to the database
npm run db:seed           # seed reference + demo data
npm run dev               # API on :5000, SPA on :3000
```

On macOS, port 5000 is taken by the AirPlay Receiver (ControlCenter). Either
disable it in System Settings → General → AirDrop & Handoff, or run the API on
another port: `PORT=5055 npm run dev:backend`.

## Deploying

Set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` and `NODE_ENV=production` in the
Vercel project, then `vercel --prod`. `vercel-build` runs `prisma generate`
before the frontend build; `schema.prisma` declares the `rhel-openssl-3.0.x`
binary target that the Vercel runtime needs.

## Database access

The app connects as a dedicated `app_user` Postgres role, not as `postgres`.
Row Level Security is enabled on all 39 tables with **no** policies for `anon` or
`authenticated`, so Supabase's auto-generated PostgREST API exposes nothing;
`app_user` has an explicit full-access policy per table.

## Seeded accounts

Passwords for staff and admin accounts come from `SEED_PASSWORD` at seed time.

| Role | Login |
|---|---|
| Super Admin | `superadmin@school.com` |
| Admin | `admin@school.com` |
| Accounts | `accounts@school.com` |
| Staff | `staff@school.com` |
| Student | `STU_1001` — password is the date of birth, `15/08/2010` |
