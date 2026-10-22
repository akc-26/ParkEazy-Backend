# ParkEazy User Website Point 01 — Correction Handoff

## Source baseline
- Source used: uploaded `parkeazy-07-GRV1.zip` (workspace extracted as `GRV1-audit`).
- Reported baseline branch: `feature/part-02-tooling-verification-fixes`.
- Reported baseline commit: `d1f53ec02844ed5d272fbddabb5f776d03a1bcfd`.
- The extracted workspace had no Git metadata; no commit or push is claimed.

## Corrections applied

### Payment and booking integrity
- Replaced the fabricated payment-success page with a truthful verification-required state because live payment-provider integration is deferred.
- Removed the invented transaction reference and simulated progress completion from the payment-processing page.
- Removed the default fabricated pending transaction reference.
- Removed fabricated booking reference, bay, gate PIN, QR token, vehicle, dates, and amount fallbacks from the booking-confirmation page. It now requires a real server response and a confirmed/active booking state.
- Removed hardcoded gate PIN/facility/bay defaults from backend booking enrichment and pass output.
- Added fail-closed states to active-session, upcoming-booking, and cancellation pages when authoritative booking details are unavailable or the booking state does not match the page.
- Prevented the upcoming-booking vehicle plate edit from claiming a local-only update succeeded when no booking-update API exists.

### Authentication and account data
- Added a customer private-route UX guard in the User Website. Backend authentication/authorization remains authoritative.
- Added authenticated `PUT /api/v1/users/profile` handling with validation and persistence through the existing AuthService/database.
- Added migration `009_customer_profile_details.sql` for emergency contact and billing fields.
- Updated the API client and profile editor to use the server-backed profile endpoint and update cached profile data only after success.

### Vehicles and favourites
- Added `PUT /api/v1/users/me/vehicles/:id` and API-client support for vehicle edits.
- Added edit mode and navigation from the vehicle list.
- Removed the arbitrary fallback vehicle returned for users without saved vehicles.
- Changed vehicle reads/deletes to fail honestly on persistence failures or missing owned records rather than silently falling back to demo data or reporting false deletion success.
- Changed favourites reads/toggles to use the existing PostgreSQL `user_favorites` table when the database is available, and removed default fake favourites for unknown users.
- Updated saved places and profile overview to use the actual favourites API rather than the first catalogue results.

### Other account operations
- Removed fake success behaviour from notification-preference save, password-change/session-revocation, and privacy export/account-closure actions. These screens now state that the corresponding server-backed operation is unavailable instead of claiming it succeeded or generating fabricated export data.
- Removed fabricated sample sessions and security activity entries from the security screen.

## Files changed
- `apps/website/src/App.tsx`
- `apps/website/src/pages/PaymentSuccessfulPage.tsx`
- `apps/website/src/pages/PaymentProcessingPage.tsx`
- `apps/website/src/pages/PaymentPendingStatusPage.tsx`
- `apps/website/src/pages/BookingConfirmedPage.tsx`
- `apps/website/src/pages/ActiveParkingSessionPage.tsx`
- `apps/website/src/pages/UpcomingBookingDetailsPage.tsx`
- `apps/website/src/pages/BookingCancelledPage.tsx`
- `apps/website/src/pages/EditPersonalDetailsPage.tsx`
- `apps/website/src/pages/AddEditVehiclePage.tsx`
- `apps/website/src/pages/MyVehiclesPage.tsx`
- `apps/website/src/pages/SavedPlacesFavoritesPage.tsx`
- `apps/website/src/pages/UserProfileOverviewPage.tsx`
- `apps/website/src/pages/NotificationPreferencesPage.tsx`
- `apps/website/src/pages/AccountSecuritySessionsPage.tsx`
- `apps/website/src/pages/PrivacyConsentsClosurePage.tsx`
- `packages/api-client/src/client.ts`
- `packages/shared-types/src/user.ts`
- `services/api/src/modules/users/users.controller.ts`
- `services/api/src/modules/users/users.service.ts`
- `services/api/src/modules/auth/auth.service.ts`
- `services/api/src/modules/bookings/bookings.service.ts`
- `services/api/src/database/migrations/009_customer_profile_details.sql`

## Verification status and limitations
- Static scan confirmed the known fabricated payment/booking references are absent from the corrected target pages.
- Global TypeScript parser reported no syntax diagnostics for the changed files. This was a syntax-oriented check, not a full type-check.
- `npm run typecheck` failed before compilation with `TS2688: Cannot find type definition file for 'vite/client'` because the extracted dependency tree was incomplete.
- `npm ci` could not complete in the available environment. An offline retry failed with `ENOTCACHED` for `xtend@4.0.2`; therefore the full test suite, Vite builds, and browser end-to-end tests have **not** been verified.
- No PostgreSQL instance was available for migration execution or database integration tests. Migration `009_customer_profile_details.sql` must be applied before deploying code that selects the new columns.
- Payment-provider integration remains intentionally deferred; payment success is not simulated.
- Password change, live session inventory/revocation, notification-preference persistence, data export, and account closure are explicitly fail-closed in the UI, not complete server-backed features. They must not be described as implemented until their backend workflows are added and tested.
- This handoff does not claim every one of the 54 screens has been individually browser-verified or that Point 01 passes final acceptance.

## Required local verification
1. Extract the archive into a new working directory without overwriting the original source.
2. Run `npm ci` with registry access.
3. Apply pending database migrations using the project's documented migration process, including `009_customer_profile_details.sql`.
4. Run `npm run typecheck`, `npm test`, and `npm run build:all`; fix any reported errors before deployment.
5. Exercise payment failure/unverified cases, booking-confirmation failure, profile persistence, vehicle edit, favourites persistence, and private-route access against a running backend.


## Follow-up audit correction — 2026-10-13

This follow-up re-inspected the actual supplied `parkeazy-phase-1-consolidated-source(1).zip` rather than relying on prior completion claims. Several unsupported fallbacks and simulated successes remained in that source. The updated source pass corrected search fallbacks, local-time booking calculations, stale pricing state, route ID fallbacks, sample gate PINs/facility details, OTP challenge handling, payment status/reconciliation, receipt export and other account/session states.

**Point 01 remains NOT ACCEPTED.** The approved design archive is not contained in the supplied source ZIP and could not be read as raw bytes in the editing workspace. `npm ci --offline --ignore-scripts` also fails with `ENOTCACHED` for `xtend@4.0.2`; typecheck, tests, builds and browser screenshot comparison remain unverified. See `POINT-01-IMPLEMENTATION-AUDIT-2026-10-13.md` and `DESIGN-SCREEN-TRACEABILITY.csv` for the current status.
