# FLOW — Full Project Explanation

A complete reference for defending the project: business idea, architecture, database, security, deployment, and the reasoning behind each technology choice.
---

## 1. Business Overview

### 1.1 What is FLOW?
**FLOW** is a B2B event-booking platform that lets companies (event managers, HR teams, marketing teams) discover, book, and pay for venues and event-related services from a single interface. Think of it as a "corporate Airbnb / OpenTable" specifically for event organisation: restaurants, outdoor spaces, master-classes, activities, and corporate gifts.

### 1.2 Who uses it (user roles)
The system has **three roles** baked into the database (`Role` enum):

| Role | Who they are | What they do |
|---|---|---|
| **MANAGER** | Corporate event organiser, HR/admin staff | Browses the catalogue, books venues, manages the "Event Basket" (cart), tracks expenses for their company. |
| **PROVIDER** | Restaurant owner, activity host, gift shop | Lists their venues/services, sets prices, receives Telegram notifications when a booking is confirmed, manages availability. |
| **ADMIN** | FLOW platform staff | Moderates venues (toggle `isActive`), can act on behalf of any provider/manager. Full read/write. |

### 1.3 Core flow (the "happy path")
1. **Manager** signs up, picks the *"I want to book"* role during onboarding, gets attached to a `Company`.
2. They browse venues by category (Restaurants, Outdoor, Master Classes, Activities, Gifts) or use the **AI vibe search** (free-text: *"a cosy place for a 20-person team retreat"*).
3. They open a venue page, optionally chat with the **AI venue assistant** (multilingual, answers questions about that specific venue), and create a `Booking` (status `PENDING`).
4. The **Provider** is notified; once they confirm, the booking flips to `CONFIRMED`, an `Expense` record is auto-created in the same DB transaction, and a **Telegram message** is fired to the provider (HTML-formatted, includes venue, date, cost).
5. The Manager sees confirmed bookings in the **Cart** and the company's **Dashboard** aggregates expenses (by category, with CSV export).

### 1.4 Why this product
- Event organisation in corporate Uzbekistan (and similar markets) is fragmented: phone calls, WhatsApp, manual invoices.
- **Pain points solved:**
  - Discovery — one catalogue instead of 20 Instagram accounts.
  - Multi-vendor cart — book a restaurant + a master class + gifts in one flow.
  - Expense tracking & exportable reports — finance teams get a CSV instead of paper receipts.
  - Provider-side notifications via Telegram (the dominant messenger in CIS markets) — no missed bookings.
- **Monetisation potential** (not yet built but architecturally supported): commission per confirmed booking, premium provider listings, paid AI search.

### 1.5 Pricing model
Two pricing strategies coexist on the `Venue` model:
- `pricePerHour` — used for hourly bookings (master classes, hall rental).
- `averageCheck` — per-guest price (used for restaurants/catering).

`createBooking` chooses automatically: if `averageCheck > 0` → `cost = averageCheck × guests`; otherwise → `cost = pricePerHour × hours`. This dual model keeps all five categories in one schema.

---

## 2. High-Level Architecture

### 2.1 Monorepo layout (Turborepo + npm workspaces)
```
bisp-final-flow/
├── apps/
│   ├── web/         # React Router v7 SPA (frontend)
│   └── server/      # Express 5 API (backend)
├── packages/
│   ├── auth/        # Better-Auth configuration (shared by web + server)
│   ├── db/          # Prisma schema, generated client, docker-compose for local PG
│   ├── env/         # Type-safe env vars (T3 env + Zod) — server.ts + web.ts
│   ├── ui/          # shadcn/ui primitives + Tailwind tokens
│   └── config/      # Shared tsconfig / lint config
```

**Why a monorepo?**
- Single source of truth for the database schema and auth config — the web app imports types from `@bisp-final-flow/db` so a Prisma schema change immediately type-checks both sides.
- One `npm install`, one CI pipeline, atomic commits across frontend + backend.
- Turborepo gives **task-graph caching**: only the affected workspace rebuilds on a change.

### 2.2 Request flow
```
Browser (React Router SPA)
   │  fetch(apiUrl("/api/..."), { credentials: "include" })
   ▼
Express server
   │  CORS → cookie session check (Better-Auth) → role middleware
   ▼
Prisma (PostgreSQL)
   │
   ├── on Booking CONFIRM → $transaction { update + create Expense + Telegram }
   └── AI endpoints → fetch GitHub Models API (gpt-4o)
```

