import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const hostScreen = read('apps/host/src/pages/HostWorkspaceScreens.tsx');
const hostController = read('services/api/src/modules/host/host.controller.ts');
const hostService = read('services/api/src/modules/host/host.service.ts');
const bookingsController = read('services/api/src/modules/bookings/bookings.controller.ts');
const bookingsService = read('services/api/src/modules/bookings/bookings.service.ts');
const apiClient = read('packages/api-client/src/client.ts');
const migration = read('services/api/src/database/migrations/010_booking_extension_requests.sql');
const inventory = read('docs/POINT-02-HOST-SCREEN-INVENTORY.csv');
const packageJson = JSON.parse(read('package.json'));

const checks = [];
const check = (label, fn) => { fn(); checks.push(label); };

check('Host API authentication and role boundary', () => {
  assert.match(hostController, /@UseGuards\(JwtAuthGuard, TenantGuard, RolesGuard\)/);
  assert.match(hostController, /@Roles\('host', 'superadmin'\)/);
});
check('Host booking reads are scoped to host-owned facility IDs', () => {
  assert.match(hostService, /getBookingsByFacilityIds\(facilityIds, tenantId\)/);
  assert.doesNotMatch(hostService, /\|\|\s*true/);
});
check('Check-in/out have host-scoped endpoints and status guards', () => {
  assert.match(hostController, /@Post\('bookings\/:id\/check-in'\)/);
  assert.match(hostController, /@Post\('bookings\/:id\/check-out'\)/);
  assert.match(hostService, /booking\.status !== 'confirmed'/);
  assert.match(hostService, /booking\.status !== 'active'/);
  assert.match(hostScreen, /apiClient\.host\.checkIn\(booking\.id\)/);
  assert.match(hostScreen, /apiClient\.host\.checkOut\(booking\.id\)/);
});
check('Extension request schema and persistent API are wired end-to-end', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS booking_extension_requests/);
  assert.match(bookingsController, /@Post\(':id\/extension-requests'\)/);
  assert.match(hostController, /@Get\('extension-requests'\)/);
  assert.match(hostController, /@Post\('extension-requests\/:id\/decision'\)/);
  assert.match(apiClient, /getExtensionRequests: async/);
  assert.match(apiClient, /decideExtensionRequest: async/);
  assert.match(hostScreen, /apiClient\.host\.getExtensionRequests\(\)/);
  assert.match(hostScreen, /apiClient\.host\.decideExtensionRequest\(requestId,decision\)/);
  assert.match(hostScreen, /onClick=\{\(\)=>void decideExtension\(row\['__requestId'\],'approve'\)\}/);
  assert.match(hostScreen, /onClick=\{\(\)=>void decideExtension\(row\['__requestId'\],'reject'\)\}/);
});
check('Extension decisions validate ownership, status, duration, pricing and conflicts', () => {
  assert.match(bookingsService, /row\.host_id !== hostId/);
  assert.match(bookingsService, /row\.status !== 'pending'/);
  assert.match(bookingsService, /booking end time changed after this extension request was submitted/);
  assert.match(bookingsService, /total continuous booking duration cannot exceed 72 hours/);
  assert.match(bookingsService, /another confirmed booking conflicts with the requested extension and turnaround buffer/);
  assert.match(bookingsService, /SELECT hourly_rate_inr FROM parking_spaces WHERE id=\$1 AND facility_id=\$2 FOR UPDATE/);
  const decisionBody = bookingsService.slice(bookingsService.indexOf('public async decideExtensionRequest'));
  assert.ok(decisionBody.indexOf('SELECT hourly_rate_inr FROM parking_spaces WHERE id=$1 AND facility_id=$2 FOR UPDATE') < decisionBody.indexOf('const conflicts = await client.query'), 'space row must be locked before conflict detection');
  assert.match(bookingsService, /FOR UPDATE OF r,b/);
  assert.match(bookingsService, /BOOKING_EXTENSION_APPROVED/);
  assert.match(bookingsService, /BOOKING_EXTENSION_REJECTED/);
});
check('Business profile persistence is not mislabeled as local-only draft data', () => {
  assert.match(hostScreen, /Business name and tax ID use the existing host profile API/);
  assert.ok(hostScreen.includes('Billing address and business email remain local drafts unless the API returns/persists them'));
  assert.match(hostScreen, /screen\.route===\'\/host\/settings\/business\'\?\'Partial API\':\'Draft mode\'/);
});
check('No fabricated payout success or demo money', () => {
  assert.match(hostService, /persistent settlement provider has not been configured/);
  assert.match(hostService, /No payout was created or marked as paid/);
  assert.doesNotMatch(hostService, /Math\.random\(\)|HDFC/);
});
check('Production API build carries SQL migrations into the runtime output', () => {
  assert.match(packageJson.scripts['build:api'], /services\/api\/src\/database\/migrations/);
  assert.match(packageJson.scripts['build:api'], /services\/api\/dist\/database\/migrations/);
});
check('Operational screen inventory remains complete', () => {
  const rows = inventory.trim().split(/\r?\n/).length - 1;
  assert.equal(rows, 57);
  const configs = [...hostScreen.matchAll(/\{id:'(pe_(?:hw|hp)_[^']+)'/g)].map((m) => m[1]);
  assert.equal(configs.length, 26);
  assert.equal(new Set(configs).size, 26);
});
check('Route loaders guard against stale updates after navigation', () => {
  assert.match(hostScreen, /let active=true;/);
  assert.match(hostScreen, /void loadScreenRecords\(\(\)=>active\)/);
  assert.match(hostScreen, /return\(\)=>\{active=false;\}/);
  assert.match(hostScreen, /finally \{if\(isCurrent\(\)\)setBusy\(false\);\}/);
});

console.log(`Phase 1 static acceptance checks: ${checks.length}/${checks.length} passed`);
for (const label of checks) console.log(`PASS ${label}`);
console.log('NOTE: This is static verification only. It does not replace PostgreSQL integration, Vitest, production builds, or browser/design acceptance.');
