# ParkEazy — Parking Marketplace Platform
## Stage 1: Technical Foundation & Three Web Application Baselines

ParkEazy is a peer-to-peer parking marketplace connecting drivers needing parking with parking-space hosts.

---

## 1. Application Responsibilities
The ParkEazy web repository establishes four core application responsibilities:
1. **User Website** (`apps/user-website/`): Public-facing marketplace for discovering parking, 10-minute hold reservation locks, pricing transparency, and host conversion.
2. **Host Portal** (`apps/host-portal/`): Dedicated workspace based on the VoiceCloud Creator Studio structure (collapsible sidebar, top nav with breadcrumbs, bay inventory, bookings, and payout telemetry).
3. **Admin Panel** (`apps/admin-panel/`): Restricted platform operations workspace based on VoiceCloud Admin (system health, double-entry financial ledger auditing, correlation ID tracking, and state machine invariants).
4. **Shared Backend API** (`apps/api/` & `server.ts`): Unified REST API with `/api/v1` prefix serving all three web applications and future hybrid mobile applications.

*(Note: The User Mobile App and Host Mobile App are developed separately in native/hybrid repositories and are strictly excluded from this web repository).*

---

## 2. Directory Structure
```text
parkeazy/
├── apps/
│   ├── api/                     # Backend API modules & controllers
│   │   ├── config/              # Environment & application config
│   │   ├── database/            # Database prober & SQL migrations
│   │   ├── docs/                # OpenAPI 3.0 specification
│   │   ├── middleware/          # CorrelationId, ErrorHandler, AuthGuard, Logger
│   │   ├── services/            # Inventory, Booking & Ledger business logic
│   │   └── router.ts            # /api/v1 Router
│   ├── user-website/            # Public Marketplace Web App
│   │   ├── components/          # Header, Hero, LocationCard, Modals, Footer
│   │   └── UserWebsiteApp.tsx   # User Website entry point
│   ├── host-portal/             # Host Portal Web App (Creator Studio pattern)
│   │   └── HostPortalApp.tsx    # Host Studio entry point
│   └── admin-panel/             # Admin Panel Web App (Admin Portal pattern)
│       └── AdminPanelApp.tsx    # Admin Console entry point
├── packages/
│   ├── contracts/               # Shared TypeScript schemas, DTOs & constraints
│   ├── design-system/           # Color palettes, typography & design tokens
│   ├── api-client/              # Typed API client with correlation tracking
│   └── ui/                      # Shared reusable UI primitives (Button, Card, Table, etc.)
├── docs/                        # Architecture Decision Records & specifications
│   └── ARCHITECTURE_DECISION_RECORD.md
├── src/                         # Multi-app shell and portal router
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── server.ts                    # Full-Stack entry point (Express + Vite middlewares)
├── .env.example                 # Sanitized environment configuration template
└── README.md
```

---

## 3. Key Invariants & Business Rules Enforced
- **Location vs Bay Separation**: Locations and physical bays are discrete entities with separate identifiers and properties.
- **10-Minute Hold Invariant**: When a bay is held, the server enforces a 600-second lock. Page refresh does not reset the timer.
- **Duration Bounds**: Minimum 1 hour, maximum 72 continuous hours, scheduled in 30-minute intervals.
- **Turnaround Buffer**: 15 minutes between consecutive bookings, calculated separately from holds and grace periods.
- **Append-Only Financial Ledger**: Double-entry accounting where transactions are immutable. Security deposits are escrowed separately from platform commission and host revenue.
- **Payment Provider Association**: Transactions retain their originating payment provider (Stripe, Razorpay).

---

## 4. Development & Verification Commands
- `npm run dev`: Runs the full-stack server on port 3000 (`tsx server.ts`), serving both the `/api/v1` API and the Vite frontend.
- `npm run build`: Bundles the production frontend into `dist/`.
- `npm run lint`: Performs full TypeScript type checking across all packages and apps (`tsc --noEmit`).

---

## 5. Admin-Managed Integrations & Zero-Credential Boot
- **Zero Third-Party Dependency**: No Stripe, Razorpay, Google Maps, Twilio, or S3 credentials are required to run or test Stage 1.
- **Internal Sandbox Simulator**: Pre-configured and active by default, allowing simulated payments and holds without third-party fees.
- **Admin Configuration (`Settings -> Integrations`)**:
  - Live provider switching between Sandbox Simulator, Stripe, and Razorpay.
  - Test/Live mode toggles and diagnostic connection probes with real-time latency reporting.
  - Safe credential management with server-side masking (`sk_••••••••••••3a9f`) and encryption at rest.
  - Configuration audit logging without leaking secret values.