### 2.3 Apps

#### `apps/server` — Express 5 API
- Entry: `apps/server/src/index.ts`.
- Mounts:
  - `/api/auth/*` → Better-Auth handler (`toNodeHandler(auth)`)
  - `/api/me` (GET, PATCH) — current-user profile
  - `/api/onboarding` — finalise role + company after signup
  - `/api/venues`, `/api/venues/my`, `/api/venues/:id`, plus toggle/edit endpoints
  - `/api/bookings` (CRUD + `/slots`, `/my`, `/provider`, `/:id/confirm`, `/:id/cancel`)
  - `/api/expenses` (`/`, `/summary`, `/export` CSV)
  - `/api/uploads/photos`, `/api/uploads/menu` — multer disk storage
  - `/api/ai-search`, `/api/venue-chat/:id/chat` — GitHub Models GPT-4o
  - `/api/contact` — Resend email forwarding
  - `/uploads/*` — `express.static` for serving uploaded files
- Built with **tsdown** (Rolldown-based, very fast esbuild-style bundler) → `dist/index.mjs`.
- Started in production with plain `node dist/index.mjs`.

#### `apps/web` — React Router v7 SPA
- File-based routing via `@react-router/fs-routes` (`flatRoutes()`), so each `routes/*.tsx` file is a route.
- Routes: `_index` (home), `$category`, `$category_.$venueId`, `cart`, `dashboard`, `login`, `signup`, `onboarding`, `search`.
- SSR is **disabled** (`react-router.config.ts: ssr: false`) — pure SPA. Justification: no SEO requirement on protected dashboards, simpler deployment, no cold-start penalty.
- Build tool: **Vite 7** + Tailwind v4 plugin.
- Auth state: `authClient.useSession()` (Better-Auth React hook) — driven by cookies set by the server.

---

## 3. Technology Stack — What and Why

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| **Language** | TypeScript everywhere | End-to-end type safety: Prisma → server → React. Refactors are safe across the stack. |
| **Frontend framework** | React 19 + React Router v7 | RR v7 is the merged Remix + RR — gives file-based routing, loaders/actions, and an SPA mode. Lighter than full Next.js when SSR isn't needed. |
| **Styling** | Tailwind v4 + shadcn/ui | Tailwind = utility-first, no CSS-in-JS runtime. shadcn isn't a library — it copies primitive components into the repo, so we own them and can theme freely. |
| **Backend framework** | Express 5 | Stable, well-known, huge middleware ecosystem (cors, multer). Express 5 brings async error handling natively. We don't need Fastify-level performance. |
| **Auth** | Better-Auth 1.5 | Self-hosted, framework-agnostic, built-in Prisma adapter, supports email+password out of the box. Avoids paid SaaS (Clerk, Auth0) for a thesis project. |
| **ORM** | Prisma 7 + `@prisma/adapter-pg` | Fully typed queries, painless migrations, Prisma Studio for inspection. The `pg` adapter avoids the legacy Rust query engine. |
| **Database** | PostgreSQL 16 | Strong consistency, transactions, `Decimal(10,2)` for money, JSON columns for menus, native arrays for `tags/photos`. Free, well-supported by Railway. |
| **File uploads** | Multer (disk storage) | Simplest possible — files land in `apps/server/uploads/`, served by `express.static`. Production caveat documented below. |
| **AI** | GitHub Models (gpt-4o) | Free for prototypes, OpenAI-compatible API, no separate billing. Two endpoints: vibe-search and per-venue Q&A chat. |
| **Notifications** | Telegram Bot API | Most providers in the target market use Telegram daily. HTML-formatted messages, no SDK — direct `fetch` to `api.telegram.org`. |
| **Email** | Resend | Single REST call (`resend.emails.send`), generous free tier. Used only for the Contact form today. |
| **Build orchestration** | Turborepo 2 | Caches workspace tasks; only rebuilds what changed. `turbo dev` runs web + server in parallel. |
| **Server bundler** | tsdown | Rolldown-based. Bundles ESM TS into one fast `dist/index.mjs`. |
| **Validators** | Zod 4 | Runtime + compile-time schema. Used for env validation; could be extended to request bodies. |
| **Env management** | `@t3-oss/env-core` + Zod | Fails the build if a required env var is missing. Splits server vs. web (so `BETTER_AUTH_SECRET` can never leak into the client bundle). |
| **Hosting** | Railway | Single platform for Postgres + two Node services, automatic public URLs, reads from Git. |
| **Git hooks** | Husky + lint-staged | Enforces formatting on staged files before commit. |

