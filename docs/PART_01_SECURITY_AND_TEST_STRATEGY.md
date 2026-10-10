# ParkEazy — Part 01: Security Architecture & Comprehensive Test Strategy

> **Status**: APPROVED ARCHITECTURAL SPECIFICATION (Part 01)  
> **Scope**: Multi-Tenant Isolation, Zero-Trust Data Boundaries, Concurrency Invariants, and Test Automation

---

## 1. Security Architecture & Threat Modeling

ParkEazy operates as a transactional financial marketplace processing driver reservations, vehicle registrations, and host payouts. The platform enforces strict defense-in-depth principles:

### 1.1 Multi-Tenant Data Isolation
- **Tenant Context Resolution**: Every incoming HTTP request must resolve a valid `tenantId`. Resolved either via:
  1. Signed JWT claims (`sub`, `tenant_id`, `roles`) for authenticated sessions.
  2. Verified custom domain header (`X-Tenant-ID`) validated against the `tenants` table for public routes.
- **Enforcement Layer**: NestJS global guard (`TenantGuard`) injects a request-scoped database context. PostgreSQL Row-Level Security (RLS) ensures queries cannot read or mutate cross-tenant records:
  ```sql
  ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation_policy ON bookings
    USING (tenant_id = current_setting('app.current_tenant_id', true));
  ```

### 1.2 Zero-Trust Authorization & Role Scoping
- **Role Hierarchy**:
  - `anonymous`: Can query published facilities and initiate registration.
  - `customer`: Can manage vehicles, book slots, view own bookings.
  - `host`: Can manage owned facilities, view facility bookings, view earnings.
  - `attendant`: Can perform gate QR check-in/check-out for assigned facilities only.
  - `superadmin`: Platform governance, tenant provisioning, KYC review.
- **Resource Ownership Verification**: A host cannot inspect bookings for a facility they do not own; a customer cannot view another driver's QR access code.

### 1.3 Webhook Cryptographic Verification
- **HMAC Signatures**: Payment webhooks from Razorpay or Stripe must compute and verify the HMAC SHA-256 digest using a server-side secret before processing payloads.
- **Replay & Timing Attack Prevention**:
  1. Comparison uses `crypto.timingSafeEqual` to avoid timing side-channels.
  2. Webhook timestamps older than 300 seconds are rejected.
  3. Unique webhook delivery IDs are recorded in an idempotency cache.

### 1.4 Zero-Secret Client Architecture
- Web Vite bundles and React source trees must never contain database URLs, JWT signing secrets, payment secret keys, or cloud storage credentials.
- All client communications pass through the NestJS API gateway.

---

## 2. Concurrency Control & Double-Booking Safeguards

The platform's primary transactional failure mode is a race condition where two drivers simultaneously book the same parking space for an overlapping time interval.

### Mitigation Architecture
1. **Tier 1 — Ephemeral Hold Lease**:
   When a user proceeds to checkout, the system attempts to acquire an exclusive temporary hold lease in PostgreSQL (`reservation_holds`) with a **10-minute TTL**.
2. **Tier 2 — Transactional Lock on Finalization**:
   When the asynchronous payment confirmation arrives, booking creation executes inside a PostgreSQL transaction at `SERIALIZABLE` isolation level:
   ```typescript
   await entityManager.transaction('SERIALIZABLE', async (tx) => {
     // Re-verify slot availability with pessimistic write lock
     const slot = await tx.createQueryBuilder(ParkingSpace, 'ps')
       .setLock('pessimistic_write')
       .where('ps.id = :spaceId', { spaceId })
       .getOne();

     const hasOverlap = await tx.createQueryBuilder(Booking, 'b')
       .where('b.spaceId = :spaceId AND b.status IN (:...activeStates)', {
         spaceId,
         activeStates: ['confirmed', 'active'],
       })
       .andWhere('tstzrange(b.startsAt, b.endsAt) && tstzrange(:start, :end)', {
         start: hold.startsAt,
         end: hold.endsAt,
       })
       .getExists();

     if (hasOverlap) {
       throw new ConflictException('Space already reserved by concurrent transaction');
     }

     // Transition hold to confirmed booking
     await tx.save(Booking, confirmedBooking);
     await tx.update(ReservationHold, hold.id, { isReleased: true });
   });
   ```

---

## 3. Comprehensive Test Strategy & Verification Matrix

The monorepo enforces a four-tier testing pyramid:

```
               ▲
              / \
             /E2E\             Tier 4: Browser E2E Smoke Tests (Playwright)
            /-----\
           / Concur\           Tier 3: Concurrency & Lock Stress Tests
          /---------\
         / Integrat. \         Tier 2: NestJS Supertest API Tests
        /-------------\
       /  Unit Tests   \       Tier 1: Vitest Unit & Schema Tests [ACTIVE]
      /─────────────────\
```

### Tier 1: Unit & Schema Tests (Active Baseline)
- **Framework**: Vitest v5.0.3
- **Location**: `tests/monorepo.test.ts`
- **Coverage**:
  - Tenant branding JSON schema validation
  - Design token adherence (`parkeazy_design_system/DESIGN.md`)
  - Format validators (Indian vehicle license plates, email syntax)
  - Offline API client fallback snapshot integrity
  - Workspace port allocations and NestJS `HealthService` execution

### Tier 2: API Integration Tests (Target: Part 03/04)
- **Framework**: Vitest + Supertest
- **Scope**:
  - `POST /api/v1/auth/login` and JWT issuance
  - `POST /api/v1/search/query` geo-radius PostGIS queries
  - `POST /api/v1/bookings/hold` lease creation and expiration
  - Webhook signature validation failure modes (`400 Bad Request`, `401 Unauthorized`)

### Tier 3: Concurrency & Lock Stress Tests (Target: Part 07)
- **Mechanism**: Simulated 50 concurrent virtual users attempting to acquire a reservation hold on the exact same parking slot at the same millisecond.
- **Pass Criterion**: Exactly 1 user acquires the hold; 49 receive a `409 Conflict` error; zero database integrity violations.

### Tier 4: Browser E2E Smoke Tests (Target: Part 09/10)
- **Framework**: Playwright
- **Scope**:
  - Customer discovers space → filters by vehicle type → views price breakdown → confirms booking.
  - Host logs in → checks operational dashboard → verifies gate check-in.

---

## 4. Design Fidelity Verification Protocol

A TypeScript typecheck or build pass does **not** prove design fidelity. Future screen acceptance must follow this protocol:

1. **Pixel & Spacing Audit**: Compare implemented viewport against authoritative Stitch screenshot (`screen.png`) at 1440px desktop and 390px mobile.
2. **Typography Check**: Ensure `Plus Jakarta Sans` is applied to headlines and `Inter` (with `data-tabular` tabular figures) to pricing matrices.
3. **Color Contrast Verification**: Validate WCAG AAA contrast ratio for Deep Ink (`#101828`) against Soft Surface (`#F8FAFC`).
4. **State Machine Verification**: Verify screen under all five standard states:
   - Initial Loaded State
   - Loading Skeleton State
   - Empty State (Zero results found)
   - Error / Conflict State
   - Success / Confirmation State
