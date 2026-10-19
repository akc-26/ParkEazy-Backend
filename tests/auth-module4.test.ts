process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_AUTH = 'true';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { ParkEazyApiClient } from '../packages/api-client/client';
import { authService } from '../apps/api/services/auth.service';
import { DEMO_USERS } from '../apps/api/middleware/auth-guard';

describe('Module 4 - Customer Authentication, Session Handling & Validation', () => {
  let server: http.Server;
  let baseUrl: string;
  let client: ParkEazyApiClient;

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        client = new ParkEazyApiClient(baseUrl);
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

  test('POST /api/v1/auth/login succeeds with customer demo credentials and returns JWT token & user', async () => {
    const result = await client.login('driver@parkeazy.com', 'demo-password', 'user');
    assert.ok(result.token, 'Token must be returned');
    assert.equal(typeof result.token, 'string');
    assert.equal(result.user.email, 'driver@parkeazy.com');
    assert.equal(result.user.firstName, 'Alex');
    assert.equal(result.user.lastName, 'Morgan');
    assert.ok(result.user.roles.includes('CUSTOMER' as any));
    assert.ok(result.expiresIn > 0);

    // Verify token stored in client
    assert.equal(client.getAuthToken(), result.token);
  });

  test('GET /api/v1/auth/session returns authenticated customer principal when valid Bearer token provided', async () => {
    // client already has token from previous login test
    const session = await client.getSession();
    assert.ok(session.user, 'User session must exist');
    assert.equal(session.user?.email, 'driver@parkeazy.com');
    assert.equal(session.user?.id, DEMO_USERS.customer.id);
  });

  test('GET /api/v1/auth/session returns user: null when unauthenticated or token cleared', async () => {
    const unauthedClient = new ParkEazyApiClient(baseUrl);
    const session = await unauthedClient.getSession();
    assert.equal(session.user, null, 'Unauthenticated request must have null user');
  });

  test('POST /api/v1/auth/login rejects invalid email format with 400 VALIDATION_ERROR', async () => {
    await assert.rejects(
      async () => {
        await client.login('not-an-email', 'somepass');
      },
      (err: any) => {
        assert.equal(err.code, 'VALIDATION_ERROR');
        return true;
      }
    );
  });

  test('POST /api/v1/auth/login rejects empty email with 400 VALIDATION_ERROR', async () => {
    await assert.rejects(
      async () => {
        await client.login('', 'somepass');
      },
      (err: any) => {
        assert.equal(err.code, 'VALIDATION_ERROR');
        return true;
      }
    );
  });

  test('POST /api/v1/auth/login rejects unknown user credentials with 401 UNAUTHENTICATED', async () => {
    await assert.rejects(
      async () => {
        await client.login('unknown.user@example.com', 'somepass');
      },
      (err: any) => {
        assert.equal(err.code, 'UNAUTHENTICATED');
        assert.ok(err.message.includes('Invalid email or password'));
        return true;
      }
    );
  });

  test('Client token management sets, retrieves, and clears authentication state correctly', () => {
    const testClient = new ParkEazyApiClient(baseUrl);
    assert.equal(testClient.getAuthToken(), null);

    testClient.setAuthToken('sample-jwt-token-123');
    assert.equal(testClient.getAuthToken(), 'sample-jwt-token-123');

    testClient.setAuthToken(null);
    assert.equal(testClient.getAuthToken(), null);
  });
});
