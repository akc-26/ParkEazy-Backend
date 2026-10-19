# ParkEazy Phase 5 — Authoritative Requirements Matrix & Screen Inventory
**Date:** October 2026  
**Status:** Approved for Implementation  
**Project:** ParkEazy Parking Marketplace Platform  
**Branch:** `Phase5-User-Website`  
**Baseline Commit:** `8a7ad83edf47f7131c61724188d59aee34387924`

---

## 1. Scope Overview

Phase 5 delivers the production-ready consumer **User Website** for ParkEazy, building directly on the verified Phase 4 baseline without regressing the existing Host Portal, Admin Panel, or shared Backend REST API (`/api/v1`).

---

## 2. Requirements Matrix by Screen Group

| Req ID | Screen / Feature | Route / View | Key Sections & UI Controls | Business & Validation Rules | API Contract & Methods | Auth Level | States Handled | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-SH-01** | **Shared Application Shell** | All User routes | Top bar (3-zone: Brand wordmark, 4-5 nav links: Search Spaces, How It Works, Host Portal, My Bookings, 1 CTA: Sign In / Profile dropdown), Breadcrumbs, Toast Notifications, Footer | Anti-slop 3-zone contract; unboxed metadata; responsive mobile navigation drawer; single-line controls | `GET /api/v1/auth/session` | Public / Contextual (shows User menu if logged in) | Loading, Authenticated, Unauthenticated | VERIFIED |
| **REQ-HP-01** | **Homepage** | `/` | Hero section with direct search bar (Location/City, Date & Time, Duration), Architecture & Invariants Bento (10-min hold, physical bay identity, escrow ledger), Featured Inventory grid (`/api/v1/inventory/locations`), Host Portal conversion banner, Trust & Protection footer | Search validation (minimum 1h, 30m increments, 15m lead time); click initiates search navigation | `GET /api/v1/inventory/locations` | Public | Loading skeleton, Empty, Error retry, Populated | VERIFIED |
| **REQ-SR-01** | **Search & Results** | `/search` | Search refinement bar (City, Date, Duration), Filter drawer/sidebar (EV Charging only, Covered parking, Max Hourly Rate, Bay Type), Sort selector (Price: Low to High, High to Low, Rating), Results grid of Location Cards, Active filter chips, Result count | Client & query sync; preserve parameters on navigation; filter by amenities (`EV Charging`, `Covered Garage`, etc.) | `GET /api/v1/inventory/locations` | Public | Loading pulse, Empty matches with clear-filters CTA, Populated list | VERIFIED |
| **REQ-PD-01** | **Parking-Space Details** | `/spaces/:id` | Photo gallery with verified images, Location header & address, Bay availability list (discrete physical bays with level/bayNumber/EV spec), Amenities tags (clean text with bullet separators), Access instructions & security policy, Sticky Purchase/Hold Module with real-time rate calculator | Distinct Location vs Bay entities; 1-72h bounds; 30m steps; selected bay validation; triggers 10-minute hold lock | `GET /api/v1/inventory/locations/:id`, `GET /api/v1/inventory/locations/:id/bays`, `POST /api/v1/bookings/hold` | Public (Hold requires or generates guest/customer session) | Loading skeleton, Not Found (404), Active Bay selection, Hold timer countdown | VERIFIED |
| **REQ-AU-01** | **Customer Authentication** | `/login`, `/register`, Auth Modal | Tabbed Login/Register interface, Email input with regex validation, Password input (min 8 chars), Demo Driver 1-click autofill (`driver@parkeazy.com`), Sign In button with spinner, Error callout for bad credentials | Token storage in `apiClient` & `localStorage`; JWT HMAC verification; redirect back to intended route | `POST /api/v1/auth/login`, `GET /api/v1/auth/session` | Public | Idle, Submitting/Loading, Error banner, Success transition | VERIFIED |
| **REQ-BR-01** | **Booking Review** | `/booking/review` | Reservation summary card, Selected Location & Physical Bay badge, Date & Time breakdown, Authoritative Quote Snapshot (Base price, Security deposit, Platform fee 15%, Taxes 10%, Total payable), Cancellation policy tier details, Vehicle license plate input | Persistent 10-minute hold countdown; cannot proceed if hold expires; license plate required (alphanumeric 2-12 chars); server revalidates hold | `GET /api/v1/bookings/hold/:id`, `POST /api/v1/bookings/hold`, `GET /api/v1/bookings/rules` | Authenticated / Contextual (prompts auth if guest) | Active hold timer, Expired hold warning with re-hold CTA, Invalid plate error, Populated review | VERIFIED |
| **REQ-CO-01** | **Checkout & Payment** | `/checkout` | Order breakdown column, Escrow Security Deposit notice, Payment Provider Selector (Mock Payment Sandbox / Stripe / Razorpay), Cardholder Name, Card Number, Expiry, CVC, Idempotency key generation, "Pay & Confirm Reservation" CTA | Double-entry ledger compliance; server-side payment intent; no secret exposure; handles pending/failed/success; idempotency key preserved across retries | `POST /api/v1/payments/intent`, `GET /api/v1/payments/intent/:id`, `POST /api/v1/bookings` | Authenticated (Customer) | Processing spinner, Payment declined with retry, Network failure, Confirmed | VERIFIED |
| **REQ-BC-01** | **Booking Confirmation** | `/booking/confirmation/:id` | Success checkmark banner, Authoritative Booking Reference (`bk-2026-xxxx`), Location map/address card, Assigned Bay details, Access Pass with PIN / Gate code instructions, Download / Print receipt action, "View in My Bookings" CTA | Displays only on authoritative server confirmation; idempotent on browser refresh; zero duplicate charges; strict ownership & access code gating | `GET /api/v1/bookings/:id` | Authenticated (Customer) | Loaded receipt, Print view trigger, Direct navigation links, 403 Forbidden | VERIFIED |
| **REQ-UB-01** | **User Bookings Management** | `/bookings` | Status Filter Tabs (`All`, `Active`, `Upcoming`, `Completed`, `Cancelled`), Booking Card list with bay number, dates, total paid, and status badge, View Access Instructions action, Cancel Booking action (with cancellation tier policy check) | Status transitions strictly server-governed; cancellation refund rules enforced; overstay warning notice | `GET /api/v1/bookings` (user-scoped) | Authenticated (Customer) | Loading skeleton, Empty bookings state with "Find Parking" CTA, Populated list | IMPLEMENTED IN SOURCE; acceptance pending |
| **REQ-PR-01** | **Profile & Account Settings** | `/profile` | Driver profile overview, Name and contact fields, Registered vehicles list (Plate, Make, Model), Security & Password update tab, Notification preferences, Sign Out button | Form validation for name and phone; updates stored in user session | `GET /api/v1/auth/session` | Authenticated (Customer) | View mode, Edit mode, Saved toast feedback | IMPLEMENTED IN SOURCE; persistence and end-to-end acceptance pending |

