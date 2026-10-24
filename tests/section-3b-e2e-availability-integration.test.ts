import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { createApp } from '../server';
import { db } from '../server/db';
import { availabilityService } from '../apps/api/services/availability.service';
import { authService } from '../apps/api/services/auth.service';
import { User, Facility, ParkingBay, Booking } from '../server/types';
import { UserRole } from '../packages/contracts';

describe('Section 3B End-to-End Availability Integration', () => {
  let server: http.Server;
  let baseUrl: string;
  let hostA: User;
  let hostB: User;
  let hostAToken: string;
  let hostBToken: string;
  let facility: Facility;
  let bayA: ParkingBay;
  let bayB: ParkingBay;

  beforeAll(async () => {
    await db.initialize();

    // Start in-memory HTTP server running the production Express app
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      if (server.closeAllConnections) {
        server.closeAllConnections();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(async () => {
    hostA = (await db.findUserById('usr_host1'))!;
    hostB = (await db.findUserById('usr_host2'))!;

    // Generate authenticated JWT tokens for API route requests
    hostAToken = authService.signToken({
      id: hostA.id,
      email: hostA.email,
      firstName: hostA.fullName.split(' ')[0] || 'Host',
      lastName: hostA.fullName.split(' ')[1] || 'One',
      roles: [UserRole.HOST],
      isHostVerified: true,
      createdAt: new Date().toISOString(),
    });

    hostBToken = authService.signToken({
      id: hostB.id,
      email: hostB.email,
      firstName: hostB.fullName.split(' ')[0] || 'Host',
      lastName: hostB.fullName.split(' ')[1] || 'Two',
      roles: [UserRole.HOST],
      isHostVerified: true,
      createdAt: new Date().toISOString(),
    });

    // Create a facility owned by Host A
    facility = await db.createFacility(
      hostA.id,
      {
        name: 'E2E Central Park Garage',
        address: '42 Marina Boulevard',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'India',
        latitude: 13.0827,
        longitude: 80.2707,
        type: 'multilevel',
        totalSpots: 2,
        isCovered: true,
        operatingHours: '24/7',
        timezone: 'Asia/Kolkata',
      }
    );

    // Configure 7-day explicit operating hours
    await db.updateOperatingHours(
      facility.id,
      [
        { dayOfWeek: 0, openTime: '06:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 1, openTime: '06:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 2, openTime: '06:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 3, openTime: '06:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 4, openTime: '06:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 5, openTime: '06:00', closeTime: '23:00', isClosed: false },
        { dayOfWeek: 6, openTime: '06:00', closeTime: '23:00', isClosed: false },
      ],
      hostA,
      'Asia/Kolkata'
    );

    // Create 2 bays
    bayA = await db.createBay(
      facility.id,
      {
        bayNumber: 'BAY-A1',
        floor: 'Ground',
        type: 'standard',
        supportedVehicleTypes: ['car'],
        pricePerHour: 100,
      },
      hostA
    );

    bayB = await db.createBay(
      facility.id,
      {
        bayNumber: 'BAY-B2',
        floor: 'Ground',
        type: 'ev',
        supportedVehicleTypes: ['car', 'suv'],
        pricePerHour: 150,
      },
      hostA
    );
  });

  // ===========================================================================
  // 1. HTTP API ROUTE INTEGRATION TESTS
  // ===========================================================================
  describe('HTTP Production API Routes Availability Integration', () => {
    it('creates date-specific closure via API route and verifies unavailability via availability API', async () => {
      const closureStart = '2026-11-15T00:00:00.000Z';
      const closureEnd = '2026-11-15T23:59:59.000Z';

      // 1. Call POST /api/facilities/:id/closures via HTTP
      const postRes = await fetch(`${baseUrl}/api/facilities/${facility.id}/closures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hostAToken}`,
        },
        body: JSON.stringify({
          title: 'Annual Electrical Overhaul',
          reason: 'maintenance',
          startsAt: closureStart,
          endsAt: closureEnd,
        }),
      });

      expect(postRes.status).toBe(201);
      const closure = await postRes.json();
      expect(closure.id).toBeDefined();
      expect(closure.facilityId).toBe(facility.id);

      // 2. Call GET /api/facilities/:id/availability via HTTP
      const availRes = await fetch(
        `${baseUrl}/api/facilities/${facility.id}/availability?startTimeUtc=2026-11-15T10:00:00.000Z&endTimeUtc=2026-11-15T14:00:00.000Z`
      );
      expect(availRes.status).toBe(200);
      const availData = await availRes.json();

      expect(availData.facilityId).toBe(facility.id);
      expect(availData.totalSpaces).toBe(2);
      expect(availData.availableSpacesCount).toBe(0);
      for (const space of availData.spaces) {
        expect(space.isAvailable).toBe(false);
        expect(space.currentStatus).toContain('Closed');
      }

      // 3. Also verify through /api/v1/hosts/:hostId/availability endpoint
      const v1AvailRes = await fetch(
        `${baseUrl}/api/v1/hosts/${hostA.id}/availability?facilityId=${facility.id}&startTimeUtc=2026-11-15T10:00:00.000Z&endTimeUtc=2026-11-15T14:00:00.000Z`,
        {
          headers: {
            Authorization: `Bearer ${hostAToken}`,
          },
        }
      );
      expect(v1AvailRes.status).toBe(200);
      const v1Data = await v1AvailRes.json();
      expect(v1Data.success).toBe(true);
      expect(v1Data.data.availableSpacesCount).toBe(0);
    });

    it('creates bay-specific maintenance via API route and verifies targeted bay unavailability via API', async () => {
      const maintStart = '2026-11-20T08:00:00.000Z';
      const maintEnd = '2026-11-20T12:00:00.000Z';

      // Call POST /api/facilities/:id/maintenance via HTTP
      const postRes = await fetch(`${baseUrl}/api/facilities/${facility.id}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hostAToken}`,
        },
        body: JSON.stringify({
          title: 'Sensor Replacement Bay A1',
          description: 'Hardware swap',
          startsAt: maintStart,
          endsAt: maintEnd,
          bayId: bayA.id,
          status: 'scheduled',
        }),
      });

      expect(postRes.status).toBe(201);
      const maint = await postRes.json();
      expect(maint.id).toBeDefined();

      // Query availability via HTTP
      const availRes = await fetch(
        `${baseUrl}/api/facilities/${facility.id}/availability?startTimeUtc=2026-11-20T09:00:00.000Z&endTimeUtc=2026-11-20T11:00:00.000Z`
      );
      expect(availRes.status).toBe(200);
      const availData = await availRes.json();

      expect(availData.totalSpaces).toBe(2);
      expect(availData.availableSpacesCount).toBe(1);

      const spaceA = availData.spaces.find((s: any) => s.spaceId === bayA.id);
      const spaceB = availData.spaces.find((s: any) => s.spaceId === bayB.id);

      expect(spaceA?.isAvailable).toBe(false);
      expect(spaceA?.currentStatus).toContain('Maintenance');
      expect(spaceB?.isAvailable).toBe(true);
      expect(spaceB?.currentStatus).toBe('Available');
    });

    it('enforces tenant isolation and rejects unauthorized operations via HTTP API routes', async () => {
      // Host B attempts to schedule closure on Host A's facility -> 403 Forbidden
      const resClosure = await fetch(`${baseUrl}/api/facilities/${facility.id}/closures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hostBToken}`,
        },
        body: JSON.stringify({
          title: 'Unauthorized Closure',
          startsAt: '2026-12-01T08:00:00.000Z',
          endsAt: '2026-12-01T12:00:00.000Z',
        }),
      });
      expect(resClosure.status).toBe(403);

      // Host B attempts to schedule maintenance on Host A's facility -> 403 Forbidden
      const resMaint = await fetch(`${baseUrl}/api/facilities/${facility.id}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hostBToken}`,
        },
        body: JSON.stringify({
          title: 'Unauthorized Maintenance',
          startsAt: '2026-12-01T08:00:00.000Z',
          endsAt: '2026-12-01T12:00:00.000Z',
          bayId: bayA.id,
        }),
      });
      expect(resMaint.status).toBe(403);
    });

    it('reports confirmed booking conflicts via HTTP API route with 409 status', async () => {
      const bookingStart = '2026-12-10T10:00:00.000Z';
      const bookingEnd = '2026-12-10T14:00:00.000Z';

      const guestUser = (await db.findUserById('usr_driver1')) || hostA;
      const bookingId = 'bk_api_conf_' + Date.now();
      const confirmedBooking: Booking = {
        id: bookingId,
        bookingReference: 'REF-CONFIRMED-API',
        userId: guestUser.id,
        customerId: guestUser.id,
        customerName: guestUser.fullName || 'Alex Driver',
        customerPhone: '+919876543210',
        customerEmail: guestUser.email,
        facilityId: facility.id,
        bayId: bayA.id,
        startTime: bookingStart,
        endTime: bookingEnd,
        vehiclePlate: 'TN-01-AB-1234',
        licensePlate: 'TN-01-AB-1234',
        vehicleMakeModel: 'Toyota Innova',
        vehicleType: 'car',
        totalPrice: 400,
        basePrice: 400,
        serviceFee: 40,
        totalAmount: 440,
        grossAmount: 440,
        platformFee: 40,
        hostNetEarnings: 400,
        taxAmount: 0,
        qrCodeToken: 'QR-TEST-TOKEN',
        gateAccessCode: '1234',
        status: 'confirmed',
        paymentStatus: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const bookings = await (db as any).getCollectionFromDb('bookings');
      bookings.push(confirmedBooking);
      await (db as any).persistEntity('bookings', bookingId, confirmedBooking);

      // Attempt to schedule conflicting closure via HTTP POST
      const res = await fetch(`${baseUrl}/api/facilities/${facility.id}/closures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hostAToken}`,
        },
        body: JSON.stringify({
          title: 'Full Facility Repaving',
          startsAt: '2026-12-10T08:00:00.000Z',
          endsAt: '2026-12-10T16:00:00.000Z',
        }),
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/Conflicting confirmed reservation/i);

      // Verify the booking is still intact
      const freshBooking = await db.getBookingById(bookingId);
      expect(freshBooking).toBeDefined();
      expect(freshBooking?.status).toBe('confirmed');
    });
  });

  // ===========================================================================
  // 2. DIRECT UNIT TESTS (SUPPLEMENTARY COVERAGE)
  // ===========================================================================
  describe('Direct Persistence & Engine Supplementary Coverage', () => {
    it('verifies facility creation and operating hours configuration', async () => {
      const fetched = await db.getFacilityById(facility.id);
      expect(fetched?.hostId).toBe(hostA.id);
      expect(fetched?.timezone).toBe('Asia/Kolkata');

      const hours = await db.getOperatingHours(facility.id, hostA);
      expect(hours.timezone).toBe('Asia/Kolkata');
      expect((hours.operatingHours as any[]).length).toBe(7);
    });

    it('verifies outside time windows do not block availability', async () => {
      await db.createFacilityClosure(
        facility.id,
        {
          title: 'Holiday Closure',
          startsAt: '2026-11-25T10:00:00.000Z',
          endsAt: '2026-11-25T18:00:00.000Z',
        },
        hostA
      );

      const beforeClosure = availabilityService.calculateSpaceAvailability(
        facility.id,
        '2026-11-25T06:00:00.000Z',
        '2026-11-25T09:00:00.000Z'
      );
      expect(beforeClosure.spaces.every(s => s.isAvailable)).toBe(true);
    });
  });
});
