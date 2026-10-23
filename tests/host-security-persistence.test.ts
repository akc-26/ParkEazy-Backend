process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_AUTH = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { ParkEazyApiClient, ApiError } from '../packages/api-client/client';
import { authService } from '../apps/api/services/auth.service';
import { inventoryService } from '../apps/api/services/inventory.service';
import { dbManager } from '../apps/api/database/connection';
import { db } from '../server/db';
import {
  UserRole,
  LocationStatus,
  BayType,
  BayStatus,
  PropertyType,
  AccessMethod,
} from '../packages/contracts';

describe('Roadmap Point 2: Host Security & Persistence Hardening Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let anonClient: ParkEazyApiClient;
  let hostAClient: ParkEazyApiClient;
  let hostBClient: ParkEazyApiClient;
  let customerClient: ParkEazyApiClient;

  const hostAId = 'usr-host-sec-a';
  const hostBId = 'usr-host-sec-b';
  const customerId = 'usr-customer-sec';

  let hostAToken: string;
  let hostBToken: string;
  let customerToken: string;

  before(async () => {
    authService.resetStores();
    await inventoryService.resetStoresAsync();
    await db.initialize();

    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        anonClient = new ParkEazyApiClient(baseUrl);
        hostAClient = new ParkEazyApiClient(baseUrl);
        hostBClient = new ParkEazyApiClient(baseUrl);
        customerClient = new ParkEazyApiClient(baseUrl);
        resolve();
      });
    });

    const userA = {
      id: hostAId,
      email: 'host.sec.a@parkeazy.internal',
      firstName: 'SecHost',
      lastName: 'Alpha',
      roles: [UserRole.HOST],
      isHostVerified: true,
      createdAt: new Date().toISOString(),
    };
    const userB = {
      id: hostBId,
      email: 'host.sec.b@parkeazy.internal',
      firstName: 'SecHost',
      lastName: 'Beta',
      roles: [UserRole.HOST],
      isHostVerified: true,
      createdAt: new Date().toISOString(),
    };
    (authService as any).userStore.set(hostAId, userA);
    (authService as any).userStore.set(hostBId, userB);

    await dbManager.query(
      `INSERT INTO users (id, email, first_name, last_name, roles, is_host_verified)
       VALUES 
         ($1, $2, 'SecHost', 'Alpha', '{"HOST"}', true),
         ($3, $4, 'SecHost', 'Beta', '{"HOST"}', true)
       ON CONFLICT (id) DO NOTHING`,
      [hostAId, userA.email, hostBId, userB.email]
    );

    await (db as any).persistEntity('users', hostAId, {
      id: hostAId,
      email: userA.email,
      fullName: 'SecHost Alpha',
      role: 'host',
      status: 'active',
      createdAt: userA.createdAt,
      updatedAt: userA.createdAt,
    });
    await (db as any).persistEntity('users', hostBId, {
      id: hostBId,
      email: userB.email,
      fullName: 'SecHost Beta',
      role: 'host',
      status: 'active',
      createdAt: userB.createdAt,
      updatedAt: userB.createdAt,
    });

    hostAToken = authService.signToken(userA, 3600);
    hostAClient.setAuthToken(hostAToken);

    hostBToken = authService.signToken(userB, 3600);
    hostBClient.setAuthToken(hostBToken);

    customerToken = authService.signToken(
      {
        id: customerId,
        email: 'driver.sec@parkeazy.internal',
        firstName: 'SecDriver',
        lastName: 'User',
        roles: [UserRole.CUSTOMER],
        isHostVerified: false,
        createdAt: new Date().toISOString(),
      },
      3600
    );
    customerClient.setAuthToken(customerToken);
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
  // 1. Authentication & Route Protection
  // --------------------------------------------------------------------------
  describe('1. Authentication and Route Protection', () => {
    test('1.1 Unauthenticated requests cannot access protected host facilities endpoint (401)', async () => {
      await assert.rejects(
        async () => {
          await anonClient.getHostFacilities(hostAId);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.statusCode, 401);
          return true;
        }
      );
    });

    test('1.2 Non-host principal (Customer) cannot access host facilities endpoint (403)', async () => {
      await assert.rejects(
        async () => {
          await customerClient.getHostFacilities(hostAId);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    test('1.3 Authenticated Host A can access their own facility list (200)', async () => {
      const facilities = await hostAClient.getHostFacilities(hostAId);
      assert.ok(Array.isArray(facilities));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Tenant Isolation & Identity derivation (No Trust of Client IDs)
  // --------------------------------------------------------------------------
  describe('2. Tenant Isolation and Cross-Host Access Rejection', () => {
    let hostAFacilityId: string;
    let hostASpaceId: string;

    test('2.1 Host A creates a facility and ownership is strictly bound to Host A', async () => {
      const created = await hostAClient.createHostFacility(hostAId, {
        name: 'Alpha Secured Garage',
        description: 'Multi-level secure garage owned by Host Alpha.',
        propertyType: PropertyType.GARAGE,
        address: {
          line1: '100 Alpha Boulevard',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'US',
          latitude: 37.789,
          longitude: -122.401,
        },
        accessMethod: AccessMethod.GATE_CODE,
        accessInstructions: 'Keycode 1234',
        hourlyRateCents: 600,
        dailyRateCents: 3500,
      });

      assert.ok(created.id);
      assert.strictEqual(created.hostId, hostAId);
      hostAFacilityId = created.id;

      // Add a parking space
      const bay = await hostAClient.createHostSpace(hostAId, hostAFacilityId, {
        bayNumber: 'A-01',
        bayType: BayType.STANDARD,
        levelOrFloor: 'Ground',
        status: BayStatus.AVAILABLE,
      });
      assert.ok(bay.id);
      assert.strictEqual(bay.locationId, hostAFacilityId);
      hostASpaceId = bay.id;
    });

    test('2.2 Client-supplied hostId in body or header cannot override authenticated principal', async () => {
      // Host A attempts to pass another hostId in payload
      const createdWithFakeHost = await hostAClient.createHostFacility(hostAId, {
        name: 'Spoofed Facility Creation',
        description: 'Attempting to inject a different hostId into the body.',
        address: {
          line1: '200 Spoof St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
        },
        // Attempt mass assignment of hostId
        ...({ hostId: hostBId } as any),
      });

      // The server must bind hostId to the authenticated principal (hostAId), not the body
      assert.strictEqual(createdWithFakeHost.hostId, hostAId);
      assert.notStrictEqual(createdWithFakeHost.hostId, hostBId);
    });

    test('2.3 Host B cannot view Host A facility by substituting facilityId (403 or 404)', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.getHostFacility(hostBId, hostAFacilityId);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });

    test('2.4 Host B cannot update Host A facility (403 or 404)', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.updateHostFacility(hostBId, hostAFacilityId, {
            name: 'Hijacked by Host B',
          });
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });

    test('2.5 Host B cannot delete Host A facility (403 or 404)', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.deleteHostFacility(hostBId, hostAFacilityId);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });

    test('2.6 Host B cannot add or modify parking spaces in Host A facility (403 or 404)', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.createHostSpace(hostBId, hostAFacilityId, {
            bayNumber: 'B-HACK',
            bayType: BayType.STANDARD,
          });
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await hostBClient.updateHostSpace(hostBId, hostAFacilityId, hostASpaceId, {
            bayNumber: 'B-TAMPERED',
          });
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });

    test('2.7 Host B cannot query Host A facility spaces (403 or 404)', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.getHostSpaces(hostBId, hostAFacilityId);
        },
        (err: any) => {
          assert.ok(err instanceof ApiError);
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. Mass-Assignment & Protected Field Immutability
  // --------------------------------------------------------------------------
  describe('3. Mass-Assignment and Protected Fields Protection', () => {
    test('3.1 Updating user profile rejects protected role, id, and verified fields', async () => {
      const port = (server.address() as { port: number }).port;
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/users/${hostAId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hostAToken}`,
        },
        body: JSON.stringify({
          firstName: 'LegitName',
          roles: [UserRole.SUPER_ADMIN],
          isHostVerified: true,
        }),
      });

      // The server must reject modification of protected fields with 400
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error?.code, 'PROTECTED_FIELD_MODIFICATION');
    });

    test('3.2 Facility update cannot overwrite facility id or owner hostId', async () => {
      const facilities = await hostAClient.getHostFacilities(hostAId);
      assert.ok(facilities.length > 0);
      const targetFac = facilities[0];

      const updated = await hostAClient.updateHostFacility(hostAId, targetFac.id, {
        name: 'Renamed Facility',
        ...({ id: 'loc-stolen-id', hostId: hostBId } as any),
      });

      assert.strictEqual(updated.id, targetFac.id);
      assert.strictEqual(updated.hostId, hostAId);
    });
  });

  // --------------------------------------------------------------------------
  // 4. PostgreSQL Persistence & Reinitialization Resilience
  // --------------------------------------------------------------------------
  describe('4. PostgreSQL Persistence and Service Reinitialization Resilience', () => {
    const isPgMem = dbManager.isUsingPgMem();
    const dbTypeLabel = isPgMem
      ? 'In-Memory pg-mem (PostgreSQL SQL engine emulator)'
      : 'Live Remote PostgreSQL Database';

    let persistedFacilityId: string;
    let persistedBayId: string;

    test(`4.1 Host facility and bay records are committed to PostgreSQL store (${dbTypeLabel})`, async () => {
      const facility = await hostAClient.createHostFacility(hostAId, {
        name: 'Persistent Plaza Facility',
        description: 'Facility created to verify PostgreSQL persistence across restarts.',
        address: {
          line1: '500 Persistence Ave',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94107',
        },
        hourlyRateCents: 750,
      });
      persistedFacilityId = facility.id;

      const bay = await hostAClient.createHostSpace(hostAId, persistedFacilityId, {
        bayNumber: 'P-101',
        bayType: BayType.EV_CHARGING,
        levelOrFloor: 'P1',
        isEvCharging: true,
        evChargerKw: 22,
      });
      persistedBayId = bay.id;

      // Verify the records exist authoritatively in PostgreSQL via raw SQL query
      const locDb = await dbManager.query('SELECT * FROM parking_locations WHERE id = $1', [persistedFacilityId]);
      assert.strictEqual(locDb.rows.length, 1);
      assert.strictEqual(locDb.rows[0].name, 'Persistent Plaza Facility');
      assert.strictEqual(locDb.rows[0].host_id, hostAId);

      const bayDb = await dbManager.query('SELECT * FROM parking_bays WHERE id = $1', [persistedBayId]);
      assert.strictEqual(bayDb.rows.length, 1);
      assert.strictEqual(bayDb.rows[0].bay_number, 'P-101');
      assert.strictEqual(bayDb.rows[0].location_id, persistedFacilityId);
    });

    test(`4.2 Service reinitialization reloads records authoritatively from PostgreSQL (simulated in-process reinitialization, ${dbTypeLabel})`, async () => {
      // 1. Wipe in-memory collections completely
      (inventoryService as any).locations = [];
      (inventoryService as any).bays = [];
      assert.strictEqual(inventoryService.getAllLocations().length, 0);

      // 2. Wipe the JSON storage file on disk to guarantee it cannot cheat by reading local file cache
      const diskPath = (inventoryService as any).storageFilePath;
      const fs = await import('fs');
      if (fs.existsSync(diskPath)) {
        fs.writeFileSync(diskPath, JSON.stringify({ locations: [], bays: [] }), 'utf-8');
      }

      // 3. Re-initialize inventory service from PostgreSQL (as performed during application startup)
      await inventoryService.initialize();

      // 4. Verify reloaded facility data restored authoritatively from PostgreSQL
      const reloadedFacility = inventoryService.getLocationById(persistedFacilityId);
      assert.ok(reloadedFacility, 'Facility must survive reinitialization and be restored from PostgreSQL');
      assert.strictEqual(reloadedFacility.name, 'Persistent Plaza Facility');
      assert.strictEqual(reloadedFacility.hostId, hostAId);
      assert.strictEqual(reloadedFacility.address.line1, '500 Persistence Ave');

      // 5. Verify reloaded bay data restored authoritatively from PostgreSQL
      const reloadedBay = inventoryService.getBayById(persistedBayId);
      assert.ok(reloadedBay, 'Bay must survive reinitialization and be restored from PostgreSQL');
      assert.strictEqual(reloadedBay.bayNumber, 'P-101');
      assert.strictEqual(reloadedBay.locationId, persistedFacilityId);
      assert.strictEqual(reloadedBay.isEvCharging, true);
      assert.strictEqual(reloadedBay.evChargerKw, 22);

      // 6. Verify HTTP API client reads back the reloaded facility from the reinitialized service
      const hostFacilities = await hostAClient.getHostFacilities(hostAId);
      const matching = hostFacilities.find((f) => f.id === persistedFacilityId);
      assert.ok(matching, 'Host facility list must include PostgreSQL-persisted facility');
      assert.strictEqual(matching.name, 'Persistent Plaza Facility');

      const hostSpaces = await hostAClient.getHostSpaces(hostAId, persistedFacilityId);
      const matchingSpace = hostSpaces.find((s) => s.id === persistedBayId);
      assert.ok(matchingSpace, 'Host space list must include PostgreSQL-persisted bay');
      assert.strictEqual(matchingSpace.bayNumber, 'P-101');
    });

    test('4.3 Server-side route layer server/routes.ts enforces host authorization on facilities and bays', async () => {
      const port = (server.address() as { port: number }).port;

      // 1. Unauthenticated request to /api/facilities with hostId query parameter
      const unauthHostQuery = await fetch(`http://127.0.0.1:${port}/api/facilities?hostId=${hostAId}`);
      assert.strictEqual(unauthHostQuery.status, 401);

      // 2. Authenticated Host B attempting to query Host A's facilities on /api/facilities?hostId=...
      const crossHostQuery = await fetch(`http://127.0.0.1:${port}/api/facilities?hostId=${hostAId}`, {
        headers: {
          'Authorization': `Bearer ${hostBToken}`,
        },
      });
      assert.strictEqual(crossHostQuery.status, 403);

      // 3. Authenticated Host A can query their own facilities on /api/facilities?hostId=...
      const ownHostQuery = await fetch(`http://127.0.0.1:${port}/api/facilities?hostId=${hostAId}`, {
        headers: {
          'Authorization': `Bearer ${hostAToken}`,
        },
      });
      assert.strictEqual(ownHostQuery.status, 200);
      const data = await ownHostQuery.json();
      assert.ok(Array.isArray(data));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Fail-Closed Behavior on Database Failure
  // --------------------------------------------------------------------------
  describe('5. Safe Failure Handling on Database Disconnection (No False Success)', () => {
    test('5.1 Health check reports 503 if PostgreSQL is disconnected in production mode', async () => {
      const port = (server.address() as { port: number }).port;
      const prevEnv = process.env.NODE_ENV;
      const prevConnected = (dbManager as any).isConnected;

      try {
        process.env.NODE_ENV = 'production';
        (dbManager as any).isConnected = false;

        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        assert.strictEqual(res.status, 503);
        const body = await res.json();
        assert.strictEqual(body.status, 'down');
        assert.ok(body.message?.includes('PostgreSQL database unavailable in production'));
      } finally {
        process.env.NODE_ENV = prevEnv;
        (dbManager as any).isConnected = prevConnected;
      }
    });

    test('5.2 Inventory service throws fail-closed error instead of fake success when database is disconnected in production', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevConnected = (dbManager as any).isConnected;

      try {
        process.env.NODE_ENV = 'production';
        (dbManager as any).isConnected = false;

        await assert.rejects(
          async () => {
            await inventoryService.syncLocationToPostgres({
              id: 'loc-fail-test',
              hostId: hostAId,
              name: 'Fail Test Facility',
              description: 'Should fail closed',
              propertyType: PropertyType.GARAGE,
              address: {
                line1: '123 Test St',
                city: 'San Francisco',
                state: 'CA',
                postalCode: '94105',
                country: 'US',
                latitude: 37.77,
                longitude: -122.41,
              },
              timezone: 'America/Los_Angeles',
              accessMethod: AccessMethod.OPEN_ACCESS,
              status: LocationStatus.DRAFT,
              totalBays: 0,
              hourlyRateCents: 500,
              dailyRateCents: 3000,
              securityDepositCents: 1000,
              amenities: [],
              photos: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          },
          (err: any) => {
            assert.strictEqual(err.statusCode, 503);
            assert.strictEqual(err.code, 'DATABASE_UNAVAILABLE');
            return true;
          }
        );
      } finally {
        process.env.NODE_ENV = prevEnv;
        (dbManager as any).isConnected = prevConnected;
      }
    });

    test('5.3 Failed database write rolls back in-memory mutation without returning false success (fail-closed atomic rollback)', async () => {
      const origSync = inventoryService.syncLocationToPostgres;
      try {
        // Force syncLocationToPostgres to throw database error
        inventoryService.syncLocationToPostgres = async () => {
          throw new Error('SIMULATED_DB_WRITE_FAILURE');
        };

        const port = (server.address() as { port: number }).port;
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/hosts/${hostAId}/facilities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hostAToken}`,
          },
          body: JSON.stringify({
            name: 'Failed DB Facility',
            description: 'This facility write will fail in the database.',
            address: {
              line1: '999 Fail Safe St',
              city: 'San Francisco',
              state: 'CA',
              postalCode: '94105',
            },
          }),
        });

        // The request must fail and NOT return 200/201 success
        assert.notStrictEqual(res.status, 200);
        assert.notStrictEqual(res.status, 201);

        // Verify the facility was NOT retained in inventoryService memory
        const found = inventoryService.getAllLocations().find((l) => l.name === 'Failed DB Facility');
        assert.strictEqual(found, undefined, 'Unpersisted facility must be rolled back from memory');
      } finally {
        inventoryService.syncLocationToPostgres = origSync;
      }
    });
  });
});