---

## 3. Implementation Order & Milestone Map

1. **Milestone 0: Baseline Verification** (COMPLETED)
   - Verified Git HEAD `8a7ad83edf47f7131c61724188d59aee34387924`.
   - Verified 61/61 backend baseline tests passing.
   - Preserved `Baseline-Confirmation` branch; checked out working branch `Phase5-User-Website`.

2. **Milestone 1: Requirements Matrix & Dependencies** (COMPLETED)
   - Created `docs/PHASE_5_REQUIREMENTS_MATRIX.md`.
   - Mapped all 10 screen groups to contracts and endpoints.

3. **Milestone 2: Shared User Website Shell & Router Integration** (COMPLETED)
   - Verified Git baseline `8faaa29bfb188ab0ee2eb0ec2af5445b7e01562d` on branch `Ph5-Module1`.
   - Enhanced root routing in `src/App.tsx` to mount `UserWebsiteApp` for all consumer paths (`/`, `/search`, `/spaces/:id`, `/booking/review`, `/checkout`, `/booking/confirmation/:id`, `/bookings`, `/profile`, `/login`, `/register`).
   - Standardized `UserHeader` with anti-slop 3-zone contract, responsive mobile drawer, active user state, and semantic navigation hooks.
   - Built Toast / Notification context and floating accessible notification stack.
   - Standardized `UserFooter` with responsive layout, semantic navigation, and trust invariant badges.
   - Verified full-stack dev server stability and 61/61 passing automated tests.

