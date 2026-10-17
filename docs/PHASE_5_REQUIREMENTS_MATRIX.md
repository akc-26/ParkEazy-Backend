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
| **REQ-SH-01** | **Shared Application Shell** | All User routes | Top bar (3-zone: Brand wordmark, 4-5 nav links: Search Spaces, How It Works, Host Portal, My Bookings, 1 CTA: Sign In / Profile dropdown), Breadcrumbs, Toast Notifications, Footer | Anti-slop 3-zone contract; unboxed metadata; responsive mobile navigation drawer; single-line controls | `GET /api/v1/auth/session` | Public / Contextual (shows User menu if logged in) | Loading, Authenticated, Unauthenticated | READY |
| **REQ-HP-01** | **Homepage** | `/` | Hero section with direct search bar (Location/City, Date & Time, Duration), Architecture & Invariants Bento (10-min hold, physical bay identity, escrow ledger), Featured Inventory grid (`/api/v1/inventory/locations`), Host Portal conversion banner, Trust & Protection footer | Search validation (minimum 1h, 30m increments, 15m lead time); click initiates search navigation | `GET /api/v1/inventory/locations` | Public | Loading skeleton, Empty, Error retry, Populated | READY |
| **REQ-SR-01** | **Search & Results** | `/search` | Search refinement bar (City, Date, Duration), Filter drawer/sidebar (EV Charging only, Covered parking, Max Hourly Rate, Bay Type), Sort selector (Price: Low to High, High to Low, Rating), Results grid of Location Cards, Active filter chips, Result count | Client & query sync; preserve parameters on navigation; filter by amenities (`EV Charging`, `Covered Garage`, etc.) | `GET /api/v1/inventory/locations` | Public | Loading pulse, Empty matches with clear-filters CTA, Populated list | TO IMPLEMENT |
| **REQ-PD-01** | **Parking-Space Details** | `/spaces/:id` | Photo gallery with verified images, Location header & address, Bay availability list (discrete physical bays with level/bayNumber/EV spec), Amenities tags (clean text with bullet separators), Access instructions & security policy, Sticky Purchase/Hold Module with real-time rate calculator | Distinct Location vs Bay entities; 1-72h bounds; 30m steps; selected bay validation; triggers 10-minute hold lock | `GET /api/v1/inventory/locations/:id`, `GET /api/v1/inventory/locations/:id/bays`, `POST /api/v1/bookings/hold` | Public (Hold requires or generates guest/customer session) | Loading skeleton, Not Found (404), Active Bay selection, Hold timer countdown | TO IMPLEMENT |
| **REQ-AU-01** | **Customer Authentication** | `/login`, `/register`, Auth Modal | Tabbed Login/Register interface, Email input with regex validation, Password input (min 8 chars), Demo Driver 1-click autofill (`driver@parkeazy.com`), Sign In button with spinner, Error callout for bad credentials | Token storage in `apiClient` & `localStorage`; JWT HMAC verification; redirect back to intended route | `POST /api/v1/auth/login`, `GET /api/v1/auth/session` | Public | Idle, Submitting/Loading, Error banner, Success transition | TO IMPLEMENT |
| **REQ-BR-01** | **Booking Review** | `/booking/review` | Reservation summary card, Selected Location & Physical Bay badge, Date & Time breakdown, Authoritative Quote Snapshot (Base price, Security deposit, Platform fee 15%, Taxes 10%, Total payable), Cancellation policy tier details, Vehicle license plate input | Persistent 10-minute hold countdown; cannot proceed if hold expires; license plate required (alphanumeric 3-10 chars) | `POST /api/v1/bookings/hold` (or reuse active hold), `GET /api/v1/bookings/rules` | Authenticated (prompts auth if guest) | Active hold timer, Expired hold warning with re-hold CTA, Invalid plate error | TO IMPLEMENT |
| **REQ-CO-01** | **Checkout & Payment** | `/checkout` | Order breakdown column, Escrow Security Deposit notice, Payment Provider Selector (Mock Payment Sandbox / Stripe / Razorpay), Cardholder Name, Card Number, Expiry, CVC, Idempotency key generation, "Pay & Confirm Reservation" CTA | Double-entry ledger compliance; server-side payment intent; no secret exposure; handles pending/failed/success | `POST /api/v1/payments/intent`, `POST /api/v1/bookings` | Authenticated (Customer) | Processing spinner, Payment declined with retry, Network failure, Confirmed | TO IMPLEMENT |
| **REQ-BC-01** | **Booking Confirmation** | `/booking/confirmation/:id` | Success checkmark banner, Authoritative Booking Reference (`bk-2026-xxxx`), Location map/address card, Assigned Bay details, Access Pass with PIN / Gate code instructions, Download / Print receipt action, "View in My Bookings" CTA | Displays only on authoritative server confirmation; idempotent on browser refresh; no duplicate charges | `GET /api/v1/bookings` (filtered by ID) | Authenticated (Customer) | Loaded receipt, Print view trigger, Direct navigation links | TO IMPLEMENT |
| **REQ-UB-01** | **User Bookings Management** | `/bookings` | Status Filter Tabs (`All`, `Active`, `Upcoming`, `Completed`, `Cancelled`), Booking Card list with bay number, dates, total paid, and status badge, View Access Instructions action, Cancel Booking action (with cancellation tier policy check) | Status transitions strictly server-governed; cancellation refund rules enforced; overstay warning notice | `GET /api/v1/bookings` (user-scoped) | Authenticated (Customer) | Loading skeleton, Empty bookings state with "Find Parking" CTA, Populated list | TO IMPLEMENT |
| **REQ-PR-01** | **Profile & Account Settings** | `/profile` | Driver profile overview, Name and contact fields, Registered vehicles list (Plate, Make, Model), Security & Password update tab, Notification preferences, Sign Out button | Form validation for name and phone; updates stored in user session | `GET /api/v1/auth/session` | Authenticated (Customer) | View mode, Edit mode, Saved toast feedback | TO IMPLEMENT |

