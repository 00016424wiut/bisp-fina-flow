Here's how to deploy your monorepo to Railway:

## Railway Setup: 3 Services

Create a **single Railway project** with three services:

1. **PostgreSQL** — use Railway's built-in Postgres plugin (no need for your docker-compose)
2. **Server** (Hono/Bun backend)
3. **Web** (Next.js frontend)

---

## 1. PostgreSQL

Add a Postgres service from Railway's "New Service → Database → PostgreSQL." Railway gives you a `DATABASE_URL` variable automatically. Reference it in your other services using `${{Postgres.DATABASE_URL}}`.

---

## 2. Server Service

**Settings:**
- Root directory: `/` (monorepo root — needed so Railway sees all workspaces)
- Build command: `bun install && bun run db:generate && bun run db:deploy && bun run build`
- Start command: `bun run start:server`
- Watch paths: `packages/api/**`, `packages/db/**`, `packages/auth/**`, `packages/env/**`, `apps/server/**`

**Environment variables:**
- `DATABASE_URL` → `${{Postgres.DATABASE_URL}}` (Railway variable reference)
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (set to the server's Railway-generated URL, e.g. `https://server-production-xxxx.up.railway.app`)
- `DEEPGRAM_API_KEY`
- `GEMINI_API_KEY` (or whatever env your OpenAI SDK uses for the Gemini endpoint)
- `DO_SPACES_BUCKET`, `DO_SPACES_ENDPOINT`, `DO_SPACES_KEY`, `DO_SPACES_SECRET`
- `MAILTRAP_TOKEN`
- Any other vars your `@bisp-final-project/env/server` schema requires — check that file, Railway will fail at build if any are missing

---

## 3. Web Service

**Settings:**
- Root directory: `/`
- Build command: `bun install && bun run db:generate && bun run build`
- Start command: `bun run start:web`
- Watch paths: `apps/web/**`, `packages/ui/**`, `packages/auth/**`, `packages/env/**`, `packages/api/**`

Why `db:generate` here too? Your frontend imports oRPC types that chain through `packages/api`, which imports Prisma types from `packages/db`. Without the generated Prisma client, the build fails.

**Environment variables:**
- `NEXT_PUBLIC_SERVER_URL` → your server service's URL (e.g. `https://server-production-xxxx.up.railway.app`)
- `NEXT_PUBLIC_APP_URL` → the web service's own URL
- Any other vars your `@bisp-final-project/env/web` schema requires

---

## Key Gotchas

**CORS:** Update your Hono CORS config to allow the web service's Railway URL as an origin. If you use `BETTER_AUTH_URL` or similar for cookie domains, make sure it matches.

**Private networking:** Railway services within the same project can talk to each other over private network (`server.railway.internal:PORT`). You can use this for server-to-server calls, but the browser still needs the public URL, so `NEXT_PUBLIC_SERVER_URL` must be the public one.

**Port:** Railway sets a `PORT` env var. Make sure your Hono server listens on `process.env.PORT` (not a hardcoded port). Next.js handles this automatically with `next start`.

**Deploy order:** Deploy Postgres first, then server (so migrations run), then web. After the first deploy, order doesn't matter since Railway rebuilds independently.

**Cookies/auth:** Since your frontend and backend are on different subdomains, make sure `better-auth` is configured with `sameSite: "none"` and `secure: true` for cookies, or use a custom domain so both sit under the same root domain (preferred).
