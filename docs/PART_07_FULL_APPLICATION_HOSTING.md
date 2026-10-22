# ParkEazy Full-Application Hosting (VoiceCloud Reference Architecture)

ParkEazy now supports the VoiceCloud-style full-application model: build the customer, host, and admin frontends into `dist/{website,host,admin}`, then serve all three from the same NestJS/Express application that owns `/api/v1/` and `/health`.

## One-process local application

```powershell
npm run dev:same-origin
```

This command builds all three portals and the API, then starts one NestJS application on `http://localhost:3001` by default. All portal and API paths use that same origin:

- Customer: `/`
- Host: `/host/`
- Admin: `/admin/`
- API: `/api/v1/`
- Health: `/health`

Set `PARKEAZY_LOCAL_PORT=3000` before running the command to choose another local port. The full-app launcher defaults to the local memory/degraded infrastructure mode unless an explicit `INFRASTRUCTURE_MODE` is supplied. Database-backed functionality still requires the configured PostgreSQL instance and migrations.

## Frontend hot-reload development

For isolated Vite HMR sessions, use `npm run dev:same-origin:hmr` and start the API separately with `npm run dev:api`. This optional workflow starts customer, host, and admin Vite servers behind a root same-origin proxy; it is intentionally distinct from the full-app single-process command.

## Hosting behavior

- Vite production bundles are emitted into `dist/website`, `dist/host`, and `dist/admin`.
- The NestJS Express instance serves each bundle under its correct public path.
- `/api`, `/health`, `/docs`, `/uploads`, and `/metrics` are excluded from SPA fallback handling.
- Missing frontend routes use the appropriate portal's `index.html`; missing static assets are not replaced with HTML.
- `scripts/production-gateway.mjs` remains available as an optional separate reverse-proxy topology for deployments that intentionally use a gateway process.