---

## 4. Database Design

### 4.1 Why PostgreSQL (not MongoDB / MySQL / SQLite)
- **Relational integrity is critical here**: a booking *must* belong to a real venue + real manager + real company. Foreign keys + transactions guarantee that.
- **Money:** PostgreSQL has true `DECIMAL(10,2)` — we use it for `Booking.cost`, `Venue.pricePerHour`, `Expense.amount`. MongoDB would force us to store cents as `Int` and reinvent precision.
- **Native arrays + JSON:** `tags`, `photos`, `amenities` are `String[]`; `menus` is `Json?`. Avoids a junction table for simple lists while keeping queryability.
- **Aggregations:** the dashboard's "expenses by category" uses Prisma's `groupBy` → translates to a native `GROUP BY` (fast, indexed).
- **Local dev parity:** `docker-compose up` gives an identical Postgres locally and in production.

### 4.2 Schema (entity by entity)

#### `Company`
Top-level tenant. Every user, booking, and expense belongs to a company.
- `id`, `name`, `createdAt`, `updatedAt`.
- 1-to-many: `users`, `bookings`, `expenses`.
- **Why a separate Company entity?** A single account can have multiple managers from the same firm — they all see the same expense aggregation. This is the multi-tenant boundary.

#### `User` (in `auth.prisma` — Better-Auth-managed)
- Better-Auth-required: `id`, `name`, `email`, `emailVerified`, `image`, `sessions[]`, `accounts[]`.
- Business-added (via `additionalFields` in auth config): `role` (Role enum), `companyId`, `phone`, `telegramChatId`, `telegramUsername`.
- **Constraint:** `@@unique([email])` — one account per email.

#### `Venue`
The bookable item. One provider owns many venues.
- Pricing: `pricePerHour Decimal(10,2)` + optional `averageCheck String` (free-text like `"200,000 UZS"` parsed at runtime).
- Capacity: `capacity`, `minGuests`, `maxGuests`.
- Media: `photos String[]` (URL list), `menuUrl String?` (PDF), `menus Json?` (structured menu future-use).
- Discovery: `tags String[]`, `amenities String[]`, `category` (enum), `rating Float?`.
- Moderation: `isActive Boolean @default(true)` — admin can soft-disable.

#### `Booking`
The transactional core.
- Time window: `startTime`, `endTime`.
- `cost Decimal(10,2)` — calculated once at create time and stored, so historical cost survives venue price changes.
- `status BookingStatus` (`PENDING | CONFIRMED | CANCELLED`).
- Foreign keys: `managerId`, `companyId`, `venueId`.
- 1-to-many: `expenses` (typically one, but the schema allows multiple if a booking is split).

#### `Expense`
Auto-created when a booking is confirmed.
- Mirrors booking `amount` + `category` + `companyId`.
- Optional `bookingId` — `null` means a manually entered expense (future feature, schema-ready).
- **Why duplicate the data instead of always joining `Booking`?** Reports must keep working even if the booking is later cancelled or modified — expenses are an immutable audit log.

#### Better-Auth tables (`Session`, `Account`, `Verification`)
- `Session`: opaque token + IP + UA, FK to user with `onDelete: Cascade` (delete user → delete sessions).
- `Account`: per-provider credentials (currently only `emailAndPassword` → password is bcrypt-hashed inside).
- `Verification`: email-verification tokens.

### 4.3 Migrations
- All schema changes go through `prisma migrate dev` → file in `packages/db/prisma/migrations/<timestamp>_<name>/migration.sql`.
- Production deploy runs `prisma migrate deploy` (in the Railway build command).
- 4 migrations exist today: initial schema, venue fields, guest count, missing columns backfill.

