process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { authService } from '../apps/api/services/auth.service';
import { DEMO_USERS } from '../apps/api/middleware/auth-guard';
import { UserRole } from '../packages/contracts';

describe('Workstream 2.4 - Authentication and Authorization Foundation', () => {
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

  test('signs and verifies cryptographic HMAC-SHA256 JWT tokens', () => {
    const token = authService.signToken(DEMO_USERS.customer, 3600);
    assert.equal(typeof token, 'string');
    assert.equal(token.split('.').length, 3, 'Token must have 3 segments');

    const payload = authService.verifyToken(token);
    assert.equal(payload.sub, DEMO_USERS.customer.id);
    assert.equal(payload.email, DEMO_USERS.customer.email);
    assert.deepEqual(payload.roles, [UserRole.CUSTOMER]);
    assert.equal(payload.iss, 'parkeazy-auth');
  });

  test('rejects tokens with invalid signatures', () => {
    const token = authService.signToken(DEMO_USERS.customer, 3600);
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: 'usr-hacker', email: 'hacker@evil.com', roles: ['ADMIN'] })
    ).toString('base64url');

    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(
      () => authService.verifyToken(tamperedToken),
      (err: any) => err.statusCode === 401 && err.code === 'UNAUTHENTICATED'
    );
  });

  test('rejects expired tokens', () => {
    // Generate token with negative expiration (-10 seconds)
    const expiredToken = authService.signToken(DEMO_USERS.customer, -10);

    assert.throws(
      () => authService.verifyToken(expiredToken),
      (err: any) => err.statusCode === 401 && err.message.includes('expired')
    );
  });

  test('POST /api/v1/auth/login issues valid signed token for demo credentials in dev/test', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver@parkeazy.com', requestedPortal: 'user' }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.token);
    assert.equal(json.data.user.email, 'driver@parkeazy.com');

    // Token must be verifiable
    const verified = authService.verifyToken(json.data.token);
    assert.equal(verified.email, 'driver@parkeazy.com');
  });

  test('protected routes reject unauthenticated requests without Bearer header', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/ledger`);
    assert.equal(res.status, 401);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
  });

  test('role guard rejects requests with insufficient permissions (Customer accessing Admin route)', async () => {
    const customerToken = authService.signToken(DEMO_USERS.customer, 3600);
    const res = await fetch(`${baseUrl}/api/v1/admin/ledger`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'FORBIDDEN');
    assert.ok(json.error.message.includes('Requires one of roles'));
  });

  test('role guard allows authorized administrator accessing Admin ledger', async () => {
    const adminToken = authService.signToken(DEMO_USERS.admin, 3600);
    const res = await fetch(`${baseUrl}/api/v1/admin/ledger`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  });

  test('resource ownership check prevents Host A from accessing Host B earnings', async () => {
    const hostToken = authService.signToken(DEMO_USERS.host, 3600); // host id is 'usr-host-001'

    // Attempting to access usr-host-002 earnings
    const res = await fetch(`${baseUrl}/api/v1/hosts/usr-host-002/earnings`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'FORBIDDEN');
    assert.ok(json.error.message.includes('Access denied'));
  });

  test('resource ownership check permits host to access their own earnings', async () => {
    const hostToken = authService.signToken(DEMO_USERS.host, 3600); // host id is 'usr-host-001'

    const res = await fetch(`${baseUrl}/api/v1/hosts/usr-host-001/earnings`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.hostId, 'usr-host-001');
  });

  test('administrator bypasses resource ownership checks to view host earnings', async () => {
    const adminToken = authService.signToken(DEMO_USERS.admin, 3600);

    const res = await fetch(`${baseUrl}/api/v1/hosts/usr-host-001/earnings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
  });
});
