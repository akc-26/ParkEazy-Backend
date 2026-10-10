# ParkEazy — Phased Implementation Roadmap (Part 00 to Part 14)

> **Status**: APPROVED IMPLEMENTATION SEQUENCE (Part 01)  
> **Guiding Principle**: Preserve Part 00 monorepo foundation, implement strictly against the 111 authoritative Stitch design screens, maintain zero double-booking concurrency guarantees, and avoid speculative business policies.

---

## 1. Roadmap Phase Matrix

```
Part 00 ──> Part 01 ──> Part 02 ──> Part 03 ──> Part 04 ──> Part 05 ──> Part 06 ──> Part 07
Scaffold    Blueprint   Tooling     Database    Auth/Tenant Listings    Search      Bookings
 (DONE)      (ACTIVE)   Verification                                                & Locks
                                                                                       │
                                                                                       ▼
Part 14 <── Part 13 <── Part 12 <── Part 11 <── Part 10 <── Part 09 <── Part 08 <──────┘
Deploy      Mobile      Notifs &    Admin       Host UI     Customer UI Payments
& Review    Apps        Support     Governance  End-to-End  End-to-End  & Settlements
```

---

## 2. Detailed Phase Specifications

### Part 00: Project Foundation & Monorepo Scaffold [COMPLETED]
- **Deliverables**: Root monorepo structure, 3 web apps (`apps/website`, `apps/host`, `apps/admin`), NestJS API (`services/api`), 6 shared packages, centralized branding, root scripts, initial design audit.
- **Git Commit**: `3238969` on `feature/part-00-project-foundation`.

### Part 01: Authoritative Design Audit, Functional Traceability & Blueprint [ACTIVE]
- **Deliverables**:
  - Full audit of 111 Stitch export screens and `DESIGN.md` in `ParkEazy-Web-Design` (commit `0881328`).
  - Traceability matrix mapping every design screen to routes, APIs, entities, and tests.
  - End-to-end customer booking and host operational journey specifications.
  - Proposed domain models, REST API blueprint, and decisions register.
  - Admin panel gap report and phased roadmap.
- **Exit Criteria**: All 8 blueprint documents committed and verified without breaking Part 00 builds.

### Part 02: Development Tooling Hardening & Consolidated Verification Script
- **Scope**:
  - Implement single-command Windows PowerShell & CI script: `node scripts/verify-local.mjs`.
  - Package-lock and workspace dependency reconciliation.
  - Vite build optimization and ESM path resolution cleanup.
  - Multi-portal parallel execution tooling (`npm run dev:all`).
- **Entry Criteria**: Part 01 blueprint accepted.
- **Deliverable**: Working, cross-platform `scripts/verify-local.mjs` reporting pass/fail for all targets.

### Part 03: Shared Domain Contracts, Validation & Database Foundations
- **Scope**:
  - PostgreSQL schema definitions via Drizzle/TypeORM migrations.
  - PostGIS spatial indexing setup for coordinate searches.
  - Shared domain interfaces and Zod/class-validator validation schemas in `@parkeazy/validation`.
  - Database seed script with realistic Chennai parking facilities.
- **Deliverable**: Passing database migration tests and schema validation suites.

### Part 04: Authentication, Accounts, Roles & Tenant Boundaries
- **Screens Covered**: 19 screens (`pe_uw_02_01` to `pe_uw_02_10`, `pe_hw_01_01` to `pe_hw_01_09`).
- **Scope**:
  - NestJS authentication module with multi-tenant JWT issuance.
  - Mobile OTP challenge verification integration (DLT/Firebase compliant).
  - RBAC guards enforcing Customer, Host, Attendant, and Superadmin permissions.
  - Customer and host login/signup/reset UI wiring with `@parkeazy/branding`.
- **Deliverable**: Working authentication across customer and host portals with session persistence.

### Part 05: Parking Space Listings & Host Inventory Management
- **Screens Covered**: 18 screens (`pe_hw_02_01` to `pe_hw_02_09`, `pe_hw_03_01` to `pe_hw_03_09`, `pe_hp_04_01`).
- **Scope**:
  - Add facility wizard, physical bay layout matrix, EV charger tags.
  - Operating hours, weekly schedules, holiday closure overrides, and hourly rate configurations.
  - Facility publishing checklist and publication readiness validator.
