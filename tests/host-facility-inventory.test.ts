process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_AUTH = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { ParkEazyApiClient, ApiError } from '../packages/api-client/client';
import { authService } from '../apps/api/services/auth.service';
import { inventoryService } from '../apps/api/services/inventory.service';
import { DEMO_USERS } from '../apps/api/middleware/auth-guard';
import {
  UserRole,
  LocationStatus,
  BayType,
  BayStatus,
  PropertyType,
  AccessMethod,
  VehicleCategory,
} from '../packages/contracts';

describe('Phase 2 — Host Facility & Parking-Space Inventory Management', () => {
  let server: http.Server;
  let baseUrl: string;
  let anonClient: ParkEazyApiClient;
  let hostAClient: ParkEazyApiClient;
  let hostBClient: ParkEazyApiClient;
  let customerClient: ParkEazyApiClient;

  const hostAId = 'usr-host-facility-a';
  const hostBId = 'usr-host-facility-b';

  before(async () => {
    authService.resetStores();
    inventoryService.resetStores();

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

    const hostAToken = authService.signToken(
      {
        id: hostAId,
        email: 'host.a@parkeazy.internal',
        firstName: 'Host',
        lastName: 'Alpha',
        roles: [UserRole.HOST],
        isHostVerified: true,
        createdAt: new Date().toISOString(),
      },
      3600
    );
    hostAClient.setAuthToken(hostAToken);

    const hostBToken = authService.signToken(
      {
        id: hostBId,
        email: 'host.b@parkeazy.internal',
        firstName: 'Host',
        lastName: 'Beta',
        roles: [UserRole.HOST],
        isHostVerified: true,
        createdAt: new Date().toISOString(),
      },
      3600
    );
    hostBClient.setAuthToken(hostBToken);

    const customerToken = authService.signToken(DEMO_USERS.customer, 3600);
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
  // 1. FACILITY LIFECYCLE & OVERVIEW
  // --------------------------------------------------------------------------
  describe('1. Host Facility Overview & Creation', () => {
    test('1.1 Initial facility list for new host is empty', async () => {
      const facilities = await hostAClient.getHostFacilities(hostAId);
      assert.ok(Array.isArray(facilities));
      assert.strictEqual(facilities.length, 0);
    });

    test('1.2 Creating facility with missing required fields fails with 400', async () => {
      await assert.rejects(
        async () => {
          await hostAClient.createHostFacility(hostAId, {
            name: '',
            description: 'Short',
            address: { line1: '', city: '', state: '', postalCode: '' },
          });
        },
        (err: ApiError) => {
          assert.strictEqual(err.statusCode, 400);
          return true;
        }
      );
    });

    let createdFacilityId: string;

    test('1.3 Successfully creates a new parking facility in DRAFT status', async () => {
      const facility = await hostAClient.createHostFacility(hostAId, {
        name: 'Grand Metro Centre Car Park',
        description: 'Prime central business district multi-storey covered parking facility with 24/7 access.',
        propertyType: PropertyType.GARAGE,
        address: {
          line1: '789 Market Street',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94103',
          country: 'US',
          latitude: 37.7879,
          longitude: -122.4075,
        },
        timezone: 'America/Los_Angeles',
        accessMethod: AccessMethod.GATE_CODE,
        accessInstructions: 'Enter code 5849# at the security barrier.',
        hourlyRateCents: 500,
        dailyRateCents: 3500,
        securityDepositCents: 1500,
        amenities: ['CCTV Security', 'Covered Garage', 'Elevator Access', 'EV Charging'],
      });

      assert.ok(facility.id);
      assert.strictEqual(facility.hostId, hostAId);
      assert.strictEqual(facility.name, 'Grand Metro Centre Car Park');
      assert.strictEqual(facility.status, LocationStatus.DRAFT);
      assert.strictEqual(facility.totalBays, 0);
      assert.strictEqual(facility.hourlyRateCents, 500);

      createdFacilityId = facility.id;
    });

    test('1.4 Created facility appears in host facility list', async () => {
      const facilities = await hostAClient.getHostFacilities(hostAId);
      assert.strictEqual(facilities.length, 1);
      assert.strictEqual(facilities[0].id, createdFacilityId);
      assert.strictEqual(facilities[0].name, 'Grand Metro Centre Car Park');
    });

    test('1.5 Retrieve single facility by ID', async () => {
      const facility = await hostAClient.getHostFacility(hostAId, createdFacilityId);
      assert.strictEqual(facility.id, createdFacilityId);
      assert.strictEqual(facility.address.line1, '789 Market Street');
    });

    test('1.6 Updating facility details updates persisted attributes', async () => {
      const updated = await hostAClient.updateHostFacility(hostAId, createdFacilityId, {
        name: 'Grand Metro Centre Car Park (Updated)',
        hourlyRateCents: 600,
        dailyRateCents: 4000,
        amenities: ['CCTV Security', 'Covered Garage', 'Elevator Access', 'EV Charging', '24/7 Access'],
      });

      assert.strictEqual(updated.name, 'Grand Metro Centre Car Park (Updated)');
      assert.strictEqual(updated.hourlyRateCents, 600);
      assert.strictEqual(updated.dailyRateCents, 4000);
      assert.ok(updated.amenities.includes('24/7 Access'));
    });
  });

  // --------------------------------------------------------------------------
  // 2. PARKING SPACE (BAY) INVENTORY MANAGEMENT
  // --------------------------------------------------------------------------
  describe('2. Parking Space (Bay) Inventory Management', () => {
    let facilityId: string;
    let space1Id: string;
    let space2Id: string;

    before(async () => {
      const facilities = await hostAClient.getHostFacilities(hostAId);
      facilityId = facilities[0].id;
    });

    test('2.1 Initial facility space list is empty', async () => {
      const spaces = await hostAClient.getHostSpaces(hostAId, facilityId);
      assert.ok(Array.isArray(spaces));
      assert.strictEqual(spaces.length, 0);
    });

    test('2.2 Create a standard parking space', async () => {
      const space = await hostAClient.createHostSpace(hostAId, facilityId, {
        bayNumber: 'A-101',
        bayType: BayType.STANDARD,
        levelOrFloor: 'Level 1',
        status: BayStatus.AVAILABLE,
        maxVehicleHeightMeters: 2.1,
        maxVehicleLengthMeters: 5.2,
        maxVehicleWidthMeters: 2.3,
        supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.COMPACT, VehicleCategory.SUV],
        isCovered: true,
        hasCctv: true,
        notes: 'Close to exit ramp',
      });

      assert.ok(space.id);
      assert.strictEqual(space.locationId, facilityId);
      assert.strictEqual(space.bayNumber, 'A-101');
      assert.strictEqual(space.bayType, BayType.STANDARD);
      assert.strictEqual(space.status, BayStatus.AVAILABLE);

      space1Id = space.id;

      // Check facility totalBays count auto-updated
      const facility = await hostAClient.getHostFacility(hostAId, facilityId);
      assert.strictEqual(facility.totalBays, 1);
    });

    test('2.3 Create an EV charging space with electrical specs', async () => {
      const space = await hostAClient.createHostSpace(hostAId, facilityId, {
        bayNumber: 'EV-01',
        bayType: BayType.EV_CHARGING,
        levelOrFloor: 'Level 1',
        status: BayStatus.AVAILABLE,
        isEvCharging: true,
        evChargerKw: 22,
        isCovered: true,
        hasCctv: true,
        supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.COMPACT, VehicleCategory.SUV],
        notes: '22kW Level 2 Type 2 connector',
      });

      assert.ok(space.id);
      assert.strictEqual(space.bayNumber, 'EV-01');
      assert.strictEqual(space.isEvCharging, true);
      assert.strictEqual(space.evChargerKw, 22);

      space2Id = space.id;

      const facility = await hostAClient.getHostFacility(hostAId, facilityId);
      assert.strictEqual(facility.totalBays, 2);
    });

    test('2.4 Prevents duplicate bay number in same facility', async () => {
      await assert.rejects(
        async () => {
          await hostAClient.createHostSpace(hostAId, facilityId, {
            bayNumber: 'A-101',
            bayType: BayType.STANDARD,
          });
        },
        (err: ApiError) => {
          assert.ok(err.statusCode === 409 || err.statusCode === 400);
          return true;
        }
      );
    });

    test('2.5 Update space attributes and status', async () => {
      const updated = await hostAClient.updateHostSpace(hostAId, facilityId, space1Id, {
        status: BayStatus.MAINTENANCE,
        notes: 'Repainting lines',
      });

      assert.strictEqual(updated.id, space1Id);
      assert.strictEqual(updated.status, BayStatus.MAINTENANCE);
      assert.strictEqual(updated.notes, 'Repainting lines');

      // Revert back to AVAILABLE
      await hostAClient.updateHostSpace(hostAId, facilityId, space1Id, {
        status: BayStatus.AVAILABLE,
      });
    });

    test('2.6 Delete a space and verify totalBays decrements', async () => {
      // Create temporary space to delete
      const tempSpace = await hostAClient.createHostSpace(hostAId, facilityId, {
        bayNumber: 'TEMP-99',
        bayType: BayType.COMPACT,
      });

      let facility = await hostAClient.getHostFacility(hostAId, facilityId);
      assert.strictEqual(facility.totalBays, 3);

      await hostAClient.deleteHostSpace(hostAId, facilityId, tempSpace.id);

      facility = await hostAClient.getHostFacility(hostAId, facilityId);
      assert.strictEqual(facility.totalBays, 2);

      const spaces = await hostAClient.getHostSpaces(hostAId, facilityId);
      assert.strictEqual(spaces.length, 2);
      assert.ok(!spaces.some((s) => s.id === tempSpace.id));
    });
  });

  // --------------------------------------------------------------------------
  // 3. PHOTO MANAGEMENT
  // --------------------------------------------------------------------------
  describe('3. Facility Photo Management', () => {
    let facilityId: string;
    let addedPhotoId: string;

    before(async () => {
      const facilities = await hostAClient.getHostFacilities(hostAId);
      facilityId = facilities[0].id;
    });

    test('3.1 Add photo to facility', async () => {
      const updated = await hostAClient.addFacilityPhoto(hostAId, facilityId, {
        url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a',
        caption: 'Entrance ramp and security barrier',
        isPrimary: true,
      });

      assert.ok(updated.photos && updated.photos.length > 0);
      const photo = updated.photos[0];
      assert.strictEqual(photo.caption, 'Entrance ramp and security barrier');
      assert.strictEqual(photo.isPrimary, true);
      assert.strictEqual(updated.imageUrl, photo.url);

      addedPhotoId = photo.id;
    });

    test('3.2 Delete photo from facility', async () => {
      const updated = await hostAClient.deleteFacilityPhoto(hostAId, facilityId, addedPhotoId);
      assert.strictEqual(updated.photos?.length || 0, 0);

      // Re-add a valid photo for publishing requirements
      await hostAClient.addFacilityPhoto(hostAId, facilityId, {
        url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a',
        caption: 'Facility exterior',
        isPrimary: true,
      });
    });
  });

  // --------------------------------------------------------------------------
  // 4. PUBLICATION READINESS, PUBLISHING & MARKETPLACE INTEGRATION
  // --------------------------------------------------------------------------
  describe('4. Publication Readiness & Publishing Workflow', () => {
    let facilityId: string;

    before(async () => {
      const facilities = await hostAClient.getHostFacilities(hostAId);
      facilityId = facilities[0].id;
    });

    test('4.1 Facility with active spaces, address, pricing and photo is ready to publish', async () => {
      const readiness = await hostAClient.getPublicationReadiness(hostAId, facilityId);
      assert.strictEqual(readiness.facilityId, facilityId);
      assert.strictEqual(readiness.isReady, true);
      assert.strictEqual(readiness.missingRequirements.length, 0);
      assert.ok(readiness.checks.every((c) => c.passed));
    });

    test('4.2 Unready facility returns failing publication readiness and missing requirements', async () => {
      // Create empty draft facility
      const emptyFacility = await hostAClient.createHostFacility(hostAId, {
        name: 'Empty Draft Yard',
        description: 'No spaces added yet.',
        address: {
          line1: '100 Desert Road',
          city: 'Las Vegas',
          state: 'NV',
          postalCode: '89101',
        },
        hourlyRateCents: 0,
        dailyRateCents: 0,
      });

      const readiness = await hostAClient.getPublicationReadiness(hostAId, emptyFacility.id);
      assert.strictEqual(readiness.isReady, false);
      assert.ok(readiness.missingRequirements.length > 0);

      // Attempting to publish unready facility fails with 400
      await assert.rejects(
        async () => {
          await hostAClient.publishHostFacility(hostAId, emptyFacility.id);
        },
        (err: ApiError) => {
          assert.strictEqual(err.statusCode, 400);
          return true;
        }
      );

      // Clean up empty facility
      await hostAClient.deleteHostFacility(hostAId, emptyFacility.id);
    });

    test('4.3 Publishing valid facility transitions status to ACTIVE and records publishedAt', async () => {
      const res = await hostAClient.publishHostFacility(hostAId, facilityId);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.facility.status, LocationStatus.ACTIVE);
      assert.ok(res.facility.publishedAt);
    });

    test('4.4 Published facility is visible in public / customer marketplace inventory', async () => {
      const publicLocations = await customerClient.getLocations();
      const published = publicLocations.find((loc) => loc.id === facilityId);
      assert.ok(published, 'Published facility should appear in customer locations');
      assert.strictEqual(published.status, LocationStatus.ACTIVE);
      assert.strictEqual(published.name, 'Grand Metro Centre Car Park (Updated)');
    });

    test('4.5 Unpublishing facility transitions status to DRAFT and removes from customer search', async () => {
      const unpublished = await hostAClient.unpublishHostFacility(hostAId, facilityId);
      assert.strictEqual(unpublished.status, LocationStatus.DRAFT);

      const publicLocations = await customerClient.getLocations();
      const found = publicLocations.find((loc) => loc.id === facilityId);
      assert.strictEqual(found, undefined, 'Unpublished facility should not appear in customer locations');

      // Re-publish for subsequent tests
      await hostAClient.publishHostFacility(hostAId, facilityId);
    });
  });

  // --------------------------------------------------------------------------
  // 5. SECURITY & TENANCY INVARIANTS (MANDATORY DEFENSE)
  // --------------------------------------------------------------------------
  describe('5. Security, Tenancy & Access Control Invariants', () => {
    let facilityAId: string;

    before(async () => {
      const facilities = await hostAClient.getHostFacilities(hostAId);
      facilityAId = facilities[0].id;
    });

    test('5.1 Unauthenticated requests are rejected with 401', async () => {
      await assert.rejects(
        async () => {
          await anonClient.getHostFacilities(hostAId);
        },
        (err: ApiError) => {
          assert.strictEqual(err.statusCode, 401);
          return true;
        }
      );
    });

    test('5.2 Customer role cannot access host facility endpoints (403)', async () => {
      await assert.rejects(
        async () => {
          await customerClient.getHostFacilities(hostAId);
        },
        (err: ApiError) => {
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    test('5.3 Host B cannot view Host A facility (cross-tenant isolation: 403 or 404)', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.getHostFacility(hostBId, facilityAId);
        },
        (err: ApiError) => {
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });

    test('5.4 Host B cannot update Host A facility', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.updateHostFacility(hostBId, facilityAId, {
            name: 'Hijacked Facility',
          });
        },
        (err: ApiError) => {
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });

    test('5.5 Host B cannot add parking spaces to Host A facility', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.createHostSpace(hostBId, facilityAId, {
            bayNumber: 'B-HACK',
            bayType: BayType.STANDARD,
          });
        },
        (err: ApiError) => {
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });

    test('5.6 Host B cannot delete Host A facility', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.deleteHostFacility(hostBId, facilityAId);
        },
        (err: ApiError) => {
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });

    test('5.7 Host B cannot publish Host A facility', async () => {
      await assert.rejects(
        async () => {
          await hostBClient.publishHostFacility(hostBId, facilityAId);
        },
        (err: ApiError) => {
          assert.ok(err.statusCode === 403 || err.statusCode === 404);
          return true;
        }
      );
    });
  });
});
