# FIFA Predict

A World Cup match-prediction game: participants predict scores, a leaderboard
ranks them by correct predictions, and an admin panel manages fixtures. Live
scores sync automatically from ESPN's free public API.

This version has been rebuilt with a **real database and real server-side
security**. See "What was fixed" below for why that mattered.

---

## 1. Stack

- **Frontend:** React + Vite + TypeScript + Tailwind
- **Backend:** Vercel Serverless Functions (`/api`)
- **Database:** Firebase Firestore
- **Auth:** Server-verified admin sessions (bcrypt + JWT httpOnly cookie) - no
  credentials ever stored or checked in the browser

---

## 2. One-time setup

### 2.1 Create a Firebase project (free)

1. Go to <https://console.firebase.google.com> → **Add project** → give it
   any name → you can disable Google Analytics, it's not needed.
2. In the left sidebar, go to **Build → Firestore Database → Create
   database**. Choose **Production mode** and any region close to you.
3. Go to **Project settings** (gear icon) → **Service accounts** → **Generate
   new private key**. This downloads a JSON file - keep it private, never
   commit it to git.

From that JSON file you need three values for later:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters exactly as
  they appear in the file, and wrap the whole value in quotes)

### 2.2 Generate a session secret

Run this once and save the output:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

That's your `JWT_SECRET`.

### 2.3 Fill in your local `.env`

```bash
cp .env.example .env
```

Then edit `.env` with the values from steps 2.1 and 2.2, plus pick an
`ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD` - this is only used to
bootstrap your very first admin login (see §4).

---

## 3. Local development

```bash
npm install
npm run dev
```

Vite serves the frontend, but the `/api` serverless functions need Vercel's
dev runtime to work locally too:

```bash
npm i -g vercel
vercel dev
```

`vercel dev` reads your `.env` file automatically and runs both the frontend
and the API functions together at `http://localhost:3000`.

---

## 4. First admin login

1. Open the site → click the login icon → sign in with the
   `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD` you set in `.env`.
   This is the **only** time those env vars are used - they seed one admin
   record in Firestore.
2. Immediately go to the Admin Panel → **Update Admin Access Key** → enter
   your current password and set a new username/password. From now on your
   credentials live only as a bcrypt hash in Firestore, verified server-side
   on every request.
3. You can now remove `ADMIN_DEFAULT_PASSWORD` from your environment
   variables if you want (it's no longer used once the Firestore record
   exists).

---

## 5. Deploying

### Vercel (recommended - this project is built for it)

1. Push this project to a GitHub repo.
2. Import it at <https://vercel.com/new>.
3. In **Project Settings → Environment Variables**, add everything from
   `.env.example` (Firebase creds, `JWT_SECRET`, `ADMIN_DEFAULT_USERNAME`,
   `ADMIN_DEFAULT_PASSWORD`, and optionally `CRON_SECRET`).
4. Deploy. Vercel auto-detects the build command and the `/api` folder.
5. Log in as admin (§4) and change your password immediately.

Vercel's free (Hobby) tier only allows cron jobs to run **once a day**, so
`vercel.json` schedules a daily fallback sync at 03:00 UTC using
`CRON_SECRET`. In practice you don't need to rely on that: **every time
someone loads the site, `GET /api/matches` opportunistically re-syncs scores
from ESPN if it's been more than ~45 seconds since the last sync** - so
scores update automatically and near-live as long as people are actually
using the site, with no paid plan required. The daily cron is just a safety
net for periods with zero visitors. You (or any admin) can also hit **Sync
Now** in the Admin Panel any time.

### Netlify or another host

The frontend (`npm run build` → `dist/`) will run anywhere as static files.
The `/api` functions, however, are written in the Vercel serverless function
format (`export default function handler(req, res)`). To deploy on Netlify
you'd move them into `netlify/functions/` and adjust the request/response
handling to Netlify's format - the Firebase/auth/scoring logic in `lib/` is
plain Node.js and can be reused as-is.

---

## 6. What was fixed from the original version

The version you sent had a working UI but an insecure/unreliable backend.
Specifically:

1. **No authentication on writes.** The old `/api/predictions` endpoint
   accepted POST requests from anyone with no login check - any visitor
   could overwrite the entire leaderboard, matches, and tickets from their
   browser console. **Fixed:** every write endpoint now requires a valid
   server-verified admin session (`requireAdmin` in `lib/auth.js`).

2. **Fake admin login.** The admin username/password check ran entirely in
   the browser, with the default password baked into the JS bundle.
   **Fixed:** login is verified server-side against a bcrypt hash stored in
   Firestore; the browser never sees or stores the password, and the session
   is a signed httpOnly cookie.

3. **No real database.** Shared state lived in a serverless function's
   memory, which Vercel resets unpredictably - explaining random data loss
   and inconsistency between devices. **Fixed:** Firestore is now the single
   source of truth.

4. **Client-side-only duplicate prevention.** Clearing `localStorage` let
   anyone submit unlimited predictions per match. **Fixed:** duplicate and
   prediction-window checks are enforced server-side in `api/tickets.js`,
   independent of anything the client sends.

5. **Manually editable leaderboard.** The admin panel could set anyone's
   points/accuracy directly, which undermines a "fair prediction game".
   **Fixed:** the leaderboard is now purely computed from real match results
   client-side, with no write path at all.

6. **Broken live-score integration.** It depended on a local Express proxy
   that doesn't exist on Vercel, plus a paid API key. **Fixed:** now uses
   ESPN's free public scoreboard API, synced server-side.

---

## 7. Project structure

```
api/                  Vercel serverless functions (the backend)
  auth/                Login / logout / session check
  admin/               Change admin credentials
  matches.js           Public GET, admin-only POST/PUT
  tickets.js           Public GET, public POST (server-validated)
  sync-scores.js       Manual (admin) or cron-triggered ESPN sync
lib/                   Shared server-only logic
  firebaseAdmin.js      Firestore connection
  auth.js               Password hashing, session cookies
  scoreSync.js           ESPN fetch + matching + Firestore updates
src/
  services/api.ts       Frontend's fetch wrapper for all endpoints above
  components/           UI (unchanged look & feel from the original design)
  App.tsx                Top-level state, now backed by the API instead of
                          localStorage
```
