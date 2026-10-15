# ParkEazy Point 01 — User Website Delivery Notes

**Date:** 2026-10-13  
**Scope:** Point 01 — User Website only. No Host Portal, Admin, mobile app, or backend/API contract changes.

## Corrections included in this delivery

1. Applied the eight-file TypeScript correction pass based on the 20 diagnostics in the supplied Windows PowerShell log:
   - Guarded optional booking dates before building URLs or constructing `Date` values.
   - Corrected the pre-booking recovery support path so it does not invent a booking ID.
   - Added safe fallback display labels for optional category/payment method values.
   - Removed an unsupported extension payable amount where the existing API provides no verified extension quote.
   - Corrected the saved-facility status comparison to use `published`.
2. Fixed the private-route login return flow: the guard emits `returnTo`; the login route now reads and validates that parameter before accepting the return destination.
3. Connected the location-permission screen to the browser Geolocation API. On consent, the returned latitude/longitude are passed through the existing search query contract; permission denial, timeout and unavailable-location errors are surfaced.
4. Preserved location coordinates and the selected vehicle when switching between split, list and map search views. Coordinates are no longer silently replaced by the list/map page's default text search.
5. Improved the fullscreen map behavior:
   - Pins are positioned from returned facility coordinates rather than arbitrary fixed pin positions.
   - The view explicitly identifies its road background as schematic/illustrative, not a street map.
   - Search failures, retry, loading and no-results states are visible instead of silently swallowing API errors.
   - Missing facility photos use a neutral parking placeholder.
6. Removed unsupported claims from pre-booking recovery and support flows, including instant re-locking, guaranteed push alerts, fabricated photo attachment, guaranteed supervisor response/replacement bays, and a fixed support SLA. Support requests require a real booking ID and the current ticket API response.
7. Corrected the cancellation message so a calculated refund amount is not described as already processed; the existing booking service records that payment refund processing is outside its workflow.
8. Reworded several static discovery labels that claimed live inventory, live availability guarantees or a fixed number of hubs without runtime evidence.
9. Normalized the User Website-only semantic CSS tokens and legacy page color literals to the project-approved palette: emerald `#0F766E`, mint `#14B8A6`, deep ink `#101828`, slate `#344054`, muted slate `#667085`, pale emerald `#E6F7F4`, soft surface `#F8FAFC`, white `#FFFFFF`, border `#E4E7EC`, and restrained gold `#D6A84F`. Host/Admin/shared packages were left untouched. The existing Inter body / Plus Jakarta Sans heading split was retained because the design correction register leaves universal font usage as a pending decision.

## Source and API preservation

- Changes are limited to existing User Website components, route wiring and this documentation.
- No backend controller, service, migration, DTO, API endpoint, credentials, provider configuration, or third-party integration was added or changed in this pass.
- No Git reset, re-clone, branch switch, commit or push was performed.
- `node_modules` is not included in the source archive.

## Verification status

| Check | Result |
|---|---|
| User Website design inventory | **PASS — 54/54 screen IDs map to page components.** This is component/route inventory only. |
| TypeScript/TSX syntax transpilation | **PASS — 194 files, 0 syntax diagnostics.** This is not a semantic typecheck. |
| `npm run typecheck` in this workspace | **BLOCKED** — required `vite/client` type definitions are unavailable because dependency installation did not complete. The eight fixes were applied from the user's earlier PowerShell diagnostics, but semantic typecheck was not rerun successfully here. |
| `npm test` in this workspace | **BLOCKED** — `vitest` executable is unavailable. The user's earlier log reported 156 tests passing before this latest source pass; that result does not verify this final package. |
| `npm run build:all` in this workspace | **BLOCKED** — `vite` executable is unavailable. The user's earlier log reported website/host/admin builds passing but did not confirm the full API build. |
| Browser navigation and interaction tests | **NOT RUN** — the website could not be built/launched in this workspace. |
| Exact comparison with all 54 approved visual references | **NOT COMPLETED** — the approved `ParkEazy_Web_UI_Design-01.zip` is present in the Project Library, but its raw bytes cannot be materialized/read in this workspace. The uploaded source archive itself contains no `screen.png` or `code.html` reference assets. |

## Acceptance

**Point 01 is still not accepted as design-complete.** The source corrections above are included, but I cannot truthfully claim that all 54 screens match the approved designs pixel-for-pixel or that all browser interactions/builds pass. The screen traceability CSV deliberately retains `NOT ACCEPTED` for all rows until reference-by-reference visual comparison and runtime verification are possible.

## Local verification commands (Windows PowerShell)

Run from the extracted project root, with npm registry access available:

```powershell
npm ci
npm run typecheck
npm test
npm run build:all
npm run dev:same-origin
```

Then test the location-permission path and verify the same coordinates and vehicle selection persist when switching split/list/map views. Complete the remaining 54-screen visual comparison and interaction review against the approved design archive before treating Point 01 as finished.