- **Deliverable**: Host can create facility, configure 24 bays, set rates, and publish listing.

### Part 06: Availability, Search & Discovery
- **Screens Covered**: 8 screens (`pe_uw_03_01` to `pe_uw_03_08`).
- **Scope**:
  - High-performance PostGIS radius search endpoint (`POST /api/v1/search/query`).
  - Autocomplete location suggestions dropdown.
  - Split-screen 55/45 interactive map and listing feed view.
  - Vehicle filter chips (`car`, `bike`, `auto`) and amenity filters.
- **Deliverable**: Driver can search location, filter by vehicle, view pins, and click space details.

### Part 07: Booking Lifecycle & Concurrency Safeguards
- **Screens Covered**: 18 screens (`pe_uw_04_01` to `pe_uw_04_09`, `pe_uw_06_01` to `pe_uw_06_09`).
- **Scope**:
  - Ephemeral reservation hold lease with 10-minute countdown TTL.
  - Serializable concurrency control preventing double-bookings.
  - Booking confirmation pass generation with dynamic cryptographic QR code.
  - Active session countdown timer, duration extension drawer, and cancellation review.
- **Deliverable**: Complete reservation state machine verified with concurrent virtual user stress tests.

### Part 08: Payments, Platform Fees, Refunds & Settlements
- **Screens Covered**: 17 screens (`pe_uw_05_01` to `pe_uw_05_08`, `pe_hw_05_01` to `pe_hw_05_09`).
- **Scope**:
  - Gateway integration scaffold (Razorpay / Stripe) with server-authoritative order creation.
  - Cryptographic webhook HMAC signature verification.
  - Platform commission calculation (12%) and GST breakdown.
  - Host weekly settlement projections, bank details management, and UTR audit records.
- **Deliverable**: Verified webhook-driven booking confirmation and host payout ledger.

### Part 09: Customer Marketplace Website End-to-End Delivery
- **Scope**:
  - Comprehensive screen-by-screen fidelity audit of all 54 `pe_uw_*` screens in `apps/website`.
  - Visual hierarchy, 8pt spacing, Plus Jakarta Sans typography, and responsive checks.
  - End-to-end integration from discovery to payment to active QR pass.
- **Deliverable**: Fully functioning customer marketplace website matching authoritative Stitch designs.

### Part 10: Host Operations Portal End-to-End Delivery
- **Screens Covered**: Full 57 host screens (`pe_hw_*` and `pe_hp_*`).
- **Scope**:
  - Live operational dashboard (`host_operations_dashboard_pe_hp_02_01`).
  - Attendant gate check-in / check-out QR scanner interface.
  - Facility settings, team member invitations, and shift audit logs.
- **Deliverable**: Fully functioning host operations portal matching authoritative Stitch designs.

### Part 11: Admin Requirements Approval, Design & Implementation
- **Scope**:
  - Acquire or formalize authoritative designs for Admin Panel (`pe_aw_*`).
  - Implement host KYC document review and facility approval pipeline.
  - Multi-tenant white-label configuration panel and commission fee administration.
  - Platform audit log viewer and city telemetry monitoring.
- **Deliverable**: Production-ready platform governance panel in `apps/admin`.

### Part 12: Notifications, Support & Operational Hardening
- **Scope**:
  - Transactional SMS alerts (booking confirmed, arrival reminder, 15m remaining).
  - Push notifications via Firebase Cloud Messaging.
  - Customer and host dispute ticket submission and resolution workflow.
- **Deliverable**: Operational support desk and transactional messaging pipeline.

### Part 13: Customer & Host Android/iOS Mobile Applications
- **Scope**:
  - Cross-platform mobile project scaffold utilizing Ionic React + Capacitor.
  - Shared domain models, branding tokens, and `@parkeazy/api-client`.
  - Mobile-native camera QR scanner for gate attendants and turn-by-turn navigation deep-links.
- **Deliverable**: Standalone Android and iOS app projects targeting Google Play and Apple App Store.

### Part 14: White-Label Release Readiness, Security Audit & Deployment
- **Scope**:
  - End-to-end penetration testing, OWASP Top 10 compliance audit, and rate-limit verification.
  - Multi-tenant brand switcher testing with automated theme generation.
  - Production Dockerfile and Cloud Run / Kubernetes deployment manifests.
- **Deliverable**: Production release readiness sign-off.