### 4.4 Cascade & integrity
- `Session.userId` → `User.id` `onDelete: Cascade`.
- `Account.userId` → `User.id` `onDelete: Cascade`.
- Booking ↔ Venue ↔ User: no cascade (explicit deletion would leave orphans; instead use `isActive` toggling).

---

## 5. Authentication & Security

### 5.1 Authentication: Better-Auth
- **Strategy:** email + password only (`emailAndPassword: { enabled: true }`).
- Passwords are stored as bcrypt hashes inside `Account.password` — Better-Auth handles hashing & verification.
- **Sessions:** server-side. A token is stored in the `Session` table; the client only ever holds an opaque cookie. No JWTs in localStorage → immune to XSS token theft.
- **Cookie settings** (`packages/auth/src/index.ts`):
  ```ts
  defaultCookieAttributes: { sameSite: "none", secure: true, httpOnly: true }
  ```
  - `httpOnly: true` → JS can't read the cookie (mitigates XSS).
  - `secure: true` → HTTPS-only (mitigates network sniffing).
  - `sameSite: "none"` → required because frontend and backend live on different Railway subdomains. Combined with CORS `credentials: true` and an explicit `trustedOrigins`, this is safe.
- **Secret:** `BETTER_AUTH_SECRET` enforced ≥32 chars by Zod (`packages/env/src/server.ts`). Used to sign session tokens.

### 5.2 Authorisation: route-level middleware
Two composable middlewares:
- `requireAuth` (`apps/server/src/middleware/auth.middleware.ts`) — calls `auth.api.getSession({ headers })`, attaches `req.user`, returns 401 if no session.
- `requireRole(...roles)` — runs after `requireAuth`, returns 403 unless `req.user.role` is in the allowed list.

Used like:
```ts
router.post("/", requireAuth, requireRole(Role.PROVIDER, Role.ADMIN), handler);
```
Service-layer checks add a second line of defence — e.g., `updateVenue` re-verifies the caller owns the venue (`existing.providerId !== providerId` → throw "Forbidden") even if the route middleware passed.

### 5.3 Defence-in-depth checklist

| Threat | Mitigation |
|---|---|
| **SQL injection** | Prisma is parameterised — no string concatenation reaches Postgres. We never write raw SQL. |
| **XSS** | React escapes by default. We do not use `dangerouslySetInnerHTML` anywhere in user-facing surfaces. The Resend email template HTML is built from validated form fields server-side (an improvement: HTML-encode them defensively). |
| **CSRF** | Cookies are `sameSite: "none"` + `credentials: "include"`, but origin is restricted via `cors({ origin: [env.CORS_ORIGIN], credentials: true })` plus Better-Auth's `trustedOrigins`. Cross-site POSTs from a malicious page would be blocked at CORS preflight. |
| **Mass-assignment** | Update endpoints (e.g., `PATCH /api/me`, venue update) build a *sparse* `update` object and only copy whitelisted fields. Sending `role: "ADMIN"` in the PATCH body is silently ignored. |
| **Privilege escalation via onboarding** | `/api/onboarding` accepts `role` from the body, but a user can only run it once — subsequent role changes have no exposed endpoint. (Hardening note: this is currently the weakest spot — an attacker could re-call onboarding with `role: "ADMIN"`. Mitigation idea: refuse if `companyId` already set.) |
| **Brute-force login** | Better-Auth ships rate-limiting primitives; not yet enabled in this build — documented future work. |
| **File-upload abuse** | Multer enforces MIME whitelist (`image/jpeg`, `image/png` for photos; `application/pdf` for menus), size limits (5 MB photos, 10 MB menus), max 10 photos per request, random UUID filenames (so users can't overwrite each other's files or guess paths). Only `PROVIDER` can upload. |
| **Path traversal in uploads** | Filename is `crypto.randomUUID() + ext` — original name is discarded. `path.resolve("uploads/photos")` ensures destination is anchored to CWD. |
| **PII exposure** | `/api/venues/my` and `/api/bookings/provider` `select` only `{ id, name, email }` of the joined user. The full user record never leaks via venue lookups. |
| **Secrets in git** | `.gitignore` excludes `.env`. Env loaded via `dotenv/config` + validated by Zod — missing vars *fail the build*, leaking vars never reach the bundle (T3 env enforces server-only naming). |
| **HTTPS** | Enforced by Railway's edge. `secure: true` on cookies makes downgrade attacks fail closed. |
| **Open redirects / SSRF** | Outbound `fetch` only hits two hard-coded hosts (`api.telegram.org`, `models.github.ai`). No URLs from user input are fetched. |
| **AI prompt injection** | The AI search and venue-chat send venue data + the user query inside JSON. The system prompt says "match user's language" / "return only JSON array" — output is parsed with `JSON.parse` in a try/catch and **filtered against `venueMap`** so only real venue IDs are returned. A poisoned LLM response can't inject fake venues. |