4. **Milestone 3: Discovery Screens (Homepage & Search/Results & Space Details)** (COMPLETED)
   - Built dynamic `/search` SearchPageView with multi-criteria filtering (Query/City, Duration, EV Charging, Covered Parking, Max Hourly Rate slider, Bay Type).
   - Implemented real-time URL search query param synchronization and active filter chips with 1-click removal and reset.
   - Implemented inventory sorting (`price_asc`, `price_desc`, `bays_desc`, `name_asc`).
   - Implemented `/spaces/:id` SpaceDetailsPageView with verified imagery, discrete physical bay selector (levels, bay types, availability status), real-time pricing breakdown, and interactive 10-minute hold reservation trigger (`POST /api/v1/bookings/hold`) with live countdown timer.
   - Preserved all contracts, zero regressions on Host Portal and Admin Panel.

5. **Milestone 4: Customer Authentication Flows (Login & Registration)** (COMPLETED)
   - Built dedicated `AuthPageView` supporting `/login` and `/register` routes with email & password form validation.
   - Handled RFC 5322 regex email validation, password length checks, and password confirmation matching.
   - Integrated with backend HMAC-SHA256 JWT login (`POST /api/v1/auth/login`) and session discovery (`GET /api/v1/auth/session`).
   - Integrated 1-click verified driver demo credentials (`driver@parkeazy.com` / Alex Morgan) with instant session setup.
   - Connected `UserHeader` desktop and responsive mobile drawer navigation links to `/login` and `/register`.
   - Handled authenticated session discovery, user dropdown menu, and clean sign-out workflow with token disposal.
   - Verified 68/68 automated tests passing, 0 lint errors, and successful production build.

6. **Milestone 5: Booking Review, Checkout & Confirmation Journey** (COMPLETED)
   - Built `/booking/review` BookingReviewPageView with live 10-minute hold countdown, discrete bay details, itemized quote breakdown, and license plate validation.
   - Built `/checkout` CheckoutPageView with payment intent integration (`/api/v1/payments/intent`), mock/live gateway selector, segregated escrow deposit breakdown, and stable idempotency protection.
   - Built `/booking/confirmation/:id` BookingConfirmationPageView with authoritative backend booking lookup, digital access pass with gate PIN, and receipt printing action.
   - Verified double-entry ledger posting: `PARKING_FEE_COLLECTED`, `DEPOSIT_HELD`, and `HOST_EARNING_ACCRUED`.
   - Verified 75/75 automated tests passing, 0 lint errors, and zero regressions across Host Portal and Admin Panel.

7. **Milestone 6: User Bookings & Account Management**
   - Implement `/bookings` with Active, Upcoming, and Completed filters, access pass details, and policy-compliant cancellation.
   - Implement `/profile` with vehicle management and preferences.

8. **Milestone 7: Regression, Verification & Acceptance Report**
   - Execute test suite (`npm test`).
   - Run typecheck (`npm run lint`).
   - Verify all screens on mobile, tablet, and desktop viewports.
   - Produce final acceptance report with Git checkpoint on `Phase5-User-Website`.


## 4. Customer-Side Reliability Gap Closure — Source Audit Notes (2026-10-17)

This section records source-level corrections and limitations. A component or endpoint being present does not imply production readiness.

- Removed seeded fixed gate PINs from demo bookings. Customer access details must be derived from the booking returned by the backend; tests must not assert a fixed PIN value.
- Cancellation computes the policy-based refund amount but does not have a provider-confirmed refund operation in the current service. Refund records are now marked `PENDING` and no synthetic provider transaction ID or `REFUND_PROCESSED` ledger entry is created before provider confirmation. A provider-backed refund workflow and durable refund persistence remain required before production acceptance.
- Check-out now rejects bookings that are not in `ACTIVE` state (idempotent repeat checkout of `COMPLETED` bookings remains supported).
- Password change no longer accepts the shared `DriverPass123!` string as a credential-verification bypass. Accounts without stored credentials receive `CREDENTIALS_NOT_CONFIGURED` instead of silently bypassing verification.
- The current booking, vehicle, user credential, and notification-preference services still contain in-memory stores. The PostgreSQL schema and connection manager exist, but these services have not been fully converted to durable database-backed repositories in this source update. Persistence across restarts is therefore NOT verified.
- Check-in/check-out/extension, notifications, payment provider webhooks, refund execution, access-pass expiry, and production concurrency behavior require further integration tests and configured external services.
- Verification status for this archive must be based on actual local execution of `npm run lint`, `npm test`, and `npm run build`; do not infer pass status from the prior AI Studio report.
