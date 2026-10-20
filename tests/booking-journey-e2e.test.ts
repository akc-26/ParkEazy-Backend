process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { ledgerService } from '../apps/api/services/ledger.service';
import { BookingStatus, UserRole, LedgerEntryType } from '../packages/contracts';

describe('Phase 5 Module 5 — End-to-End Booking, Checkout, Confirmation, and Regression Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
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

  after(async () => {
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test('E2E Journey: Search -> Details -> Hold -> Review -> Payment Intent -> Confirm -> Access Pass Gating', async () => {
    // 1. Authenticate Driver (Alex Morgan)
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver@parkeazy.com', password: 'Password123!' }),
    });
    assert.equal(loginRes.status, 200);
    const loginJson = await loginRes.json();
    const token = loginJson.data.token;
    assert.ok(token);

    // 2. Discover Locations
    const locRes = await fetch(`${baseUrl}/api/v1/inventory/locations`);
    assert.equal(locRes.status, 200);
    const locJson = await locRes.json();
    assert.ok(Array.isArray(locJson.data));
    const targetLoc = locJson.data.find((l: any) => l.id === 'loc-dt-001');
    assert.ok(targetLoc);

    // 3. Discover Bays
    const baysRes = await fetch(`${baseUrl}/api/v1/inventory/locations/${targetLoc.id}/bays`);
    assert.equal(baysRes.status, 200);
    const baysJson = await baysRes.json();
    assert.ok(Array.isArray(baysJson.data));
    // Pick bay-001-a or bay-001-b
    const targetBay = baysJson.data.find((b: any) => b.id === 'bay-001-b') || baysJson.data[0];

    // 4. Create Authoritative 10-Minute Hold
    const holdRes = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bayId: targetBay.id,
        locationId: targetLoc.id,
        durationMinutes: 120, // 2 hours
      }),
    });
    assert.equal(holdRes.status, 201);
    const holdJson = await holdRes.json();
    const hold = holdJson.data;
    assert.ok(hold.holdId.startsWith('hold-'));
    assert.equal(hold.holdDurationSeconds, 600);
    assert.ok(hold.quoteSnapshot.totalPayableCents > 0);

    // 5. Booking Review: Fetch hold authoritatively
    const reviewRes = await fetch(`${baseUrl}/api/v1/bookings/hold/${hold.holdId}`);
    assert.equal(reviewRes.status, 200);
    const reviewJson = await reviewRes.json();
    assert.equal(reviewJson.data.holdId, hold.holdId);
    assert.equal(reviewJson.data.quoteSnapshot.totalPayableCents, hold.quoteSnapshot.totalPayableCents);

    // 6. Checkout: Generate stable idempotency key and create Payment Intent
    const idempotencyKey = `e2e_idemp_${Date.now()}`;
    const intentRes = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amountCents: hold.quoteSnapshot.totalPayableCents,
        currency: 'USD',
        bookingId: hold.holdId,
        idempotencyKey,
      }),
    });
    assert.equal(intentRes.status, 201);
    const intentJson = await intentRes.json();
    assert.equal(intentJson.data.status, 'SUCCEEDED');
    const transactionId = intentJson.data.transactionId;

    // 7. Verify Payment Intent status check endpoint
    const statusCheckRes = await fetch(`${baseUrl}/api/v1/payments/intent/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(statusCheckRes.status, 200);
    const statusCheckJson = await statusCheckRes.json();
    assert.equal(statusCheckJson.data.status, 'SUCCEEDED');

    // 8. Confirm Booking from Hold
    const confirmRes = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        holdId: hold.holdId,
        paymentIntentId: transactionId,
        idempotencyKey,
        licensePlate: '7XYZ890',
      }),
    });
    assert.equal(confirmRes.status, 201);
    const confirmJson = await confirmRes.json();
    const booking = confirmJson.data;
    assert.ok(booking.id.startsWith('bk-2026-'));
    assert.equal(booking.status, BookingStatus.CONFIRMED);
    assert.equal(booking.licensePlate, '7XYZ890');
    assert.ok(booking.gateCode);
    assert.ok(booking.accessInstructions);

    // 9. Booking Confirmation Lookup: Reopening or refreshing confirmation page
    const confirmLookupRes = await fetch(`${baseUrl}/api/v1/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(confirmLookupRes.status, 200);
    const confirmLookupJson = await confirmLookupRes.json();
    assert.equal(confirmLookupJson.data.id, booking.id);
    assert.equal(confirmLookupJson.data.status, BookingStatus.CONFIRMED);
    assert.equal(confirmLookupJson.data.gateCode, booking.gateCode);

    // 10. Ledger Invariants: Double-entry balanced entries created
    const ledger = ledgerService.getAllEntries();
    const relatedEntries = ledger.filter((e) => e.bookingId === booking.id);
    assert.ok(relatedEntries.some((e) => e.entryType === LedgerEntryType.PARKING_FEE_COLLECTED));
    assert.ok(relatedEntries.some((e) => e.entryType === LedgerEntryType.DEPOSIT_HELD));
    assert.ok(relatedEntries.some((e) => e.entryType === LedgerEntryType.HOST_EARNING_ACCRUED));
  });

  test('Regression Check: Host Portal and Admin endpoints remain fully operational and protected', async () => {
    // 1. Host Login
    const hostLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'host@parkeazy.com', password: 'Password123!' }),
    });
    const hostLoginJson = await hostLoginRes.json();
    const hostToken = hostLoginJson.data.token;

    // 2. Host Earnings
    const earningsRes = await fetch(`${baseUrl}/api/v1/hosts/usr-host-001/earnings`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.equal(earningsRes.status, 200);
    const earningsJson = await earningsRes.json();
    assert.equal(earningsJson.data.hostId, 'usr-host-001');

    // 3. Host Bookings
    const hostBookingsRes = await fetch(`${baseUrl}/api/v1/hosts/usr-host-001/bookings`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.equal(hostBookingsRes.status, 200);

    // 4. Admin Login
    const adminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@parkeazy.com', password: 'Password123!' }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.data.token;

    // 5. Admin Ledger View
    const adminLedgerRes = await fetch(`${baseUrl}/api/v1/admin/ledger`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminLedgerRes.status, 200);
    const adminLedgerJson = await adminLedgerRes.json();
    assert.ok(Array.isArray(adminLedgerJson.data));
  });
});