### 5.4 Validation strategy
- **Server (authoritative):** every PATCH/POST validates inline (length, regex for phone `^\+?\d{7,15}$`, regex for Telegram `^@?[A-Za-z0-9_]{3,32}$`, numeric ranges for guests). Returns 400 with a human-readable message.
- **Client (UX only):** mirrors the same rules in `validateProfile` and friends for instant feedback. Never trusted on its own.

---

## 6. AI Integration

### 6.1 Vibe search (`POST /api/ai-search`)
- Accepts free text (1–500 chars).
- Loads all active venues with a slim `select` (≈12 fields).
- Sends them as JSON to GPT-4o via GitHub Models with a strict system prompt: *"Return ONLY a JSON array of `{ id, score, reason }`."*
- `temperature: 0` → deterministic ranking.
- Output is parsed; ranked IDs are intersected with the local venue map → only real venues survive.
- Returns enriched results (name, category, price, etc.) for the home page "Find by vibe" section.

### 6.2 Per-venue chat (`POST /api/venue-chat/:id/chat`)
- Loads one venue, sends its data + the user's question to GPT-4o.
- System prompt: *"Reply in the same language as the question."* — multilingual (RU/EN/UZ) without translation tables.
- `temperature: 0.7`, `max_tokens: 256` — short conversational answers (2–3 sentences).
- Returns `{ answer }`.

### 6.3 Why GitHub Models (not direct OpenAI)?
- Free quota for prototypes, no separate billing setup.
- OpenAI-compatible endpoint → swapping to OpenAI / Azure later is a one-line change.
- Token managed via `GITHUB_MODELS_TOKEN` (optional in env schema — features degrade to `503 "AI is not configured"` if absent).

---

## 7. Notifications

