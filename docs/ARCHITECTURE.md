# ParkEazy Monorepo Architecture Documentation

## 1. System Overview

ParkEazy is architected as a high-performance, white-label urban parking marketplace monorepo designed to operate across multiple client surfaces while backed by a unified NestJS API service.

The architecture enforces strict separation of concerns, single-source-of-truth brand theming, and modular package sharing.

```
                              ┌──────────────────────────────────────────┐
                              │            Tenant Branding               │
                              │   (branding/tenants/default/tenant.json) │
                              └────────────────────┬─────────────────────┘
                                                   │
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       @parkeazy/branding                                               │
│                         (BrandProvider, CSS Variables, Design Tokens, Hooks)                          │
└───────────────┬──────────────────────────────────┬─────────────────────────────────────┬───────────────┘
                │                                  │                                     │
                ▼                                  ▼                                     ▼
   ┌───────────────────────────┐      ┌───────────────────────────┐       ┌───────────────────────────┐
   │    apps/website (3001)    │      │     apps/host (3002)      │       │    apps/admin (3003)      │
   │  Customer Marketplace     │      │   Host Operations Portal  │       │  Platform Administration  │
   │   (Vite + React 19)       │      │     (Vite + React 19)     │       │    (Vite + React 19)      │
   └────────────┬──────────────┘      └────────────┬──────────────┘       └─────────────┬─────────────┘
                │                                  │                                    │
                └──────────────────────────────────┼────────────────────────────────────┘
                                                   │
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │          @parkeazy/shared-ui           │
                               │ (Buttons, Cards, Badges, Header, etc.) │
                               └───────────────────┬────────────────────┘
                                                   │
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │         @parkeazy/api-client           │
                               │  (Typed HTTP Client, Health API)       │
                               └───────────────────┬────────────────────┘
                                                   │
                                                   │ HTTP / JSON (CORS)
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │         services/api (4000)            │
                               │      NestJS REST API Backend           │
                               │      GET /health, /api/v1/*            │
                               └────────────────────────────────────────┘
```

---

## 2. Monorepo Directory Organization

```
ParkEazy-Backend/
├── apps/
│   ├── website/              # Customer web application (Vite, React 19, Port 3001)
│   ├── host/                 # Host operational portal (Vite, React 19, Port 3002)
│   └── admin/                # Platform management panel (Vite, React 19, Port 3003)
├── services/
│   └── api/                  # NestJS REST backend service (Port 4000)
├── packages/
│   ├── shared-ui/            # Reusable UI primitives conforming to ParkEazy design tokens
│   ├── api-client/           # Centralized typed HTTP API communication layer
│   ├── shared-types/         # Domain models, branding interfaces, and DTO contracts
│   ├── branding/             # Typed brand provider, token resolvers, CSS variable injectors
│   ├── validation/           # JSON schema and domain format validators
│   └── config/               # Port assignments, API prefixes, and workspace constants
├── branding/
│   ├── tenants/
│   │   └── default/          # Default ParkEazy tenant config, theme, and SVG assets
│   ├── schemas/              # JSON Schema definitions for tenant configuration
│   └── shared/               # Base design token definitions
├── docs/
│   ├── ARCHITECTURE.md       # Application boundaries, packages, and data flow
│   ├── DESIGN_SOURCE_MAPPING.md # Audit of 111 Stitch export screens and token mapping
│   └── DEVELOPMENT_WORKFLOW.md  # Windows PowerShell local development & Git guide
├── tests/                    # Workspace-level automated test suite (Vitest)
├── infrastructure/           # Docker Compose scaffolds for local DB and caches
├── .github/workflows/        # Continuous integration workflows
├── tsconfig.base.json        # Shared TypeScript compiler options
├── package.json              # Monorepo root workspace configuration
└── .env.example              # Environment variable template
```

---

## 3. Application Boundaries and Responsibilities

