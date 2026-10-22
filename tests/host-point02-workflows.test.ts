import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('ParkEazy Point 02 host workflows', () => {
  it('scopes host bookings to tenant-owned facility IDs in the database query', () => {
    const service = read('services/api/src/modules/bookings/bookings.service.ts');
    const hostService = read('services/api/src/modules/host/host.service.ts');
    expect(service).toContain('WHERE tenant_id = $2 AND facility_id = ANY($1::uuid[])');
    expect(hostService).toContain('getBookingsByFacilityIds(facilityIds, tenantId)');
    expect(hostService).toContain('listSpaces(f.id, hostId, tenantId)');
    expect(hostService).not.toContain('|| true');
  });

  it('requires authentication and host/superadmin role for host operations', () => {
    const controller = read('services/api/src/modules/host/host.controller.ts');
    expect(controller).toContain('@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)');
    expect(controller).toContain("@Roles('host', 'superadmin')");
    expect(controller).not.toContain("sub: '00000000-0000-4000-a000-000000000002'");
  });

  it('does not fabricate earnings or settlement references', () => {
    const service = read('services/api/src/modules/host/host.service.ts');
    expect(service).not.toContain('HDFC');
    expect(service).not.toContain('Math.random()');
    expect(service).toContain('persistent settlement provider has not been configured');
    expect(service).toContain('booking.pricing.platformFeeInr');
  });

  it('connects host check-in and check-out UI actions to host-scoped endpoints', () => {
    const screen = read('apps/host/src/pages/HostWorkspaceScreens.tsx');
    const client = read('packages/api-client/src/client.ts');
    const controller = read('services/api/src/modules/host/host.controller.ts');
    expect(screen).toContain('apiClient.host.checkIn(booking.id)');
    expect(screen).toContain('apiClient.host.checkOut(booking.id)');
    expect(client).toContain('/host/bookings/${encodeURIComponent(id)}/check-in');
    expect(client).toContain('/host/bookings/${encodeURIComponent(id)}/check-out');
    expect(controller).toContain("@Post('bookings/:id/check-in')");
    expect(controller).toContain("@Post('bookings/:id/check-out')");
  });

  it('loads host-scoped audit history and derives overdue active-stay exceptions transparently', () => {
    const screen = read('apps/host/src/pages/HostWorkspaceScreens.tsx');
    const service = read('services/api/src/modules/bookings/bookings.service.ts');
    expect(screen).toContain('apiClient.host.getAuditEvents()');
    expect(service).toContain('getLifecycleEventsByFacilityIds');
    expect(screen).toContain('15-minute grace');
  });


  it('prevents stale API responses from mutating a screen after route changes', () => {
    const screen = read('apps/host/src/pages/HostWorkspaceScreens.tsx');
    expect(screen).toContain('let active=true;');
    expect(screen).toContain('void loadScreenRecords(()=>active)');
    expect(screen).toContain('return()=>{active=false;}');
    expect(screen).toContain('finally {if(isCurrent())setBusy(false);}');
  });

  it('supports persistent extension requests and host-scoped decisions with conflict validation', () => {
    const screen = read('apps/host/src/pages/HostWorkspaceScreens.tsx');
    const bookingsController = read('services/api/src/modules/bookings/bookings.controller.ts');
    const hostController = read('services/api/src/modules/host/host.controller.ts');
    const bookingsService = read('services/api/src/modules/bookings/bookings.service.ts');
    const migration = read('services/api/src/database/migrations/010_booking_extension_requests.sql');
    const client = read('packages/api-client/src/client.ts');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS booking_extension_requests');
    expect(bookingsController).toContain("@Post(':id/extension-requests')");
    expect(hostController).toContain("@Get('extension-requests')");
    expect(hostController).toContain("@Post('extension-requests/:id/decision')");
    expect(bookingsService).toContain('getExtensionRequestsByFacilityIds');
    expect(bookingsService).toContain('another confirmed booking conflicts with the requested extension');
    expect(bookingsService).toContain('booking end time changed after this extension request was submitted');
    expect(bookingsService).toContain('FOR UPDATE OF r,b');
    expect(client).toContain("'/host/extension-requests'");
    expect(screen).toContain('apiClient.host.getExtensionRequests()');
    expect(screen).toContain('apiClient.host.decideExtensionRequest(requestId,decision)');
  });

  it('accurately distinguishes the persisted business profile from local-only drafts', () => {
    const screen = read('apps/host/src/pages/HostWorkspaceScreens.tsx');
    expect(screen).toContain('Business name and tax ID use the existing host profile API.');
    expect(screen).toContain("screen.route==='/host/settings/business'?'Partial API':'Draft mode'");
    expect(screen).toContain('Billing address and business email remain local drafts unless the API returns/persists them.');
  });

  it('uses API-backed earnings summaries and recorded ledger data across finance screens', () => {
    const screen = read('apps/host/src/pages/HostWorkspaceScreens.tsx');
    expect(screen).toContain('apiClient.host.getEarnings()');
    expect(screen).toContain('apiClient.host.getPayouts()');
    expect(screen).toContain('apiClient.host.getLedger()');
    expect(screen).toContain('Recorded platform commission');
    expect(screen).toContain('Verified earnings overview');
    expect(screen).toContain('This is not a future fee schedule.');
  });

  it('persists only non-sensitive workspace drafts locally and labels the role matrix as review-only', () => {
    const screen = read('apps/host/src/pages/HostWorkspaceScreens.tsx');
    expect(screen).toContain('parkeazy:host:draft:${screen.route}');
    expect(screen).toContain("screen.route==='/host/earnings/payout-account'||screen.route==='/host/settings/support'");
    expect(screen).toContain('Showing the proposed access matrix for review only. Server-side role grants are not changed by this screen.');
    expect(screen).toContain('Draft fields cleared from this screen and browser storage where applicable.');
  });

  it('does not invent listing photos, closure records, or verified eligibility', () => {
    const photos = read('apps/host/src/pages/PhotosListingPreviewPage.tsx');
    const closures = read('apps/host/src/pages/DateSpecificAvailabilityClosuresPage.tsx');
    const eligibility = read('apps/host/src/pages/HostEligibilityPage.tsx');
    const verification = read('apps/host/src/pages/HostVerificationPage.tsx');
    expect(photos).not.toContain('SAMPLE_PHOTO_PRESETS');
    expect(closures).not.toContain('INITIAL_CLOSURES');
    expect(closures).toContain('Closure draft saved in this browser only');
    expect(eligibility).toContain('Not verified');
    expect(verification).toContain('Email verification is not configured in the current API');
  });

  it('shows the primary earnings overview from host APIs without sample ledger fallbacks', () => {
    const earnings = read('apps/host/src/pages/HostEarningsFinancialOverviewPage.tsx');
    expect(earnings).toContain('apiClient.host.getEarnings()');
    expect(earnings).toContain('apiClient.host.getLedger()');
    expect(earnings).not.toContain("'120.00'");
    expect(earnings).not.toContain('Bay B1-04');
    expect(earnings).not.toContain('Platform Fee (15%)');
    expect(earnings).toContain('Payout history unavailable');
  });

  it('does not fabricate host pricing changes or conflict resolutions', () => {
    const pricing = read('apps/host/src/pages/SpacePricingConfigurationPage.tsx');
    const bulk = read('apps/host/src/pages/BulkPricingScheduleUpdatesPage.tsx');
    const conflicts = read('apps/host/src/pages/AvailabilityConflictChangeReviewPage.tsx');
    const rules = read('apps/host/src/pages/BookingDurationAdvanceBookingRulesPage.tsx');
    expect(pricing).toContain('apiClient.spaces.update(selectedSpaceId, { hourlyRateInr: rate })');
    expect(pricing).toContain('do not change live booking calculations');
    expect(bulk).toContain('apiClient.facilities.getSpaces');
    expect(bulk).not.toContain('INITIAL_BAYS');
    expect(bulk).toContain('transactional bulk-pricing API is required');
    expect(conflicts).not.toContain('BK-9021');
    expect(conflicts).toContain('Resolution unavailable — no safe execution API');
    expect(rules).toContain('browser draft only');
  });

  it('does not create fake CSV records and exports only records currently loaded', () => {
    const screen = read('apps/host/src/pages/HostWorkspaceScreens.tsx');
    expect(screen).toContain('There are no loaded records to export.');
    expect(screen).toContain('const visible=filteredRecords');
    expect(screen).toContain("replace(/\"/g,'\"\"')");
  });
});
