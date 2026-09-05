# Working in this repository

This is a **Vite + React** single-page app with an **Express** API on **Prisma /
Supabase Postgres**, deployed to **Vercel** as static files plus one serverless
function. It is not a Next.js project; ignore any Next.js guidance.

## Layout

- `frontend/` — the SPA. `src/lib/api.js` is the only place backend calls are
  made from (it attaches the bearer token). `src/components/ui.jsx` holds the
  shared primitives; `src/index.css` holds the design tokens and the `.register`
  and `.mark` classes. Read the top of that file before styling anything.
- `backend/` — `app.js` exports the Express app; `server.js` is the local
  listener; `api/index.js` re-exports the app for Vercel. Every route except
  sign-in and the public endpoints sits behind `requireAuth(...roles)` from
  `backend/lib/auth.js`. Identity and role always come from the token, never
  from the request body.
- **All dependencies live in the root `package.json`.** `backend/` has no
  package.json on purpose, so the function and local dev share one
  `@prisma/client`.

## Running

```
npm install && npm install --prefix frontend
cp .env.example .env           # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET
npm run dev                    # API :5000, SPA :3000
```
macOS reserves :5000 for AirPlay; use `PORT=5055 npm run dev:backend` and
`API_TARGET=http://127.0.0.1:5055 npm run dev:frontend`.

## Checks before you finish

- `npm run build --prefix frontend` must pass.
- `node backend/... --check` on any backend file you touched.
- `npm run test:e2e` — signs in as every role and runs each workflow end to end
  against the configured database (needs a running API; see the script header).
- `npm run scan:sast` (semgrep) and `npm run scan:dast` (OWASP ZAP baseline
  against the deployed URL, needs Docker). Both are open source.

## Do not

- Put `userRole`, `profileId` or any authorisation input in a request body.
- Store or log a password, or print one on screen — including a student's DOB
  labelled as their password.
- Commit `.env`, or add a founding year, motto or statistic that is not in the
  database.
