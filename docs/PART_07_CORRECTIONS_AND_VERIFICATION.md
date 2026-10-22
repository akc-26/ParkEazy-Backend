# Part 07 Corrective Changes — Booking Lifecycle & Concurrency Safeguards

## Scope

This corrective pass preserves the existing Part 07 screens and monorepo structure while addressing high-risk booking lifecycle defects found in the submitted source.

## Implemented corrections

- Added database-backed hold creation using a PostgreSQL transaction and `SELECT ... FOR UPDATE` on the parking-space row so concurrent hold attempts for the same space serialize across API instances.
- Added database-backed booking creation using the same per-space row lock, persistent overlap checks, hold ownership/window/expiry validation, and persisted lifecycle events.
- Added database-backed reads and lifecycle transitions for customer bookings, check-in, check-out, extensions, cancellations, and support tickets.
- Added migration `008_booking_concurrency_integrity.sql` with supporting indexes for active booking windows, holds, recent customer bookings, and payment lookups.
- Enforced booking time-window rules in the service layer: valid chronological timestamps, minimum one hour, maximum 72 hours, 30-minute increments, 15-minute arrival lead time, and 30-day booking horizon.
- Enforced hold ownership on renewal/release; expired or released holds cannot be renewed. Overlapping active holds are rejected even when they belong to the same customer.
- Added authentication and tenant guards to booking endpoints, with ownership checks before customer booking details, passes, cancellation previews, overstay details, support tickets, check-in/out, extension, cancellation, and receipt access are returned or changed.
- Removed hardcoded demo-customer fallback identities from the booking controller and removed the special-case bypass in the in-memory booking list.
- Made production booking operations fail closed when PostgreSQL is unavailable instead of silently falling back to process-local state. Demo/in-memory behavior remains available only outside production for the existing local test fixture workflow.
- Removed the development JWT-secret fallback in production: `JWT_SECRET` must be configured with at least 32 characters.
- Removed fake payment capture/verification behavior. Payment initiation now reports that a provider is not configured, and verification no longer fabricates captured transactions. Checkout does not create or confirm a booking while payment verification is unavailable and releases the temporary hold.
- Removed the receipt's unsupported assertion that payment is already paid; it now explicitly indicates that payment has not been verified by the booking service.
- Added tests for booking-window limits, hold renewal ownership, and same-customer overlapping holds. Updated stale fixed-date booking tests to use future windows.

## Important integration boundary

A real payment-provider integration, signed webhook verification, refund execution, and payment reconciliation are not implemented by this corrective pass. Those require the planned Part 08 payment subsystem. Until Part 08 is connected, checkout intentionally fails closed rather than representing a simulated transaction as paid or confirming a customer booking without authoritative payment verification.

## Verification performed in this environment

- Archive source was extracted from the supplied Part 07 ZIP and edited in place.
- TypeScript/TSX syntax transpilation was run across 172 TypeScript/TSX source files and reported zero syntax errors.
- Full `npm ci`, type-check, Vitest, and production builds could not be completed in this environment: dependency installation timed out and left the dependency tree incomplete (`vite/client` and Node type definitions unavailable). No claim is made that those checks passed.
- Database-backed transaction paths require verification against a real isolated PostgreSQL test database before production acceptance.
