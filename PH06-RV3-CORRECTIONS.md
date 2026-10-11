# ParkEazy PH06 RV3 — Corrections Applied

This archive is based on the user-uploaded `parkeazy-06-RV3.zip`. Existing application structure and routes were retained.

## Changes

- Declared `@parkeazy/validation` as a direct dependency of `@parkeazy/api` and synchronized the workspace lockfile entry.
- Added an explicit public package export for `@parkeazy/validation`; the public barrel already exports `validateLoginPayload` and `validateSignupPayload`.
- Loaded `.env` at API startup with `dotenv/config` so local environment configuration is applied before NestJS modules initialize.
- Added a test that checks the validation package's public exports and confirms empty login payloads remain rejected.
- Added PostgreSQL-backed inventory reads for PH06 search, suggestions, explore cards, fallback suggestions, host facility/space CRUD, and public listing reads when the database is connected.
- Added migration `004_ph06_search_persistence.sql` for the `operating_model` and space `status` fields needed by the PH06 persistence queries.
- Corrected migration 003's search index to avoid referencing `parking_spaces.status` before migration 004 adds that column.
- Removed hardcoded Chennai hub catalogs from search discovery. Suggestions, explore cards, and fallback alternatives are now derived from the tenant's published inventory.
- Removed fabricated ratings, review counts, default photos, and instant-booking claims from search result construction.
- Made in-memory facilities/space seed records opt-in demo/test fixtures only. Outside test mode, set `PARKEAZY_DEMO_MODE=true` explicitly to use demo records; otherwise listing/search operations require a reachable PostgreSQL connection and fail clearly when unavailable.
- Added local API/database/demo-mode instructions to README and `.env.example`.
- Updated search tests for inventory-backed asynchronous suggestions and discovery responses.

## Important verification status

Source syntax transpilation and JSON parsing were checked in the available build environment. A full `npm ci`, TypeScript typecheck, Vitest run, NestJS startup, PostgreSQL migration run, and browser registration test could not be executed here because dependency installation did not complete in this environment and no configured PostgreSQL server was available. These are not claimed as passing. Run the commands in README on the target Windows machine before accepting the phase.

## Local run

1. From the extracted repository root, run `npm ci`.
2. Copy `.env.example` to `.env` and set the actual PostgreSQL connection values if using persistent inventory.
3. For PostgreSQL: run `npm run db:migrate`, then optionally `npm run db:seed` for clearly identified starter records.
4. In one PowerShell window, run `npm run dev:api` and keep it open.
5. In another window, run the required frontend command from `package.json`.
6. Run `npm run typecheck`, `npm run test`, and `npm run build:api` and review the actual outputs.

Do not use the demo mode as evidence of persistent inventory or production readiness.

## Follow-up correction from Windows RV4 verification logs

- Corrected `FacilitiesService.mapSpaceRow()` so its status value conforms to the shared `SpaceStatus` union; `inactive` is represented by the existing `isActive: false` field rather than an unsupported status literal. Unknown persisted status values are normalized conservatively to the supported default while the independent `isActive` flag is retained.
- Added type-safe mapping for `allowedVehicleCategories` and `fuelCompatibility`, filtering persisted string arrays against the shared `VEHICLE_TYPES` and `FUEL_COMPATIBILITIES` constants. Invalid primary vehicle categories now fail explicitly instead of being silently reclassified.
- The supplied Windows log reported 125 tests passing and website, host, and admin production builds passing. It reported `typecheck` and `build:api` failing on these three type errors. Those fixes are applied in this source tree. This environment could not complete a dependency installation, so the updated typecheck/API build could not be independently rerun here.
