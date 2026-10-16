process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';

describe('Workstream 2.3 - API Validation, Responses, and Error Handling', () => {
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

  test('GET /api/v1/health returns 200 and standard envelope with correlation ID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'healthy');
    assert.ok(json.correlationId, 'Must include correlationId in payload');
    assert.ok(json.timestamp, 'Must include ISO timestamp in payload');

    const headerCorr = res.headers.get('x-correlation-id');
    assert.equal(headerCorr, json.correlationId, 'Header and payload correlation ID must match');

    // Security headers
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  });

  test('propagates and sanitizes incoming X-Correlation-Id', async () => {
    const customId = 'client-trace-abc-123';
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { 'X-Correlation-Id': customId },
    });

    const json = await res.json();
    assert.equal(res.headers.get('x-correlation-id'), customId);
    assert.equal(json.correlationId, customId);
  });

  test('sanitizes unsafe characters from incoming correlation ID', async () => {
    const unsafeId = 'client-trace<script>alert(1)</script>';
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { 'X-Correlation-Id': unsafeId },
    });

    const json = await res.json();
    assert.notEqual(json.correlationId, unsafeId, 'Unsafe ID must be rejected and replaced');
    assert.ok(json.correlationId.startsWith('req-'), 'Replaces with generated secure ID');
  });

  test('GET /api/v1/readiness returns 503 and ready: false when required dependencies are unreachable or unconfigured', async () => {
    const res = await fetch(`${baseUrl}/api/v1/readiness`);
    // When required dependencies (PostgreSQL / Redis) are unreachable, readiness must return 503
    assert.equal(res.status, 503);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.ready, false);
    assert.equal(json.data.productionReady, false);
    assert.ok(json.data.checks.database);
    assert.ok(json.data.checks.database.status === 'down' || json.data.checks.database.status === 'unconfigured');
    assert.ok(json.data.checks.cache);
    assert.ok(json.data.checks.cache.status === 'down' || json.data.checks.cache.status === 'unconfigured');
    assert.ok(json.data.checks.migrations);
  });

  test('POST /api/v1/bookings/hold succeeds for valid parameters', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bayId: 'bay-001-a',
        locationId: 'loc-dt-001',
        durationMinutes: 120,
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.bayId, 'bay-001-a');
    assert.ok(json.data.holdExpiresAtUtc);
  });

  test('POST /api/v1/bookings/hold rejects missing fields with 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(json.error.details));
    assert.ok(json.error.details.length >= 3);
  });

  test('POST /api/v1/bookings/hold rejects duration below 60 minutes with 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bayId: 'bay-soma-01',
        locationId: 'loc-soma-001',
        durationMinutes: 15, // Minimum is 60 minutes
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
    assert.ok(json.error.details.some((d: any) => d.field === 'durationMinutes'));
  });

  test('POST /api/v1/auth/login rejects invalid email with 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-a-valid-email',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
  });

  test('rejects malformed JSON payloads with 400 MALFORMED_JSON', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid": unclosed string',
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'MALFORMED_JSON');
    assert.ok(json.error.message.includes('JSON'));
  });

  test('unmatched /api/v1 route returns 404 JSON with NOT_FOUND', async () => {
    const res = await fetch(`${baseUrl}/api/v1/nonexistent-endpoint`);
    assert.equal(res.status, 404);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'NOT_FOUND');
    assert.ok(json.error.message.includes('does not exist'));
  });

  test('unmatched /api/* route returns 404 JSON and does not return HTML', async () => {
    const res = await fetch(`${baseUrl}/api/some/other/path`);
    assert.equal(res.status, 404);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'API_NOT_FOUND');
  });
});