### 7.1 Telegram (`apps/server/src/lib/telegram.ts`)
- `sendTelegramMessage(chatId, html)` — direct `POST` to `https://api.telegram.org/bot<TOKEN>/sendMessage` with `parse_mode: "HTML"`.
- `notifyProvider(chatId, username, message)` — primary path uses `chatId` (the only thing the Bot API actually accepts). If only `username` is on file, it logs a hint instructing the provider to `/start` the bot first (Telegram doesn't expose username→chatId resolution).
- Triggered inside `confirmBooking`'s `prisma.$transaction` — if the DB commit fails, no notification is sent.
- TODO in code: email fallback when Telegram fails.

### 7.2 Email (Resend, contact form only)
- `POST /api/contact` validates `name/email/message`, then Resend `emails.send`.
- `from: onboarding@resend.dev` (Resend sandbox sender — for production, verify a custom domain).
- `to:` hard-coded to the project owner's WIUT email.
- If `RESEND_API_KEY` is missing, the submission is logged and returned `{ ok: true }` — degraded but non-blocking.

---

## 8. Frontend Details

### 8.1 Routing model
- React Router v7 in **SPA mode** (`react-router.config.ts: ssr: false`).
- File-based: each `apps/web/src/routes/*.tsx` is a route. Examples:
  - `_index.tsx` → `/`
  - `$category.tsx` → `/:category`
  - `$category_.$venueId.tsx` → `/:category/:venueId` (nested)
  - `dashboard.tsx`, `cart.tsx`, `login.tsx`, `signup.tsx`, `onboarding.tsx`, `search.tsx`

### 8.2 Auth state on the client
- `authClient = createAuthClient({ baseURL: VITE_SERVER_URL })`.
- `authClient.useSession()` → reactive React hook. Updates when cookies change.
- Login/signup call `authClient.signIn.email(...)` / `authClient.signUp.email(...)`. Server cookie is set; no client token storage.

### 8.3 Data fetching
- Plain `fetch(apiUrl(path), { credentials: "include" })` — no React Query / SWR. Justification: small app, mostly imperative on-mount fetches; adding a cache library would be overkill.
- `apiUrl()` (`apps/web/src/lib/api.ts`) prefixes the configured `VITE_SERVER_URL` and normalises slashes.

### 8.4 UI system
- `packages/ui` exports shadcn primitives (`Button`, `Sonner` toaster, etc.) consumed as `@bisp-final-flow/ui/components/<name>`.
- Tailwind v4 with the new Vite plugin (`@tailwindcss/vite`) — JIT, no separate config file in most cases.
- Theming: `next-themes` provider, default `light`, persisted under `vite-ui-theme`.
- Fonts: Inter via Google Fonts preconnect + variable font.
- Toasts: `sonner`.

### 8.5 Components of note
- `BookingModal.tsx` — date/time/guests + contact info, posts to `/api/bookings`.
- `VenueForm.tsx` — provider venue create/edit; uploads photos & menu PDF first, then submits the venue with the returned URLs.
- `SearchBox.tsx` — global typeahead hitting `/api/search?q=...` (slim payload, 20 results, case-insensitive).
- `header.tsx`, `theme-provider.tsx`, `loader.tsx` — shared chrome.

---

## 9. Build, Dev, and Deployment

### 9.1 Local development
```bash
npm install
npm run db:start          # docker-compose up -d (Postgres on :5432)
npm run db:push           # apply schema
npm run db:seed           # optional: create system provider + promote admin
npm run dev               # turbo runs web (vite :5173) + server (tsx watch :3000) in parallel
```

### 9.2 Production (Railway, per `DEPLOYMENT.md`)
Three services in one Railway project:

1. **PostgreSQL** — Railway plugin → exposes `${{Postgres.DATABASE_URL}}`.
2. **Server**:
   - Build: `npm install && npm run db:generate && npm run db:deploy && npm run db:seed && npm run build`
   - Start: `npm run start:server` → `node dist/index.mjs`
   - Env: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 chars, `openssl rand -base64 32`), `BETTER_AUTH_URL`, `CORS_ORIGIN`, optional `CORS_ORIGIN_BUILD`, `TELEGRAM_BOT_TOKEN`, `NODE_ENV=production`, optional `GITHUB_MODELS_TOKEN`, optional `RESEND_API_KEY`.
   - Listens on `process.env.PORT` (Railway-injected).
3. **Web**:
   - Build: `npm install && npm run db:generate && npm run build` (Prisma generate is needed because the web app pulls types via `@bisp-final-flow/auth` → `@bisp-final-flow/db`).
   - Start: `npm run start:web` → `vite preview --host` (serves the built static SPA).
   - Env: `VITE_SERVER_URL` — baked in at **build time**, so changes require redeploy.

### 9.3 Known prod considerations
- **Filesystem is ephemeral on Railway** → uploaded files in `apps/server/uploads/` are wiped on redeploy. Mitigation options documented: Railway Volume mounted at `/app/uploads`, or move to S3/R2.
- **CORS:** server reads single `CORS_ORIGIN`; if you need multiple, extend the `cors({ origin: [...] })` array (commented in `DEPLOYMENT.md`).
- **Cookies cross-origin:** already configured (`sameSite: "none"`, `secure: true`). If you put both services on the same root domain you can switch to `sameSite: "lax"`.
- **Deploy order (first time only):** Postgres → Server (so migrations run) → Web.

### 9.4 Performance & caching
- Turborepo caches `build` / `check-types` / `lint` outputs locally and (if configured) remotely.
- Vite produces hashed assets; Railway serves them via `vite preview`. For real production traffic you'd put them behind a CDN.
- Express `static` for uploads — no CDN today. Acceptable for a thesis demo.

### 9.5 Code quality
- TypeScript strict across all packages.
- ESLint 10 (root config in `packages/config`).
- Husky + lint-staged → on commit, runs lint-staged hooks against staged files.
- Per-app `check-types` script (`tsc -b` / `react-router typegen && tsc`).

---

## 10. Likely Defence Questions & Short Answers

> **Why a monorepo instead of two repos?**
> Atomic schema changes. The web app imports types directly from `@bisp-final-flow/db`; if the backend renames a column, the frontend fails to type-check in the *same PR*. With two repos that drift would leak to production.

