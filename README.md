# ParkEazy — White-Label Parking Space Marketplace Monorepo

> **Phase**: Part 01 — Authoritative Design Audit, Functional Requirements, Traceability and Implementation Blueprint  
> **Application Repository**: `https://github.com/akc-26/ParkEazy-Backend`  
> **Authoritative Design Repository**: `https://github.com/akc-26/ParkEazy-Web-Design` (Commit: `0881328`)  
> **Continuity Baseline**: Part 00 Foundation (Commit: `3238969` on `feature/part-00-project-foundation`)

---

## 1. Project Purpose

**ParkEazy** is an enterprise-grade, white-label urban parking marketplace platform that connects drivers with guaranteed, secure parking spaces across commercial garages, tech parks, shopping malls, and verified residential facilities.

This repository represents the **Part 01 project baseline**, establishing:
- Standardized npm workspace tooling and TypeScript configuration across 3 portals and NestJS backend
- Three independently runnable web portals: Customer Marketplace Website (`apps/website`), Host Operations Portal (`apps/host`), and Platform Administration Panel (`apps/admin`)
- Shared backend REST API scaffold built with NestJS featuring an active health check endpoint (`services/api`)
- Centralized white-label branding system (`branding/` and `@parkeazy/branding`) consumed across all three portals
- Six shared workspace packages eliminating code duplication
- Complete audit, mapping, and traceability matrix for all **111 exported Stitch design screens**
- Comprehensive architectural blueprints, domain models, API specifications, and decisions register

---

## 2. Core Documentation Index

| Document | Description |
| :--- | :--- |
| [`docs/PART_01_REQUIREMENTS_BLUEPRINT.md`](docs/PART_01_REQUIREMENTS_BLUEPRINT.md) | Verified and proposed requirements, customer & host journeys, admin capability matrix |
| [`docs/PART_01_DESIGN_TRACEABILITY.md`](docs/PART_01_DESIGN_TRACEABILITY.md) | Complete 111-screen inventory mapped to routes, APIs, entities, validations, and tests |
| [`docs/PART_01_DOMAIN_MODEL.md`](docs/PART_01_DOMAIN_MODEL.md) | Proposed PostgreSQL ER schema, booking state machines, and concurrency lock rules |
| [`docs/PART_01_API_BLUEPRINT.md`](docs/PART_01_API_BLUEPRINT.md) | REST API endpoints under `/api/v1`, request/response DTOs, and error codes |
| [`docs/PART_01_SECURITY_AND_TEST_STRATEGY.md`](docs/PART_01_SECURITY_AND_TEST_STRATEGY.md) | Threat modeling, zero-secret policies, concurrency stress testing, and design fidelity audit protocol |
| [`docs/PART_01_DECISIONS_REGISTER.md`](docs/PART_01_DECISIONS_REGISTER.md) | Formal product, commercial, and technical decision log with approver requirements |
| [`docs/PHASE_ROADMAP.md`](docs/PHASE_ROADMAP.md) | 15-phase implementation roadmap (Part 00 through Part 14) with entry/exit criteria |
| [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md) | Windows PowerShell setup, local scripts, and Git feature-branch workflow |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Monorepo boundary rules, package graph, and tenant isolation |

---

## 2. Technology Stack

- **Monorepo Architecture**: npm workspaces with a single root `package.json`
- **Language**: TypeScript throughout (configured via shared `tsconfig.base.json`)
- **Web Applications**: React 19 + Vite 8
- **Styling & Design Tokens**: Tailwind CSS with custom tokens extracted directly from `parkeazy_design_system/DESIGN.md`
- **Backend REST API**: NestJS (v11) with Express platform adapter
- **Testing**: Vitest for automated workspace verification
- **Planned Database**: PostgreSQL (with PostGIS for geolocation)
- **Planned API Standard**: OpenAPI / Swagger (via `@nestjs/swagger` in subsequent phases)

---

## 3. Monorepo Structure & Folder Responsibilities

```
ParkEazy-Backend/
├── apps/
│   ├── website/              # Customer Marketplace Website (Vite, Port 3001)
│   ├── host/                 # Host Operations Portal (Vite, Port 3002)
│   └── admin/                # Platform Administration Panel (Vite, Port 3003)
├── services/
│   └── api/                  # NestJS REST backend service (Port 4000)
├── packages/
│   ├── shared-ui/            # Reusable UI primitives (Buttons, Cards, Badges, Header)
│   ├── api-client/           # Typed HTTP client & HealthApiClient
│   ├── shared-types/         # Shared TypeScript interfaces (Branding, Health, DTOs)
│   ├── branding/             # BrandProvider, theme switcher, and CSS variable injectors
│   ├── validation/           # JSON schema and domain format validators
│   └── config/               # Port constants, API prefixes, and workspace defaults
├── branding/
│   ├── tenants/
│   │   └── default/          # Default tenant config (tenant.json, theme.json, SVG assets)
│   ├── schemas/              # JSON Schema for tenant validation
│   └── shared/               # Raw design tokens (tokens.json)
├── docs/
│   ├── ARCHITECTURE.md       # Architectural boundaries, package graph, and data flow
│   ├── DESIGN_SOURCE_MAPPING.md # Audit of 111 Stitch export screens and token mapping
│   └── DEVELOPMENT_WORKFLOW.md  # Windows PowerShell local development and Git guide
├── tests/                    # Monorepo automated test suite (Vitest)
├── infrastructure/           # Docker Compose scaffold for future local DB/cache
├── .github/workflows/        # GitHub Actions CI workflow
├── tsconfig.base.json        # Base TypeScript compiler configuration
├── package.json              # Monorepo workspace configuration & root scripts
└── .env.example              # Safe environment variable template
```

---