---

## 3. Implementation Order & Milestone Map

1. **Milestone 0: Baseline Verification** (COMPLETED)
   - Verified Git HEAD `8a7ad83edf47f7131c61724188d59aee34387924`.
   - Verified 61/61 backend baseline tests passing.
   - Preserved `Baseline-Confirmation` branch; checked out working branch `Phase5-User-Website`.

2. **Milestone 1: Requirements Matrix & Dependencies** (COMPLETED)
   - Created `docs/PHASE_5_REQUIREMENTS_MATRIX.md`.
   - Mapped all 10 screen groups to contracts and endpoints.

3. **Milestone 2: Shared User Website Shell & Router Integration**
   - Enhance root routing in `src/App.tsx` to mount `UserWebsiteApp` for all consumer paths (`/`, `/search`, `/spaces/:id`, `/login`, `/register`, `/booking/review`, `/checkout`, `/booking/confirmation/:id`, `/bookings`, `/profile`).
   - Standardize `UserHeader` with anti-slop 3-zone contract, mobile drawer, active user state, and navigation hooks.
   - Establish Toast / Notification context for checkout and booking alerts.

4. **Milestone 3: Discovery Screens (Homepage & Search/Results)**
   - Wire Homepage search bar to pass query state to `/search`.
   - Build `/search` with real-time filters (price slider, EV charging toggle, covered toggle, date/time picker, sorting).
   - Implement `/spaces/:id` Parking Space Details screen with bay selection, image gallery, amenities list, and sticky booking card.

5. **Milestone 4: Authentication Flows**
   - Deliver dedicated `/login` and `/register` views alongside the modal flow.
   - Demo 1-click driver login (`driver@parkeazy.com`) with instant token injection and session preservation.

6. **Milestone 5: Booking Review, Checkout & Confirmation Journey**
   - Implement `/booking/review` with live 10-minute hold countdown, discrete bay details, price breakdown, and license plate input.
   - Implement `/checkout` with payment intent integration (`/api/v1/payments/intent`), mock/live gateway selector, escrow deposit breakdown, and idempotency protection.
   - Implement `/booking/confirmation/:id` with access code instructions, QR pass preview, and receipt details.

7. **Milestone 6: User Bookings & Account Management**
   - Implement `/bookings` with Active, Upcoming, and Completed filters, access pass details, and policy-compliant cancellation.
   - Implement `/profile` with vehicle management and preferences.

8. **Milestone 7: Regression, Verification & Acceptance Report**
   - Execute test suite (`npm test`).
   - Run typecheck (`npm run lint`).
   - Verify all screens on mobile, tablet, and desktop viewports.
   - Produce final acceptance report with Git checkpoint on `Phase5-User-Website`.
