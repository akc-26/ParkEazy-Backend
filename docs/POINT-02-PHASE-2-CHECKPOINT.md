# ParkEazy Point 02 — Phase 2 implementation checkpoint

**Checkpoint:** 13 October 2026
**Working source:** `parkeazy-point02-phase-work/parkeazy-point02-baseline` (separate working copy; preserves uploaded source)

## Phase 2 implementation added in this pass

- Finance pages now show an API-backed earnings overview: gross earnings, recorded platform fees, net before payout, and pending balance. UI copy distinguishes pending balance from a confirmed payout.
- Fee breakdown now reads per-booking commission values from the existing host ledger. It does not invent a future fee schedule or commission percentage.
- Report Centre prepares exportable report rows from actual host-ledger records; CSV export remains limited to loaded/filtered rows.
- Payout history and payout schedule read from the existing settlement API. If that API is unavailable because no persistent payout provider is configured, the UI shows the service error rather than fabricated payout references or dates.
- Financial exception candidates are derived from ledger and payout data returned by services.
- Business Profile now loads the saved host profile through the existing API, and persists only business name and PAN/tax ID through the supported update API. Billing address and business email are clearly described as draft-only unless the backend contract supports them.
- Non-sensitive workspace drafts can be saved in browser storage and restored per route. Payout-account details and support messages are intentionally excluded from browser storage. All local-only behavior is labeled as such.
- Added required/max-length validation for critical fields including booking reference, vehicle plate, business name, team email, support message, and payout form fields.
- Roles & Permissions renders a proposed access matrix with explicit review-only messaging; it does not claim to grant server permissions.
- Added responsive financial summary styles and a separate Phase 2 static verification script.
- Corrected the host navigation group setter to explicitly accept a string, preventing the previously reported literal-union TypeScript error in that handler.
- Added an explicit, confirmation-guarded payout request action wired to the existing `/host/payouts/request` API. Success messaging distinguishes an accepted payout request from an actual bank transfer.
- Connected Facility Preferences to the existing facilities list API and added a live inventory table. Preference fields remain clearly draft-only because the backend does not expose those controls as persisted facility settings.

## Static checks

- `node scripts/verify-host-point02.mjs`: PASS.
- `node scripts/verify-host-point02-phase1.mjs`: PASS, 10/10 static groups.
- `node scripts/verify-host-point02-phase2.mjs`: PASS, 17/17 static groups.
- `node scripts/verify-design-inventory.mjs`: PASS, 54/54 User Website screen components mapped; inventory check only.
- TypeScript/TSX syntax transpilation: 196 files, zero syntax errors.

## Scope boundaries retained

- No payout provider, bank-account verification provider, email delivery service, notification delivery provider, or live session-management API has been invented or simulated.
- Team invitations, workspace settings, notification preferences, and support submission still need backend endpoints/provider integration before they can be represented as server-persisted operations.
- The proposed role matrix is informational only; it does not override API authorization.

## Not yet user-accepted

This checkpoint records implementation progress, not final acceptance. The user will perform functional/browser acceptance after the implementation is delivered. Before final consolidated delivery, continue through the remaining Phase 1 and Phase 2 screen inventory, inspect each existing host page and interaction, update traceability, and package both phases together only when implementation work is finished. No claim of complete visual parity is made without the approved reference screens being available for direct comparison.

## Additional consistency pass

- The main Host Earnings overview now consumes host-scoped earnings and ledger APIs rather than withholding all records or rendering sample transaction values. Payout API failure is isolated and surfaced without blocking valid earnings/ledger data; the page no longer assumes a fixed 15% fee.
- The tariff configuration page loads real host spaces and saves the selected space's base hourly rate through the existing API. Unsupported caps and peak multipliers remain explicitly browser-draft-only.
- Bulk pricing previews are now built from loaded host inventory instead of a hardcoded six-bay fixture. Applying the preview saves a local draft only; it does not claim transactional batch execution.
- The conflict review screen no longer invents a booking, driver, maintenance event, or successful reassignment. It loads host booking count and disables execution until a safe closure-overlap/resolution API exists.
- Booking-duration rules and weekly operating hours now save/restore browser drafts and no longer claim live booking or gate synchronization.
- The Host Booking Operations overview now uses the host-scoped bookings, occupancy, check-in, and check-out APIs; the extension action routes to the host extension-request queue instead of directly adding an hour.
- Removed stock facility-photo presets and seeded historical closure events. Photo screens start from the facility's saved photos; closure entries remain local drafts and explicitly do not change live search or confirmed bookings.
- Eligibility starts unchecked/unverified. Email verification no longer simulates success, and application status no longer claims a fabricated score, review ETA, legal verification, or gate telemetry test.
- Inventory-matrix error states are inline rather than browser alerts; bay creation validates the hourly rate.