## 4. Software Requirements

- **Node.js**: v22.x LTS recommended; Node.js v24 may also work depending on installed dependency compatibility
- **npm**: v10.x or higher
- **Git**: v2.40 or higher
- **OS**: Windows 10/11 (with Windows PowerShell), macOS, or Linux

---

## 5. Local Setup Instructions (Windows PowerShell)

Run all commands from Windows PowerShell after downloading and extracting the project:

### Step 1: Copy Environment Variables
```powershell
Copy-Item .env.example .env
```

### Step 2: Install Dependencies
```powershell
npm ci
```

### Step 3: Start the API (separate terminal)
```powershell
npm run dev:api
```

The API listens on port 4000 by default. Keep this terminal open while testing registration/login. The shared `@parkeazy/validation` workspace package is a direct API dependency and is exported through its package entry point.

### Step 4: Database-backed inventory

For persistent inventory, configure `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `.env`, then run:

```powershell
npm run db:migrate
npm run db:seed
```

The seed command creates clearly identified starter/test records in the database; review `services/api/src/database/seed.data.ts` before using any seeded accounts or parking records outside local development.

**Demo mode:** set `PARKEAZY_DEMO_MODE=true` only when you intentionally want in-memory demonstration inventory. Demo facilities are not persisted and must not be treated as live listings. Without a reachable database or explicit demo mode, search/listing APIs fail clearly instead of presenting fabricated inventory.

---

## 6. Development Commands & Ports

| Application / Target | Directory | Port | Command |
| :--- | :--- | :--- | :--- |
| **Monorepo Preview Workspace** | Root | `3000` | `npm run dev` |
| **Customer Marketplace Website**| `apps/website` | `3001` | `npm run dev:website` |
| **Host Operations Portal** | `apps/host` | `3002` | `npm run dev:host` |
| **Platform Admin Panel** | `apps/admin` | `3003` | `npm run dev:admin` |
| **NestJS Backend REST API** | `services/api` | `4000` | `npm run dev:api` |
| **All Apps & API Concurrently** | Monorepo | Various | `npm run dev:all` |

### Code Quality & Verification Commands

```powershell
# Run TypeScript compilation check across all packages and apps
npm run typecheck

# Run automated tests
npm run test

# Build all applications and packages for production
npm run build
```

---

## 7. Centralized White-Label Branding System

Branding is managed as a first-class architectural requirement:
1. **Configuration Location**: Authoritative tenant profiles live in `branding/tenants/<tenant-id>/tenant.json`.
2. **Design Tokens**: Standardized in `branding/shared/tokens.json` directly from `parkeazy_design_system/DESIGN.md`:
   - Primary Emerald: `#0F766E`
   - Bright Mint: `#14B8A6`
   - Restrained Gold: `#D6A84F`
   - Surfaces: `#F8FAFC`, `#FFFFFF`, `#F1F3FF`
   - Typography: `Plus Jakarta Sans` (headings) and `Inter` (body & tabular figures)
3. **Consumption**: All three web applications wrap their UI trees in `<BrandProvider>` from `@parkeazy/branding`. The provider automatically injects CSS variables and provides the `useBrand()` hook.
4. **White-Label Rebranding**: A new brand or tenant can be provisioned entirely through configuration without modifying marketplace business logic.

---

## 8. Backend API & Portal Communication

- The NestJS API in `services/api` provides versioned endpoints prefixed with `/api/v1` (e.g., `/api/v1/spaces`, `/api/v1/bookings`).
- A root health check is available at `GET /health` returning:
  ```json
  {
    "status": "ok",
    "service": "parkeazy-backend-api",
    "version": "0.1.0",
    "timestamp": "2026-10-09T15:00:00.000Z",
    "uptimeSeconds": 120,
    "environment": "development",
    "details": {
      "apiPrefix": "/api/v1",
      "plannedDatabase": "PostgreSQL",
      "monorepoMode": true
    }
  }
  ```
- All client applications communicate with the backend via the typed `@parkeazy/api-client` package, passing tenant identification in `X-Tenant-ID` headers.

---

## 9. Authoritative Design Reference & Audit

- **Authoritative Design Repository URL**: `https://github.com/akc-26/ParkEazy-Web-Design`
- **Audit Findings**:
  - The repository was successfully cloned and inspected.
  - Contains **111 exported screen directories** plus `parkeazy_design_system/DESIGN.md`.
  - **Customer Website (`pe_uw_*`)**: 54 screens covering landing, search, bookings, payments, and driver profile.
  - **Host Portal (`pe_hw_*` and `pe_hp_*`)**: 57 screens covering facility setup, bay matrices, gate operations, and payout accounts.
  - **Admin Panel (`pe_aw_*`)**: **Gap identified** — zero admin screens were found in the export. Admin panel functionality is represented with a foundation screen in `apps/admin` and full UI implementation is deferred until design exports are provided.
- Full details are documented in [`docs/DESIGN_SOURCE_MAPPING.md`](docs/DESIGN_SOURCE_MAPPING.md).

---

## 10. Deliberately Deferred Integrations (Scope Boundaries)

In strict accordance with the Part 00 requirements, the following integrations are intentionally deferred to subsequent development phases:

- Production PostgreSQL database connections & TypeORM / Prisma schemas (Deferred to Part 01/02)
- Redis cache & session store (Deferred to Part 01)
- Stripe / Razorpay payment gateway integration (Deferred to Part 04)
- Twilio / Firebase SMS OTP verification (Deferred to Part 01)
- Firebase Cloud Messaging push notifications (Deferred to Part 05)
- Amazon S3 media asset storage for facility photos (Deferred to Part 02)
- Mobile iOS/Android applications (Separate repositories)

No mock implementations are falsely represented as working production integrations.
