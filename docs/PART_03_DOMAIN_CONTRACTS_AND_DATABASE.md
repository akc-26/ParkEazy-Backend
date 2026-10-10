# ParkEazy — Part 03: Shared Domain Contracts, Validation & Database Foundations

> **Status**: COMPLETED & VERIFIED (Part 03)  
> **Starting Commit Baseline**: `61018dd2bc55dd76c54f070717dffe27a705a551` on `feature/part-02-tooling-same-origin`  
> **Authoritative Design System**: `088132819181292b46adc6df9d87e155822f79ba` in `ParkEazy-Web-Design`  
> **Verification Status**: 14/14 Consolidated Checks PASSED | 58/58 Automated Vitest Tests PASSED (0 Failures)

---

## 1. Executive Summary & Deliverables

Part 03 establishes the production-grade domain contracts, runtime input validation boundaries, and relational PostgreSQL database foundations for the ParkEazy white-label parking marketplace monorepo.

### Core Deliverables Implemented:
1. **Shared Domain Contracts (`packages/shared-types`)**:
   - `common.ts`: Common types for `GeoCoordinates`, `MoneyAmount`, `TimeWindow`, `PaginationParams`, `PaginatedResponse<T>`, and `ApiErrorResponse`.
   - `user.ts`: RBAC role definitions (`USER_ROLES = ['customer', 'host', 'attendant', 'superadmin']`), `UserAccount`, `UserRoleAssignment`, `UserVehicle`, and `HostProfile` with KYC status modeling.
   - `payment.ts`: Neutral representations of `PaymentTransaction`, `PricingBreakdown`, and `HostSettlement` respecting unapproved commercial proposals.
   - `booking.ts`: Extended with complete `Booking`, `ReservationHold` (dynamic concurrency lock lease without hardcoded commercial policies), and `CreateBookingRequest` contracts while strictly preserving legacy `BookingStub` and `BookingStatus`.
   - `parking.ts`: Extended with `ParkingFacility`, `ParkingSpace`, `OperatingSchedule`, `FacilityClosure`, and vehicle types (`car`, `bike`, `auto`, `suv`) while preserving legacy stubs.
   - Zero server-only imports; 100% browser-safe and portable.

2. **Shared Runtime Validation (`packages/validation`)**:
   - `common-validators.ts`: Extended with `isValidUuid`, `isValidTenantId`, `isValidBookingReference`, `isValidIsoDateTime`, `isValidTimeFormat`, `isValidGeoCoordinate`, `isValidPostalCode` (6-digit Indian PIN), `isValidEnum`, and `sanitizeString`.
   - `pagination-validator.ts`: Safe pagination extraction with default limits (20), ceiling caps (100), and cursor verification.
   - `domain-validators.ts`: High-level validators for `validateTimeWindow`, `validateCreateBooking`, `validateCreateFacility`, `validateCreateSpace`, `validateUserRegistration`, and `validateSearchQuery`.
   - Fully typed `ValidationResult<T>` with structured, non-leaking error messages.

3. **Database Architecture & Resilience (`services/api/src/database/`)**:
   - `DatabaseConfigService`: Centralized configuration loading and validation supporting `DATABASE_URL` or discrete `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`, `DB_POOL_MAX`, and timeouts. Features `getSanitizedSummary()` which strictly omits credentials from logs and health payloads.
   - `DatabaseService`: NestJS service managing PostgreSQL `pg.Pool` lifecycle. Features non-blocking startup: if PostgreSQL is not running during local testing or CI, the service gracefully switches to offline/degraded mode without crashing process liveness.
   - `MigrationRunner`: Transactional migration manager tracking applied migrations in `schema_migrations` with SHA256 checksum verification.
   - `001_initial_schema.sql`: 8 relational tables (`tenants`, `users`, `role_assignments`, `parking_facilities`, `parking_spaces`, `operating_schedules`, `reservation_holds`, `bookings`) with foreign keys, check constraints, unique constraints, and safe conditional PostGIS extension support.
   - `SeedService`: Idempotent seeder generating the default `ParkEazy` tenant, 3 test users, and 3 production-grade Chennai facilities totaling 108 parking bays with operating hours. Protected by an explicit production safety guard preventing accidental execution when `NODE_ENV === 'production'`.

4. **API Integration & Error Handling**:
   - `ApiExceptionFilter`: Global NestJS filter transforming exceptions into standardized `ApiErrorResponse` shapes while preventing database internals, stack traces, and SQL queries from reaching clients.
   - Enhanced `/health` and `/api/v1/health` reporting database engine, configuration, and connectivity status.
   - Added readiness probes: `/health/ready` and `/api/v1/health/database`.

5. **Tooling & CLI Automation**:
   - `scripts/migrate.mjs`: CLI runner for executing or inspecting migrations (`--status`).
   - `scripts/seed.mjs`: CLI runner for database seeding (with production safety checks).
   - `scripts/verify-local.mjs`: Updated to Part 03 with 14 automated architecture, build, test, and routing checks.

---

## 2. Inherited Part 02 Windows Blocker Resolution

### Analysis of Inherited Failures:
The developer previously reported that on Windows with Node.js `v24.18.0`, Checks 03–08 failed with `tsc`, `vitest`, and `vite` not recognized, and Check 10 failed because `apps/host/dist/index.html` was missing.

**Root Cause Confirmed**:
In a fresh clone or uninitialized workspace, `node_modules/.bin` does not exist prior to running `npm ci` (or `npm install`). The verification script correctly executes `npm run <script>`, but npm cannot find binaries if dependencies were never populated. When `npm ci` is executed first, all workspace binaries link cleanly and all checks pass immediately.