> **Why React Router v7 and not Next.js?**
> The dashboards are auth-walled and don't need SEO/SSR. A pure SPA simplifies hosting (any static host works), avoids RSC complexity, and `react-router build` produces a tiny client bundle.

> **Why Better-Auth instead of Auth0/Clerk/NextAuth?**
> Self-hosted (no per-MAU billing), Prisma-native, framework-agnostic (works with Express *and* React Router with the same package), and cookie-based sessions are safer than JWTs in localStorage for a browser SPA.

> **Why store `cost` on `Booking` instead of computing it on read?**
> Historical correctness. Prices change; reports must reflect what the customer was actually charged at the time.

> **Why a dual pricing model (`pricePerHour` + `averageCheck`)?**
> Restaurants charge per head; activity halls charge per hour. Forcing one model would break either UX. The booking service picks automatically.

> **Why is the AI optional?**
> It's a value-add, not a critical path. The endpoints return `503` cleanly if the token is missing, and the rest of the app keeps working. This also keeps prototype costs at zero.

> **What happens if Telegram is down when a booking is confirmed?**
> The DB transaction still commits (the notification call is awaited but its failure is logged, not thrown). The booking is confirmed regardless. Email fallback is the documented next step.

> **How do you prevent a manager from confirming someone else's booking?**
> `requireRole(PROVIDER, ADMIN)` blocks managers at the route. Service-layer `confirmBooking` *also* re-checks `existing.venue.providerId === userId` (unless admin) — defence in depth.

> **How do you handle money precision?**
> All money fields use Postgres `Decimal(10,2)`. Prisma exposes them as `Decimal` (the `Prisma.Decimal` type from `decimal.js`), avoiding JS float errors.

> **What is the multi-tenant boundary?**
> `Company.id`. Every query that returns expenses or bookings is scoped by `req.user.companyId` from the session. Cross-tenant reads are not possible through any current endpoint.

> **Why no automated tests?**
> Honest answer: thesis-scope project, manual QA only. Strategy if extended: Vitest for service-layer pure functions (e.g. `calculateCost`, `parseAverageCheck`), Playwright for the booking happy-path, integration tests against a throwaway Postgres in CI.

> **What would you change for v2?**
> (1) Move uploads to S3/R2. (2) Enable Better-Auth rate-limiting + email verification. (3) Harden `/api/onboarding` against role re-assignment. (4) Add server-side Zod schemas for every body (replace inline `if`s). (5) Email fallback for Telegram. (6) Replace `fetch` on the client with React Query for caching/retries. (7) Pagination on `/api/venues`. (8) Soft-delete instead of hard delete anywhere user-facing.

---

## 11. File-Path Cheatsheet (so you can answer "where is X?")

| Concern | Path |
|---|---|
| Server entry / route mounts | `apps/server/src/index.ts` |
| Auth middleware | `apps/server/src/middleware/auth.middleware.ts` |
| Role middleware | `apps/server/src/middleware/role.middleware.ts` |
| Bookings logic | `apps/server/src/modules/bookings/bookings.service.ts` |
| Venue CRUD | `apps/server/src/modules/venues/venues.{routes,service}.ts` |
| AI search | `apps/server/src/modules/venues/ai-search.ts` |
| Venue Q&A chat | `apps/server/src/modules/venues/venue-chat.ts` |
| Expenses + CSV export | `apps/server/src/modules/expenses/expenses.service.ts` |
| File uploads | `apps/server/src/modules/uploads/uploads.routes.ts` |
| Telegram client | `apps/server/src/lib/telegram.ts` |
| Better-Auth config | `packages/auth/src/index.ts` |
| Prisma schema (business) | `packages/db/prisma/schema/schema.prisma` |
| Prisma schema (auth tables) | `packages/db/prisma/schema/auth.prisma` |
| Prisma client singleton | `packages/db/src/index.ts` |
| Local Postgres compose | `packages/db/docker-compose.yml` |
| Server env schema | `packages/env/src/server.ts` |
| Web env schema | `packages/env/src/web.ts` |
| React routes | `apps/web/src/routes/*.tsx` |
| API helper | `apps/web/src/lib/api.ts` |
| Auth client | `apps/web/src/lib/auth-client.ts` |
| Deployment guide | `DEPLOYMENT.md` |
