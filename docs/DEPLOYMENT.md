# AquaX deployment guide (Vercel + Render + Neon)

This is a deployment template. Add secrets in the hosting provider dashboards; never commit a real `.env` file.

## 1. Neon PostgreSQL

1. Create a PostgreSQL database in Neon.
2. Copy the pooled connection URL for runtime queries (`DATABASE_URL`).
3. Copy the direct, non-pooled connection URL for Prisma migrations (`DIRECT_URL`).
4. Keep both URLs private.

## 2. Deploy the API to Render

Create a Web Service from the repository with:

- Root directory: `server`
- Runtime: Node
- Build command: `npm ci && npm run db:validate && npm run db:deploy && npm run db:generate`
- Start command: `npm start`
- Health check path: `/api/health`

Set these environment variables in Render:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Supplied by Render; the server also defaults to 5000 locally |
| `DATABASE_URL` | Neon pooled connection URL |
| `DIRECT_URL` | Neon direct connection URL |
| `JWT_SECRET` | A randomly generated secret with at least 32 random bytes |
| `CLIENT_URL` | Exact deployed Vercel origin, e.g. `https://your-app.vercel.app` |
| `ALLOW_PUBLIC_REGISTRATION` | `false` for production |
| `COOKIE_SAME_SITE` | `none` when Vercel and Render use different registrable domains |
| `COOKIE_SECURE` | `true` when `COOKIE_SAME_SITE=none` |

`SameSite=None` requires HTTPS and Secure cookies. Render supplies HTTPS for the public service URL. If you serve the frontend and API from the same site, `lax` may be suitable instead. Keep `CLIENT_URL` exact and do not use a wildcard origin.

## 3. Deploy the frontend to Vercel

Create a Vercel project from the same repository with:

- Root directory: `client`
- Framework preset: Vite
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`

Set this environment variable in Vercel:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR-RENDER-SERVICE.onrender.com/api` |

The included `client/vercel.json` rewrites client-side routes to `index.html`, so direct visits to pages such as `/dashboard` or `/billing` work after deployment.

## 4. First production launch

1. Deploy the API with public registration disabled.
2. Deploy the frontend and verify that `CLIENT_URL` exactly matches its production origin.
3. Check `GET /api/health` and `GET /api/health/db`.
4. Onboard the first Panchayat administrator through an approved process. For an initial college demo only, you may temporarily enable registration, register the Panchayat, and then disable it again.
5. Verify login, logout, session restore, file exports, map tiles and all API modules with production test records.

## 5. Important boundaries

- The deployment template does not create Neon, Render or Vercel accounts and does not provision secrets.
- Payment methods are recorded manually; there is no payment gateway integration.
- The map displays coordinate markers and OpenStreetMap tiles; it is not a pipeline hydraulics or routing system.
- Take database backups and complete a security review before using real public-service records.
