# ParkEazy — Part 02: Same-Origin Routing & Developer Tooling Specification

> **Status**: COMPLETED SPECIFICATION (Part 02)  
> **Mandatory Architecture Rule**: All three frontend portals (Customer Website, Host Operations Portal, Platform Admin Panel) are accessible under a single shared origin and port, while preserving independent package organization and isolated build pipelines.

---

## 1. URL Architecture Mapping

### 1.1 Local Development Environment

| Target Application | Primary Local URL | Internal Package Path | Vite Base Path |
| :--- | :--- | :--- | :--- |
| **Customer Website** | `http://localhost:3001/` | `apps/website/` | `/` |
| **Host Operations Portal** | `http://localhost:3001/host/` | `apps/host/` | `/host/` |
| **Platform Admin Panel** | `http://localhost:3001/admin/` | `apps/admin/` | `/admin/` |
| **Monorepo Developer Hub** | `http://localhost:3001/overview` | `src/App.tsx` | `/` |
| **Backend REST API** | `http://localhost:3001/api/v1/` | `services/api/` (proxied to `:4000`) | N/A |
| **Health Check Endpoint** | `http://localhost:3001/health` | `services/api/` (proxied to `:4000`) | N/A |

> **Note on AI Studio Preview Environment**: In the AI Studio container, the development server is bound to port `3000` (`http://localhost:3000/`, `/host/`, `/admin/`, `/overview`), running the identical same-origin routing engine.

### 1.2 Production Environment (Provider-Neutral)

| Target Application | Production URL | Routing Layer Target | Fallback Policy |
| :--- | :--- | :--- | :--- |
| **Customer Website** | `https://domainname.com/` | `apps/website/dist` | SPA: `$uri $uri/ /index.html` |
| **Host Operations Portal** | `https://domainname.com/host/` | `apps/host/dist` | SPA: `$uri $uri/ /host/index.html` |
| **Platform Admin Panel** | `https://domainname.com/admin/` | `apps/admin/dist` | SPA: `$uri $uri/ /admin/index.html` |
| **Backend REST API** | `https://domainname.com/api/v1/` | NestJS upstream `:4000/api/v1/` | Strict HTTP 4xx/5xx (NEVER HTML) |
| **Health Check Endpoint** | `https://domainname.com/health` | NestJS upstream `:4000/health` | Strict HTTP 200/503 (NEVER HTML) |

---

## 2. Core Architectural Mechanisms

### 2.1 Independent Frontend Organization with Shared Origin
- Each portal remains an independent workspace package with its own `package.json`, `tsconfig.json`, `vite.config.ts`, and `dist/` production output.
- In development, the root Vite server mounts the portals via dynamic path detection and client-side history API routing (`popstate` + `pushState`).
- Trailing slashes are automatically normalized: accessing `/host` or `/admin` cleanly resolves to `/host/` and `/admin/` without page refresh or asset resolution failures.
- Direct navigation, bookmarking, and hard browser refreshes (`F5`) on `/host/` or `/admin/` immediately mount the intended portal.

### 2.2 Base Paths & Asset Isolation
- **Customer Website**: `base: '/'` emits assets to `/assets/...`.
- **Host Operations Portal**: `base: '/host/'` emits assets to `/host/assets/...`.
- **Platform Admin Panel**: `base: '/admin/'` emits assets to `/admin/assets/...`.
- This ensures assets across the three portals never collide or overwrite each other in production reverse proxies.

### 2.3 Strict API Route Separation
- Vite dev server (`vite.config.ts`), the production Nginx config (`infrastructure/nginx/nginx.conf`), and the Node.js production gateway (`scripts/production-gateway.mjs`) explicitly intercept `/api/v1/` and `/health`.
- If the NestJS API is offline, the routing layer returns `HTTP 503 Service Unavailable` with a structured JSON payload:
  ```json
  {
    "statusCode": 503,
    "status": "unavailable",
    "service": "parkeazy-backend-api",
    "message": "NestJS backend API on port 4000 is not running. Launch it with: npm run dev:api"
  }
  ```
- **Rule Enforced**: Under no circumstances will a missing or failed API route return an HTML fallback document (`index.html`).

---

## 3. Developer Tooling Reference

### 3.1 Consolidated Verification Script
Run the automated 12-point health and architecture audit:
```powershell
node scripts/verify-local.mjs
# or
npm run verify
```

**Checks Executed**:
1. Root & Workspace Configuration (10 workspaces verified with consistent `0.1.0` manifests).
2. Dependency & Lockfile Consistency (`package-lock.json` v3, 0 phantom stubs).
3. TypeScript Monorepo Typecheck (`tsc --noEmit` clean).
4. Automated Test Suite (16 Vitest unit and routing tests passed).
5. Customer Website Production Build (`apps/website/dist`).
6. Host Operations Portal Production Build (`apps/host/dist`).
7. Platform Admin Panel Production Build (`apps/admin/dist`).
8. NestJS API Production Build (`services/api/dist/main.js`).
9. Same-Origin Route Selection (12 test routes verified without collisions).
10. Frontend Base-Path Configuration (`base: '/'`, `base: '/host/'`, `base: '/admin/'`).
11. API Route Separation (503 JSON fallback verified; HTML fallback prevented).
12. Production-Routing Configuration (Nginx & Node.js gateway configurations verified).

### 3.2 Cross-Platform Production Gateway
Test exact production reverse proxy routing locally without Nginx:
```powershell
# 1. Build all applications
npm run build:all

# 2. Launch production gateway
node scripts/production-gateway.mjs --port 3001 --api-port 4000
# or
npm run gateway
```

---

## 4. Local Development Workflow (Windows PowerShell)

```powershell
# Step 1: Install dependencies using npm
npm install

# Step 2: Run consolidated verification
node scripts/verify-local.mjs

# Step 3: Launch Same-Origin Development Server
npm run dev:same-origin
# Server starts at http://localhost:3001/

# Step 4: In a second PowerShell window, launch the NestJS API
npm run dev:api
# API starts at http://localhost:4000/ with live proxy via http://localhost:3001/api/v1/

# Step 5: Access portals
# Website:    http://localhost:3001/
# Host:       http://localhost:3001/host/
# Admin:      http://localhost:3001/admin/
# Overview:   http://localhost:3001/overview
# Health:     http://localhost:3001/health
```
