process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_AUTH = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { ParkEazyApiClient, ApiError } from '../packages/api-client/client';
import { authService } from '../apps/api/services/auth.service';
import { bookingService } from '../apps/api/services/booking.service';
import { DEMO_USERS } from '../apps/api/middleware/auth-guard';
import { BookingStatus, UserRole } from '../packages/contracts';

describe('Phase 5 Module 6 — My Bookings & Profile', () => {
  let server: http.Server;
  let baseUrl: string;
  let customerClient: ParkEazyApiClient;
  let otherClient: ParkEazyApiClient;
  let publicClient: ParkEazyApiClient;
  let customerToken: string;
  let otherCustomerToken: string;
  let adminToken: string;

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        customerClient = new ParkEazyApiClient(baseUrl);
        otherClient = new ParkEazyApiClient(baseUrl);
        publicClient = new ParkEazyApiClient(baseUrl);
        resolve();
      });
    });

    // Create tokens for test principals
    customerToken = authService.signToken(DEMO_USERS.customer, 3600);
    customerClient.setAuthToken(customerToken);

    const otherUser = {
      id: 'usr-customer-002',
      email: 'jordan@parkeazy.com',
      firstName: 'Jordan',
      lastName: 'Lee',
      roles: [UserRole.CUSTOMER],
      isHostVerified: false,
      createdAt: '2026-01-20T10:00:00Z',
    };
    otherCustomerToken = authService.signToken(otherUser, 3600);
    otherClient.setAuthToken(otherCustomerToken);

    adminToken = authService.signToken(DEMO_USERS.admin, 3600);
  });

  after(async () => {
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // --------------------------------------------------------------------------
  // FEATURE A: MY BOOKINGS
  // --------------------------------------------------------------------------
  describe('Feature A — My Bookings', () => {
    test('1. Authenticated customer retrieves only their own bookings list', async () => {
      const bookings = await customerClient.getBookings();
      assert.ok(Array.isArray(bookings), 'Must return an array of bookings');
      assert.ok(bookings.length > 0, 'Customer usr-customer-001 should have seed bookings');

      for (const booking of bookings) {
        assert.equal(
          booking.userId,
          'usr-customer-001',
          'Each returned booking must strictly belong to the authenticated user'
        );
        assert.ok(booking.id, 'Booking reference must be present');
        assert.ok(booking.locationName, 'Location name must be present');
        assert.ok(booking.startTimeUtc, 'Start time must be present');
        assert.ok(booking.endTimeUtc, 'End time must be present');
        assert.ok(booking.status, 'Status must be present');
        assert.ok(booking.quote.totalPayableCents > 0, 'Total payable amount must be positive');
      }
    });

    test('2. Unauthenticated caller gets empty list and cannot enumerate reservations', async () => {
      const publicBookings = await publicClient.getBookings();
      assert.deepEqual(publicBookings, [], 'Unauthenticated callers must get an empty array');
    });

    test('3. Authenticated customer retrieves their own booking details by ID', async () => {
      const booking = await customerClient.getBooking('bk-2026-9810');
      assert.ok(booking, 'Booking must be returned');
      assert.equal(booking.id, 'bk-2026-9810');
      assert.equal(booking.userId, 'usr-customer-001');
      assert.equal(booking.status, BookingStatus.CONFIRMED);
      assert.notEqual(booking.gateCode, 'PIN-4892', 'Seed data must not expose a hardcoded access PIN');
      assert.ok(booking.paymentDetails, 'Payment details should be present');
      assert.equal(booking.paymentDetails?.provider, 'STRIPE');
      assert.equal(booking.paymentDetails?.amountCents, 5750);
      // Ensure no sensitive payment secrets/tokens are leaked
      assert.equal((booking.paymentDetails as any).clientSecret, undefined);
      assert.equal((booking as any).stripeSecretKey, undefined);
    });

    test('4. Cross-customer isolation: Customer A cannot view Customer B booking (returns 403 FORBIDDEN)', async () => {
      // bk-2026-9811 belongs to usr-customer-002
      // Customer 1 (Alex Morgan) tries to access Customer 2's booking
      await assert.rejects(
        async () => {
          await customerClient.getBooking('bk-2026-9811');
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN');
          assert.match(err.message, /access denied|permission/i);
          return true;
        }
      );
    });

    test('5. Nonexistent booking reference returns 404 NOT_FOUND', async () => {
      await assert.rejects(
        async () => {
          await customerClient.getBooking('bk-non-existent-9999');
        },
        (err: any) => {
          assert.equal(err.code, 'NOT_FOUND');
          return true;
        }
      );
    });

    test('6. Unauthenticated booking detail request is rejected with 401 UNAUTHORIZED', async () => {
      await assert.rejects(
        async () => {
          await publicClient.getBooking('bk-2026-9810');
        },
        (err: any) => {
          assert.ok(err.code === 'UNAUTHENTICATED' || err.code === 'UNAUTHORIZED');
          return true;
        }
      );
    });

    test('7. Customer can cancel their upcoming confirmed booking', async () => {
      // First create a new booking for usr-customer-001 so we don't mutate seed bk-2026-9810
      const hold = await customerClient.createHold({
        bayId: 'bay-001-a',
        locationId: 'loc-dt-001',
        durationMinutes: 120,
      });

      const paymentIntent = await customerClient.createPaymentIntent({
        amountCents: hold.quoteSnapshot.totalPayableCents,
        currency: 'USD',
        bookingId: hold.holdId,
        idempotencyKey: `cancel-test-idem-${Date.now()}`,
      });

      const confirmed = await customerClient.confirmBooking({
        holdId: hold.holdId,
        paymentIntentId: paymentIntent.transactionId,
        idempotencyKey: `cancel-test-confirm-${Date.now()}`,
        licensePlate: 'CAN-8812',
      });

      assert.equal(confirmed.status, BookingStatus.CONFIRMED);

      // Now cancel the booking
      const cancelled = await customerClient.cancelBooking(confirmed.id);
      assert.equal(cancelled.id, confirmed.id);
      assert.equal(cancelled.status, BookingStatus.CANCELLED);

      // Verify that after cancellation, access instructions/PIN are suppressed
      const fetched = await customerClient.getBooking(confirmed.id);
      assert.equal(fetched.status, BookingStatus.CANCELLED);
      assert.equal(fetched.gateCode, undefined, 'Revoked gate code must be suppressed');
      assert.equal(fetched.accessInstructions, undefined, 'Access instructions must be suppressed');
    });

    test('8. Customer cannot cancel another customer booking (returns 403 FORBIDDEN)', async () => {
      await assert.rejects(
        async () => {
          await customerClient.cancelBooking('bk-2026-9811'); // belongs to usr-customer-002
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN');
          return true;
        }
      );
    });
  });

  // --------------------------------------------------------------------------
  // FEATURE B: MY PROFILE
  // --------------------------------------------------------------------------
  describe('Feature B — My Profile', () => {
    test('1. Authenticated customer retrieves their own profile', async () => {
      const profile = await customerClient.getProfile();
      assert.ok(profile, 'Profile must be returned');
      assert.equal(profile.id, 'usr-customer-001');
      assert.equal(profile.email, 'driver@parkeazy.com');
      assert.ok(profile.firstName);
      assert.ok(profile.lastName);
      assert.ok(Array.isArray(profile.roles));
      assert.ok(profile.roles.includes(UserRole.CUSTOMER));

      // Security check: Never expose passwords or secret tokens
      assert.equal((profile as any).password, undefined);
      assert.equal((profile as any).passwordHash, undefined);
      assert.equal((profile as any).token, undefined);
    });

    test('2. Unauthenticated profile request is rejected with 401 UNAUTHORIZED', async () => {
      await assert.rejects(
        async () => {
          await publicClient.getProfile();
        },
        (err: any) => {
          assert.ok(err.code === 'UNAUTHENTICATED' || err.code === 'UNAUTHORIZED');
          return true;
        }
      );
    });

    test('3. Permitted profile fields (firstName, lastName, phoneNumber) update and persist', async () => {
      const updated = await customerClient.updateProfile({
        firstName: 'Alexander',
        lastName: 'Morgan-Smith',
        phoneNumber: '+1-555-9876',
      });

      assert.equal(updated.firstName, 'Alexander');
      assert.equal(updated.lastName, 'Morgan-Smith');
      assert.equal(updated.phoneNumber, '+1-555-9876');
      assert.equal(updated.id, 'usr-customer-001');
      assert.equal(updated.email, 'driver@parkeazy.com');

      // Verify persistence across subsequent getProfile call
      const reFetched = await customerClient.getProfile();
      assert.equal(reFetched.firstName, 'Alexander');
      assert.equal(reFetched.lastName, 'Morgan-Smith');
      assert.equal(reFetched.phoneNumber, '+1-555-9876');

      // Verify persistence in getSession call
      const session = await customerClient.getSession();
      assert.equal(session.user?.firstName, 'Alexander');
      assert.equal(session.user?.lastName, 'Morgan-Smith');
      assert.equal(session.user?.phoneNumber, '+1-555-9876');
    });

    test('4. Attempting to modify protected fields (roles, account ID, host verification) is rejected', async () => {
      const res = await fetch(`${baseUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          roles: ['SUPER_ADMIN', 'ADMIN'],
          isHostVerified: true,
          id: 'hacked-id',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'PROTECTED_FIELD_MODIFICATION');

      // Ensure user was not escalated to ADMIN
      const profile = await customerClient.getProfile();
      assert.equal(profile.id, 'usr-customer-001');
      assert.deepEqual(profile.roles, [UserRole.CUSTOMER]);
      assert.equal(profile.isHostVerified, false);
    });

    test('5. Attempting to modify email address directly is rejected as immutable login identifier', async () => {
      const res = await fetch(`${baseUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          email: 'newemail@evil.com',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'EMAIL_IMMUTABLE');

      // Verify email remains unchanged
      const profile = await customerClient.getProfile();
      assert.equal(profile.email, 'driver@parkeazy.com');
    });

    test('6. Invalid input values (empty firstName, empty lastName) are rejected with 400 VALIDATION_ERROR', async () => {
      const res = await fetch(`${baseUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          firstName: '   ',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'VALIDATION_ERROR');
    });

    test('7. Customer cannot update another customer profile via /users/:userId/profile (returns 403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/users/usr-customer-002/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          firstName: 'MaliciousName',
        }),
      });

      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'FORBIDDEN');
    });

    test('8. Customer cannot read another customer profile via /users/:userId/profile (returns 403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/users/usr-customer-002/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      });

      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'FORBIDDEN');
    });

    test('9. Admin with elevated privileges can inspect customer profile via /users/:userId/profile', async () => {
      const res = await fetch(`${baseUrl}/users/usr-customer-001/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.id, 'usr-customer-001');
    });
  });
});