### 3.1 Customer Website (`apps/website`)
- **Audience**: Urban drivers seeking parking near offices, shopping centers, events, or transit.
- **Planned Responsibilities**:
  - Live geo-search and location suggestions with radius filters.
  - Interactive map canvas with pin clustering and pricing previews.
  - Vehicle categorization (2-wheeler, 3-wheeler, hatchback, sedan, SUV).
  - Slot reservation workflow with QR pass issuance.
- **Current Part 00 State**:
  - Starter screen grounded in `user_website_landing_page_pe_uw_01_01`.
  - Consumes `@parkeazy/branding` and `@parkeazy/shared-ui`.
  - Transactional logic and backend writes deferred.

### 3.2 Host Portal (`apps/host`)
- **Audience**: Commercial parking lot operators, real estate managers, and private space owners.
- **Planned Responsibilities**:
  - Facility creation, entrance waypoints, and bay layout matrices.
  - Real-time slot occupancy telemetry (occupied vs. available).
  - Dynamic pricing rules, peak hours, and weekend schedules.
  - Gate check-in/check-out QR scanner verification.
  - Automated weekly settlement ledger and bank account management.
- **Current Part 00 State**:
  - Starter screen grounded in `host_operations_dashboard_pe_hp_02_01`.
  - Consumes `@parkeazy/branding` and `@parkeazy/shared-ui`.
  - Live hardware integrations deferred.

### 3.3 Admin Panel (`apps/admin`)
- **Audience**: Platform superadmins and regulatory compliance operators.
- **Planned Responsibilities**:
  - White-label tenant creation and visual brand asset management.
  - Host onboarding KYC verification (property deeds, commercial licenses).
  - Platform commission auditing (10-15% platform split) and dispute reconciliation.
  - System-wide occupancy heatmaps and service alerts.
- **Current Part 00 State**:
  - Minimal foundation screen clearly disclosing that admin screens were not present in the initial Google Stitch export.
  - Outlines the 6 core governance modules without inventing synthetic mockup widgets.

---

## 4. Shared Package Ecosystem

1. **`@parkeazy/branding`**:
   - Injects runtime CSS variables (`--pe-color-primary`, `--pe-color-surface`, etc.).
   - Provides React `BrandProvider` context and `useBrand()` hook.
   - Exports authoritative design tokens matching `parkeazy_design_system/DESIGN.md`.

2. **`@parkeazy/shared-ui`**:
   - Atomic UI components: `Button`, `Card`, `Badge`, `BrandLogo`, `Header`, `MetricCard`, `PortalBanner`.
   - Adheres strictly to the 8pt spatial grid, Plus Jakarta Sans display typography, and Inter tabular body font.

3. **`@parkeazy/api-client`**:
   - Standardized fetch client with configurable base URL, timeout abort controllers, and multi-tenant headers (`X-Tenant-ID`).
   - Implements `HealthApiClient` supporting root `/health` and prefixed `/api/v1/health`.

4. **`@parkeazy/shared-types`**:
   - Zero-dependency TypeScript interfaces for data models (`TenantConfig`, `HealthCheckResponse`, `ParkingSpaceStub`, `BookingStub`).

5. **`@parkeazy/validation`**:
   - Schema validation for tenant JSON configurations.
   - Domain format validators for vehicle registration numbers (Indian standard format), email addresses, and phone numbers.

6. **`@parkeazy/config`**:
   - Central definition for monorepo port allocations (`website: 3001`, `host: 3002`, `admin: 3003`, `api: 4000`, `preview: 3000`).

---

## 5. Backend REST API Architecture (`services/api`)

- Framework: **NestJS** with Express platform adapter.
- Global Prefix: `/api/v1` for versioned resource endpoints.
- Root Endpoints: `GET /health` explicitly excluded from prefix to support standard container health probes and load balancer monitors.
- Planned Database: **PostgreSQL** (with PostGIS for geospatial coordinates in Part 02).
- Security & CORS: Configured to accept requests from all monorepo client origins.
