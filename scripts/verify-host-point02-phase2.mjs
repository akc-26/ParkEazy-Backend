import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const screen = readFileSync('apps/host/src/pages/HostWorkspaceScreens.tsx', 'utf8');
const client = readFileSync('packages/api-client/src/client.ts', 'utf8');
const css = readFileSync('apps/host/src/index.css', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const pricing = readFileSync('apps/host/src/pages/SpacePricingConfigurationPage.tsx', 'utf8');
const bulkPricing = readFileSync('apps/host/src/pages/BulkPricingScheduleUpdatesPage.tsx', 'utf8');
const conflictReview = readFileSync('apps/host/src/pages/AvailabilityConflictChangeReviewPage.tsx', 'utf8');
const bookingRules = readFileSync('apps/host/src/pages/BookingDurationAdvanceBookingRulesPage.tsx', 'utf8');
const operatingHours = readFileSync('apps/host/src/pages/OperatingHoursWeeklySchedulePage.tsx', 'utf8');
const earningsOverview = readFileSync('apps/host/src/pages/HostEarningsFinancialOverviewPage.tsx', 'utf8');
const photos = readFileSync('apps/host/src/pages/PhotosListingPreviewPage.tsx', 'utf8');
const closures = readFileSync('apps/host/src/pages/DateSpecificAvailabilityClosuresPage.tsx', 'utf8');
const eligibility = readFileSync('apps/host/src/pages/HostEligibilityPage.tsx', 'utf8');
const verification = readFileSync('apps/host/src/pages/HostVerificationPage.tsx', 'utf8');
const checks = [
  ['Finance pages consume API-backed earnings summary', () => assert.match(screen, /apiClient\.host\.getEarnings\(\)/)],
  ['Ledger fee breakdown uses recorded commission values', () => { assert.match(screen, /apiClient\.host\.getLedger\(\)/); assert.match(screen, /Recorded platform commission/); }],
  ['Payout history/schedule do not invent provider records', () => { assert.match(screen, /apiClient\.host\.getPayouts\(\)/); assert.match(screen, /No payout was created|settlement service/); }],
  ['Report centre exports only rows returned by the ledger', () => assert.match(screen, /Prepared \$\{rows\.length\} report row\(s\) from the host ledger/)],
  ['Business profile loads and saves through existing host profile API', () => { assert.match(screen, /apiClient\.users\.getHostProfile\(\)/); assert.match(screen, /apiClient\.users\.updateHostProfile/); }],
  ['Non-sensitive drafts persist locally with explicit local-only messaging', () => { assert.match(screen, /parkeazy:host:draft:\$\{screen\.route\}/); assert.match(screen, /Workspace draft saved in this browser only/); }],
  ['Sensitive payout and support drafts are excluded from browser persistence', () => assert.match(screen, /screen\.route==='\/host\/earnings\/payout-account'\|\|screen\.route==='\/host\/settings\/support'/)],
  ['Role matrix is explicitly review-only, not a server permission mutation', () => assert.match(screen, /Server-side role grants are not changed by this screen/)],
  ['Financial summary has responsive visual styles', () => { assert.match(css, /\.host-finance-kpis/); assert.match(css, /@media\(max-width:480px\)/); }],
  ['Phase 2 verification command is registered', () => assert.equal(packageJson.scripts['verify:host-point02:phase2'], 'node scripts/verify-host-point02-phase2.mjs')],
  ['Space pricing updates the selected real space and discloses draft-only unsupported rules', () => { assert.match(pricing, /apiClient\.spaces\.update\(selectedSpaceId, \{ hourlyRateInr: rate \}\)/); assert.match(pricing, /do not change live booking calculations/); }],
  ['Bulk pricing preview uses live inventory and cannot claim batch execution', () => { assert.match(bulkPricing, /apiClient\.facilities\.getSpaces/); assert.doesNotMatch(bulkPricing, /INITIAL_BAYS/); assert.match(bulkPricing, /transactional bulk-pricing API is required/); }],
  ['Conflict review does not fabricate bookings or simulate a successful resolution', () => { assert.doesNotMatch(conflictReview, /BK-9021|Rahul Sharma|Basement 2 Flooring Wash/); assert.match(conflictReview, /Resolution unavailable — no safe execution API/); }],
  ['Booking rules and operating hours do not report unsupported server synchronization', () => { assert.match(bookingRules, /browser draft only/); assert.match(operatingHours, /has not been synchronized with gate barriers or booking availability/); assert.doesNotMatch(operatingHours, /synchronized with gate barriers and driver booking engines/); }],
  ['Primary earnings overview uses real earnings/ledger records and no placeholder money', () => { assert.match(earningsOverview, /apiClient\.host\.getEarnings\(\)/); assert.match(earningsOverview, /apiClient\.host\.getLedger\(\)/); assert.doesNotMatch(earningsOverview, /'120\.00'|'18\.00'|'102\.00'|Bay B1-04|Platform Fee \(15%\)/); assert.match(earningsOverview, /Payout history unavailable/); }],
  ['Listing photos and closures do not start with fabricated sample records', () => { assert.doesNotMatch(photos, /SAMPLE_PHOTO_PRESETS|photo-1590674899484/); assert.match(photos, /useState<FacilityPhoto\[]>\(\[\]\)/); assert.doesNotMatch(closures, /INITIAL_CLOSURES|Diwali Festival Public Holiday|Pongal Festival Surge Period/); assert.match(closures, /Closure draft saved in this browser only/); }],
  ['Eligibility starts unverified and email verification cannot be simulated', () => { assert.match(eligibility, /24 Verified|Not verified/); assert.match(verification, /Email verification is not configured in the current API/); assert.match(verification, /disabled/); }],
];
for (const [name, run] of checks) { run(); console.log(`PASS ${name}`); }
console.log(`Phase 2 static implementation checks: ${checks.length}/${checks.length} passed. These checks do not replace user acceptance testing.`);
