# Deploying to Railway

## Railway Setup: 3 Services

Create a **single Railway project** with three services:

1. **PostgreSQL** — Railway's built-in Postgres plugin
2. **Server** (Express/Node backend)
3. **Web** (React Router v7 SPA via Vite)

---

## 1. PostgreSQL

Add a Postgres service: **New Service → Database → PostgreSQL**.

Railway creates a `DATABASE_URL` variable automatically. Reference it in your other services using `${{Postgres.DATABASE_URL}}`.

---

## 2. Server Service

**Settings:**
- Root directory: `/` (monorepo root — needed so Railway sees all workspaces)
- Build command:
  ```
  npm install && npm run db:generate && npm run db:deploy && npm run build
  ```
- Start command:
  ```
  npm run start:server
  ```
- Watch paths: `apps/server/**`, `packages/db/**`, `packages/auth/**`, `packages/env/**`

**Environment variables:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BETTER_AUTH_SECRET` | A random string, **at least 32 characters**. Generate one with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | The server's Railway public URL, e.g. `https://server-production-xxxx.up.railway.app` |
| `CORS_ORIGIN` | The web service's Railway public URL, e.g. `https://web-production-xxxx.up.railway.app` |
| `CORS_ORIGIN_BUILD` | *(optional)* A second allowed origin if needed |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token from @BotFather |
| `NODE_ENV` | `production` |

> These are **all** the variables required by `packages/env/src/server.ts`. If you add new env vars to that schema later, add them here too or the build will fail.

---

## 3. Web Service

**Settings:**
- Root directory: `/`
- Build command:
  ```
  npm install && npm run db:generate && npm run build
  ```
- Start command:
  ```
  npm run start:web
  ```
- Watch paths: `apps/web/**`, `packages/ui/**`, `packages/auth/**`, `packages/env/**`

Why `db:generate` here too? The web app imports from `@bisp-final-flow/auth`, which imports Prisma types from `@bisp-final-flow/db`. Without the generated Prisma client, the build fails.

> **Note:** The web app is an SPA (`ssr: false`). The `start:web` script runs `vite preview`, which serves the built static files. This works on Railway, but you could also serve the `apps/web/build/client` folder from a CDN/static host for better performance.

**Environment variables:**

| Variable | Value |
|---|---|
| `VITE_SERVER_URL` | The server service's public URL, e.g. `https://server-production-xxxx.up.railway.app` |

> `VITE_` variables are baked in at **build time**, not runtime. If you change `VITE_SERVER_URL`, you must **redeploy** the web service (Railway does this automatically when you update the variable).

---

## Required Code Change: Dynamic Port

**Your server currently hardcodes port 3000.** Railway assigns a dynamic port via the `PORT` env var. You must update `apps/server/src/index.ts`:

```ts
// Before
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

// After
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

Without this change, the server will fail health checks on Railway.

---

## Key Gotchas

### CORS
Your server reads `CORS_ORIGIN` for the allowed origin. Set it to the web service's Railway URL. If you also set `CORS_ORIGIN_BUILD`, update the CORS middleware in `apps/server/src/index.ts` to allow both origins:

```ts
app.use(
  cors({
    origin: [env.CORS_ORIGIN, env.CORS_ORIGIN_BUILD].filter(Boolean),
    // ...
  }),
);
```

### File Uploads
Your server serves uploaded files from a local `uploads/` directory. **Railway's filesystem is ephemeral** — files are lost on every redeploy. For production, move uploads to an external storage service (e.g. AWS S3, Cloudflare R2, DigitalOcean Spaces) or use a Railway Volume.

To add a Railway Volume:
1. Click the server service → **Settings → Volumes**
2. Mount path: `/app/uploads` (or wherever your app writes to)
3. This persists files across deploys

### Cookies / Auth
Your `better-auth` config already sets `sameSite: "none"` and `secure: true`, which is correct for cross-origin cookies (frontend and backend on different subdomains). If you use a custom domain and put both services under the same root domain, you can switch to `sameSite: "lax"` for better security.

### Private Networking
Railway services in the same project can talk over the private network (`server.railway.internal:PORT`), but the browser needs the public URL. So `VITE_SERVER_URL` must always be the public URL.

### Deploy Order
First deploy: Postgres first, then server (so migrations run via `db:deploy`), then web. After the first deploy, Railway rebuilds services independently and order doesn't matter.

### Vite Preview Port
`vite preview` defaults to port 4173. Railway sets a `PORT` env var. Vite preview respects `--port`, so if Railway doesn't auto-detect, update the `start` script in `apps/web/package.json`:

```json
"start": "vite preview --port ${PORT:-4173}"
```

Or set `PORT=4173` in Railway for the web service if it doesn't start correctly.

---

## Checklist

- [ ] Create Railway project with Postgres, Server, and Web services
- [ ] Set all environment variables listed above for each service
- [ ] Update server to use dynamic `PORT` (see code change above)
- [ ] Ensure CORS allows the web service's Railway URL
- [ ] Decide on file upload strategy (Railway Volume or external storage)
- [ ] Deploy Postgres → Server → Web (first time only)
- [ ] Verify auth cookies work cross-origin
- [ ] (Optional) Add custom domains