**Lockfile Integrity**:
`package-lock.json` was maintained with `lockfileVersion: 3` and 0 phantom stubs. Only the direct requirement `pg` (and `@types/pg`) was added for the PostgreSQL database client, strictly adhering to npm workspace conventions.

---

## 3. Database Schema Specification

The initial schema (`services/api/src/database/migrations/001_initial_schema.sql`) implements:

| Table | Primary Key | Constraints & Relationships | Purpose |
| :--- | :--- | :--- | :--- |
| `schema_migrations` | `id SERIAL` | Unique `name`, `checksum` | Migration tracking & integrity audit |
| `tenants` | `id VARCHAR(64)` | Unique `primary_domain` | Multi-tenant branding & configuration |
| `users` | `id UUID` | Unique `(tenant_id, email)`, FK `tenants` | Platform accounts & credentials |
| `role_assignments` | `id UUID` | Unique `(user_id, tenant_id, role)` | Multi-tenant RBAC permissions |
| `parking_facilities` | `id UUID` | Unique `(tenant_id, facility_code)`, FK `tenants`, `users` | Physical parking lots / garages |
| `parking_spaces` | `id UUID` | Unique `(facility_id, bay_identifier)`, FK `facilities` | Individual bays & EV charger specs |
| `operating_schedules` | `id UUID` | Unique `(facility_id, day_of_week)`, FK `facilities` | Weekly opening & closing hours |
| `reservation_holds` | `id UUID` | Partial index `WHERE is_released = FALSE`, FK `spaces`, `users` | Ephemeral concurrency lock lease (dynamic TTL) |
| `bookings` | `id UUID` | Unique `booking_reference`, FK `spaces`, `facilities`, `users` | Core transaction entity |

### PostGIS Compatibility Note:
The schema uses standard `latitude NUMERIC(10, 7)` and `longitude NUMERIC(10, 7)` columns with standard B-tree index `idx_facility_coords`. PostGIS extension creation is wrapped in a safe `DO $$ BEGIN ... EXCEPTION WHEN OTHERS THEN ... END $$;` block. If PostGIS is available on the PostgreSQL host, a `geo_point GEOGRAPHY(Point, 4326)` column and GIST index are automatically added. If PostGIS is not available, all tables and migrations still execute 100% reliably.

---

## 4. Realistic Chennai Seed Inventory

The database seed provides 3 realistic Chennai facilities totaling 108 parking bays:

1. **Anna Nagar Plaza Parking (`#FAC-0104`)**:
   - Location: 2nd Avenue, Anna Nagar East, Chennai (`13.085038`, `80.210137`)
   - 24 Bays: 14 Cars (4 with 22kW EV Chargers), 8 Bikes, 2 SUVs
   - Operating Hours: 06:00 to 23:00 daily
   - Features: Covered, Boom Barrier, CCTV, Fastag & QR entry

2. **T. Nagar Commercial Multi-Level Parking (`#FAC-0208`)**:
   - Location: Pondy Bazaar, T. Nagar, Chennai (`13.040520`, `80.233688`)
   - 36 Bays: 24 Cars (6 with 50kW EV Ultra-Fast chargers), 10 Bikes, 2 Autos
   - Operating Hours: 24/7 continuous access
   - Features: Multi-level ramp, elevator, CCTV, security staff

3. **OMR IT Corridor Parking Hub (`#FAC-0315`)**:
   - Location: Rajiv Gandhi Salai, Thoraipakkam, Chennai (`12.939226`, `80.234857`)
   - 48 Bays: 36 Cars (8 with 22kW EV Chargers), 8 SUVs, 4 Bikes
   - Operating Hours: 24/7 continuous access
   - Features: Wide bays, SUV clearance, QR gate, tech corridor shuttle access

---

## 5. Unapproved Decisions Compliance

In strict compliance with the project governance register:
- **No hardcoded commission rates**: Rates remain configurable via tenant settings rather than hardcoded business constants (DEC-01).
- **No commercial gateway locks**: Providers remain neutral (`PAYMENT_PROVIDERS = ['razorpay', 'stripe', 'mock_gateway']`) (DEC-09).
- **No fixed cancellation penalties**: Cancellation policies remain deferred to subsequent operational sign-offs (DEC-02).
- **Reservation Hold TTL**: Modeled as an extensible parameter without hardcoded schema check constraints (DEC-04).

---

## 6. Windows Verification & Robocopy Instructions

### Step 1: Extract Archive on Windows
Extract `parkeazy-part-03-source.zip` to a temporary directory on your Windows workstation (e.g. `C:\temp\parkeazy-part-03`).

### Step 2: Robocopy into Git Repository
Open Windows PowerShell or CMD and copy into your local git repository:
```powershell
robocopy "C:\temp\parkeazy-part-03" "C:\path\to\ParkEazy-Backend" /E /XD .git node_modules dist .vite /XF .env
```

### Step 3: Install Dependencies
```powershell
npm ci
```

### Step 4: Run Consolidated Verification
```powershell
node scripts/verify-local.mjs
```
Expected output:
```
Summary: 14 PASSED, 0 FAILED out of 14 checks
✅ Consolidated verification SUCCEEDED. All 14 checks PASSED.
```

### Step 5: (Optional) Run Database Migrations Against Local PostgreSQL
If running PostgreSQL (e.g. via Docker `docker compose -f infrastructure/docker-compose.yml up -d`):
```powershell
npm run db:migrate
npm run db:seed
npm run db:status
```
