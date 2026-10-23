import { describe, it, expect, beforeEach } from 'vitest';
import { FacilitiesService } from '../services/api/src/modules/facilities/facilities.service';
import { inventoryService } from '../apps/api/services/inventory.service';
import { db } from '../server/db';
import {
  CreateFacilityPayload,
  CreateSpacePayload,
  UpdateFacilityPayload,
  UpdateSpacePayload,
} from '@parkeazy/shared-types';
import { BayStatus, LocationStatus } from '@parkeazy/contracts';

describe('Roadmap Point 3A: Facilities, Bays and Media - Comprehensive Verification', () => {
  let facilitiesService: FacilitiesService;
  const HOST_1 = '00000000-0000-4000-a000-000000000002';
  const HOST_2 = '00000000-0000-4000-a000-000000000003';
  const TENANT_A = 'default';
  const TENANT_B = 'tenant-corp';

  beforeEach(() => {
    facilitiesService = new FacilitiesService();
  });

  describe('3A.1 Facility Lifecycle (Create, Edit, Draft, Publish, Unpublish, Delete)', () => {
    it('should create a new facility in draft state with strict host ownership', async () => {
      const payload: CreateFacilityPayload = {
        name: 'Metro Center Parking Hub',
        addressLine1: '100 Metro Boulevard',
        city: 'Chennai',
        postalCode: '600001',
        latitude: 13.0827,
        longitude: 80.2707,
        operatingModel: 'commercial_garage',
        isCovered: true,
        is24x7: true,
        maxHeightClearanceMeters: 2.2,
      };

      const created = await facilitiesService.createFacility(HOST_1, TENANT_A, payload);
      expect(created.id).toBeDefined();
      expect(created.hostId).toBe(HOST_1);
      expect(created.status).toBe('draft');
      expect(created.name).toBe('Metro Center Parking Hub');
      expect(created.totalSpaces).toBe(0);

      // Verify Host 2 cannot view or mutate Host 1 draft facility
      await expect(
        facilitiesService.getFacility(created.id, HOST_2, TENANT_A)
      ).rejects.toThrow();

      // Verify cross-tenant isolation: same host under different tenant cannot access
      await expect(
        facilitiesService.getFacility(created.id, HOST_1, TENANT_B)
      ).rejects.toThrow();
    });

    it('should update facility metadata while preserving host tenancy', async () => {
      const payload: CreateFacilityPayload = {
        name: 'Alpha Hub Draft',
        addressLine1: '1 Alpha Road',
        city: 'Chennai',
        postalCode: '600002',
        latitude: 13.08,
        longitude: 80.27,
      };
      const created = await facilitiesService.createFacility(HOST_1, TENANT_A, payload);

      const updatePayload: UpdateFacilityPayload = {
        name: 'Alpha Executive Tower',
        entranceInstructions: 'Use Barrier Gate B with QR code',
        gatePinCode: '7721',
      };
      const updated = await facilitiesService.updateFacility(created.id, HOST_1, TENANT_A, updatePayload);
      expect(updated.name).toBe('Alpha Executive Tower');
      expect(updated.entranceInstructions).toBe('Use Barrier Gate B with QR code');
      expect(updated.gatePinCode).toBe('7721');
    });

    it('should prevent publication if readiness conditions (spaces, photos) are not met', async () => {
      const payload: CreateFacilityPayload = {
        name: 'Incomplete Hub',
        addressLine1: '50 South Avenue',
        city: 'Chennai',
        postalCode: '600040',
        latitude: 13.05,
        longitude: 80.21,
      };
      const created = await facilitiesService.createFacility(HOST_1, TENANT_A, payload);

      const readiness = await facilitiesService.getPublicationReadiness(created.id, HOST_1, TENANT_A);
      expect(readiness.isReady).toBe(false);
      expect(readiness.missingRequirements.length).toBeGreaterThan(0);

      await expect(
        facilitiesService.publishFacility(created.id, HOST_1, TENANT_A)
      ).rejects.toThrow(/cannot be published|missing requirements/i);
    });

    it('should publish facility when readiness is satisfied and support unpublish lifecycle', async () => {
      const payload: CreateFacilityPayload = {
        name: 'Ready Commercial Facility',
        addressLine1: '88 Express Highway',
        city: 'Chennai',
        postalCode: '600096',
        latitude: 12.97,
        longitude: 80.24,
        operatingModel: 'commercial_garage',
        isCovered: true,
        is24x7: true,
        maxHeightClearanceMeters: 2.2,
        entranceInstructions: 'Enter through Gate 1 with app scan',
      };
      const created = await facilitiesService.createFacility(HOST_1, TENANT_A, payload);

      // Add a valid space
      await facilitiesService.createSpace(created.id, HOST_1, TENANT_A, {
        bayIdentifier: 'BAY-01',
        floorLevel: 'Ground',
        vehicleCategory: 'car',
        hourlyRateInr: 60,
      });

      // Add a photo
      await facilitiesService.addFacilityPhoto(created.id, HOST_1, TENANT_A, {
        url: '/assets/images/hero_parking_bay_1792157347279.jpg',
        caption: 'Main Entrance View',
        isPrimary: true,
      });

      // Check readiness
      const readiness = await facilitiesService.getPublicationReadiness(created.id, HOST_1, TENANT_A);
      expect(readiness.isReady).toBe(true);

      // Publish
      const published = await facilitiesService.publishFacility(created.id, HOST_1, TENANT_A);
      expect(published.status).toBe('published');
      expect((published as any).publishedAt).toBeDefined();

      // Unpublish back to draft
      const unpublished = await facilitiesService.unpublishFacility(created.id, HOST_1, TENANT_A);
      expect(unpublished.status).toBe('draft');

      // Update status directly to suspended and back to active
      const suspended = await facilitiesService.updateFacilityStatus(created.id, HOST_1, TENANT_A, 'suspended');
      expect(suspended.status).toBe('suspended');

      const restored = await facilitiesService.updateFacilityStatus(created.id, HOST_1, TENANT_A, 'published');
      expect(restored.status).toBe('published');
    });

    it('should delete facility and clean up inventory when no active bookings exist', async () => {
      const created = await facilitiesService.createFacility(HOST_1, TENANT_A, {
        name: 'Temporary Facility',
        addressLine1: '12 Temp Lane',
        city: 'Chennai',
        postalCode: '600001',
        latitude: 13.0,
        longitude: 80.2,
      });

      await facilitiesService.createSpace(created.id, HOST_1, TENANT_A, {
        bayIdentifier: 'TEMP-01',
        floorLevel: 'Ground',
        vehicleCategory: 'car',
        hourlyRateInr: 40,
      });

      const result = await facilitiesService.deleteFacility(created.id, HOST_1, TENANT_A);
      expect(result.success).toBe(true);

      // Facility should no longer exist
      await expect(
        facilitiesService.getFacility(created.id, HOST_1, TENANT_A)
      ).rejects.toThrow();
    });
  });

  describe('3A.2 Individual Parking Bay Operations (CRUD & Validation)', () => {
    let testFacilityId: string;

    beforeEach(async () => {
      const facility = await facilitiesService.createFacility(HOST_1, TENANT_A, {
        name: 'Bay Test Facility',
        addressLine1: '99 Test Road',
        city: 'Chennai',
        postalCode: '600005',
        latitude: 13.06,
        longitude: 80.28,
      });
      testFacilityId = facility.id;
    });

    it('should create a parking bay with dimensional constraints and EV attributes', async () => {
      const payload: CreateSpacePayload = {
        bayIdentifier: 'EV-101',
        floorLevel: 'Basement 1',
        vehicleCategory: 'suv',
        hasEvCharger: true,
        evChargerPowerKw: 22.0,
        isDisabledAccessible: true,
        hourlyRateInr: 120.0,
        maxLengthMeters: 5.2,
        maxWidthMeters: 2.4,
        maxHeightMeters: 2.3,
        fuelCompatibility: ['electric'],
      };

      const space = await facilitiesService.createSpace(testFacilityId, HOST_1, TENANT_A, payload);
      expect(space.id).toBeDefined();
      expect(space.bayIdentifier).toBe('EV-101');
      expect(space.hasEvCharger).toBe(true);
      expect(space.evChargerPowerKw).toBe(22.0);
      expect(space.status).toBe('available');

      // Facility totalSpaces should be incremented
      const fac = await facilitiesService.getFacility(testFacilityId, HOST_1, TENANT_A);
      expect(fac.totalSpaces).toBe(1);
    });

    it('should reject duplicate bay identifiers within the same facility', async () => {
      await facilitiesService.createSpace(testFacilityId, HOST_1, TENANT_A, {
        bayIdentifier: 'SLOT-A',
        floorLevel: 'G',
        vehicleCategory: 'car',
        hourlyRateInr: 50,
      });

      await expect(
        facilitiesService.createSpace(testFacilityId, HOST_1, TENANT_A, {
          bayIdentifier: 'SLOT-A',
          floorLevel: 'G',
          vehicleCategory: 'car',
          hourlyRateInr: 50,
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('should read, update, and change status of an individual bay', async () => {
      const space = await facilitiesService.createSpace(testFacilityId, HOST_1, TENANT_A, {
        bayIdentifier: 'SLOT-B',
        floorLevel: 'G',
        vehicleCategory: 'car',
        hourlyRateInr: 50,
      });

      // Update space details
      const updatePayload: any = {
        hourlyRateInr: 75,
        notes: 'Equipped with CCTV coverage',
      };
      const updated = await facilitiesService.updateSpace(space.id, HOST_1, TENANT_A, updatePayload);
      expect(updated.hourlyRateInr).toBe(75);
      expect((updated as any).notes).toBe('Equipped with CCTV coverage');

      // Update space status to maintenance
      const maintenance = await facilitiesService.updateSpaceStatus(space.id, HOST_1, TENANT_A, 'maintenance');
      expect(maintenance.status).toBe('maintenance');

      // Retrieve single space
      const fetched = await facilitiesService.getSpace(space.id, TENANT_A, HOST_1);
      expect(fetched.id).toBe(space.id);
      expect(fetched.status).toBe('maintenance');
    });

    it('should delete an individual bay and decrement facility space count', async () => {
      const space = await facilitiesService.createSpace(testFacilityId, HOST_1, TENANT_A, {
        bayIdentifier: 'DEL-01',
        floorLevel: 'G',
        vehicleCategory: 'car',
        hourlyRateInr: 50,
      });

      const delResult = await facilitiesService.deleteSpace(space.id, HOST_1, TENANT_A);
      expect(delResult.success).toBe(true);

      const fac = await facilitiesService.getFacility(testFacilityId, HOST_1, TENANT_A);
      expect(fac.totalSpaces).toBe(0);

      await expect(
        facilitiesService.getSpace(space.id, TENANT_A, HOST_1)
      ).rejects.toThrow();
    });
  });

  describe('3A.3 Bulk Parking Bay Operations (Creation & Updates)', () => {
    let bulkFacilityId: string;

    beforeEach(async () => {
      const fac = await facilitiesService.createFacility(HOST_1, TENANT_A, {
        name: 'Bulk Operations Facility',
        addressLine1: '500 Logistics Way',
        city: 'Chennai',
        postalCode: '600010',
        latitude: 13.07,
        longitude: 80.25,
      });
      bulkFacilityId = fac.id;
    });

    it('should bulk create spaces using prefix and count range', async () => {
      const bulkPayload: any = {
        prefix: 'LVL1-',
        startNumber: 1,
        endNumber: 5,
        floorLevel: 'Level 1',
        vehicleCategory: 'car' as const,
        hourlyRateInr: 50,
      };

      const created = await facilitiesService.bulkCreateSpaces(bulkFacilityId, HOST_1, TENANT_A, bulkPayload);
      expect(created.length).toBe(5);
      expect(created[0].bayIdentifier).toBe('LVL1-01');
      expect(created[4].bayIdentifier).toBe('LVL1-05');

      const fac = await facilitiesService.getFacility(bulkFacilityId, HOST_1, TENANT_A);
      expect(fac.totalSpaces).toBe(5);
    });

    it('should bulk create spaces using explicit list of space payloads', async () => {
      const explicitSpaces: CreateSpacePayload[] = [
        { bayIdentifier: 'C-01', floorLevel: 'Ground', vehicleCategory: 'car', hourlyRateInr: 40 },
        { bayIdentifier: 'C-02', floorLevel: 'Ground', vehicleCategory: 'suv', hasEvCharger: true, evChargerPowerKw: 50, hourlyRateInr: 90 },
      ];

      const created = await facilitiesService.bulkCreateSpaces(bulkFacilityId, HOST_1, TENANT_A, { spaces: explicitSpaces } as any);
      expect(created.length).toBe(2);
      expect(created.some((s: any) => s.bayIdentifier === 'C-01')).toBe(true);
      expect(created.some((s: any) => s.bayIdentifier === 'C-02' && s.hasEvCharger)).toBe(true);
    });

    it('should bulk update spaces atomically and reject cross-facility reassignment', async () => {
      const spaces = await facilitiesService.bulkCreateSpaces(bulkFacilityId, HOST_1, TENANT_A, {
        prefix: 'BLK-',
        startNumber: 1,
        endNumber: 3,
        floorLevel: 'B1',
        vehicleCategory: 'car' as const,
        hourlyRateInr: 50,
      } as any);

      // Valid bulk update: update rate and notes
      const updates = [
        { id: spaces[0].id, hourlyRateInr: 80, notes: 'Reserved for VIPs' },
        { id: spaces[1].id, hourlyRateInr: 85, status: 'maintenance' as const },
      ];

      const updated = await facilitiesService.bulkUpdateSpaces(bulkFacilityId, HOST_1, TENANT_A, updates);
      expect(updated.length).toBe(2);
      expect(updated[0].hourlyRateInr).toBe(80);
      expect((updated[0] as any).notes).toBe('Reserved for VIPs');
      expect(updated[1].status).toBe('maintenance');

      // Unauthorized cross-facility reassignment attempt
      const otherFac = await facilitiesService.createFacility(HOST_1, TENANT_A, {
        name: 'Another Facility',
        addressLine1: '10 Other St',
        city: 'Chennai',
        postalCode: '600011',
        latitude: 13.0,
        longitude: 80.2,
      });

      await expect(
        facilitiesService.bulkUpdateSpaces(otherFac.id, HOST_1, TENANT_A, [
          { id: spaces[0].id, hourlyRateInr: 999 },
        ])
      ).rejects.toThrow(/does not belong to facility/i);
    });
  });

  describe('3A.4 Facility and Space Media Workflows', () => {
    let mediaFacilityId: string;
    let spaceId: string;

    beforeEach(async () => {
      const fac = await facilitiesService.createFacility(HOST_1, TENANT_A, {
        name: 'Media Gallery Facility',
        addressLine1: '77 Gallery Road',
        city: 'Chennai',
        postalCode: '600008',
        latitude: 13.05,
        longitude: 80.26,
      });
      mediaFacilityId = fac.id;

      const sp = await facilitiesService.createSpace(mediaFacilityId, HOST_1, TENANT_A, {
        bayIdentifier: 'M-01',
        floorLevel: 'Ground',
        vehicleCategory: 'car',
        hourlyRateInr: 50,
      });
      spaceId = sp.id;
    });

    it('should add, prioritize, and delete photos for a facility', async () => {
      // Add primary photo
      const facWithPhoto1 = await facilitiesService.addFacilityPhoto(mediaFacilityId, HOST_1, TENANT_A, {
        url: '/assets/images/admin_facility_aerial_1792157347651.jpg',
        caption: 'Aerial Overhead View',
        isPrimary: true,
      });
      expect(facWithPhoto1.photos?.length).toBe(1);
      const photo1 = facWithPhoto1.photos![0];
      expect(photo1.isCover || (photo1 as any).isPrimary).toBe(true);

      // Add secondary photo
      const facWithPhoto2 = await facilitiesService.addFacilityPhoto(mediaFacilityId, HOST_1, TENANT_A, {
        url: '/assets/images/hero_parking_bay_1792157347279.jpg',
        caption: 'Entrance Barrier',
        isPrimary: false,
      });
      expect(facWithPhoto2.photos?.length).toBe(2);
      const photo2 = facWithPhoto2.photos!.find((p: any) => p.url.includes('hero_parking_bay'))!;
      expect(photo2).toBeDefined();

      const fac = await facilitiesService.getFacility(mediaFacilityId, HOST_1, TENANT_A);
      expect(fac.photos?.length).toBe(2);

      // Delete secondary photo
      const facAfterDel = await facilitiesService.deleteFacilityPhoto(mediaFacilityId, HOST_1, TENANT_A, photo2.id);
      expect(facAfterDel.photos?.length).toBe(1);

      const facAfter = await facilitiesService.getFacility(mediaFacilityId, HOST_1, TENANT_A);
      expect(facAfter.photos?.length).toBe(1);
    });

    it('should add and delete photos for a specific parking space', async () => {
      const spaceWithPhoto = await facilitiesService.addSpacePhoto(spaceId, HOST_1, TENANT_A, {
        url: '/assets/images/hero_parking_bay_1792157347279.jpg',
        caption: 'Bay EV Charger Close-up',
        isPrimary: true,
      });
      expect(spaceWithPhoto.photos?.length).toBe(1);
      const spPhoto = spaceWithPhoto.photos![0];
      expect(spPhoto.url).toContain('hero_parking_bay');

      const space = await facilitiesService.getSpace(spaceId, TENANT_A, HOST_1);
      expect(space.photos?.length).toBe(1);

      // Delete space photo with signature (spaceId, hostId, tenantId, photoId)
      const spaceAfterDel = await facilitiesService.deleteSpacePhoto(spaceId, HOST_1, TENANT_A, spPhoto.id);
      expect(spaceAfterDel.photos?.length).toBe(0);

      const spaceAfter = await facilitiesService.getSpace(spaceId, TENANT_A, HOST_1);
      expect(spaceAfter.photos?.length).toBe(0);
    });

    it('should reject unauthorized photo deletion by non-owner host', async () => {
      const fac = await facilitiesService.addFacilityPhoto(mediaFacilityId, HOST_1, TENANT_A, {
        url: '/assets/images/hero_parking_bay_1792157347279.jpg',
      });
      const photoId = fac.photos![fac.photos!.length - 1].id;

      await expect(
        facilitiesService.deleteFacilityPhoto(mediaFacilityId, HOST_2, TENANT_A, photoId)
      ).rejects.toThrow();
    });
  });

  describe('3A.5 Express API & Persistence Integration (apps/api and server/db)', () => {
    it('should support bulk bay updates with location ownership enforcement in InventoryService', () => {
      const locations = inventoryService.getAllLocations(false);
      expect(locations.length).toBeGreaterThan(0);
      const loc = locations[0];
      const bays = inventoryService.getBaysByLocationId(loc.id);
      expect(bays.length).toBeGreaterThan(0);

      const targetBay = bays[0];
      const originalBayNumber = targetBay.bayNumber;

      // Update bulk bays
      const updated = inventoryService.bulkUpdateBays(loc.id, loc.hostId, [
        { id: targetBay.id, notes: 'Verified in 3A automated test' },
      ]);
      expect(updated[0].notes).toBe('Verified in 3A automated test');

      // Restore
      inventoryService.bulkUpdateBays(loc.id, loc.hostId, [
        { id: targetBay.id, bayNumber: originalBayNumber, notes: undefined },
      ]);
    });

    it('should reject bulk bay update when bay does not belong to facility in InventoryService', () => {
      const locations = inventoryService.getAllLocations(false);
      if (locations.length >= 2) {
        const loc1 = locations[0];
        const loc2 = locations[1];
        const baysLoc2 = inventoryService.getBaysByLocationId(loc2.id);
        if (baysLoc2.length > 0) {
          expect(() => {
            inventoryService.bulkUpdateBays(loc1.id, loc1.hostId, [
              { id: baysLoc2[0].id, bayNumber: 'HACK-01' },
            ]);
          }).toThrow();
        }
      }
    });

    it('should manage bay media in InventoryService with primary flag toggling', () => {
      const locations = inventoryService.getAllLocations(false);
      const loc = locations[0];
      const bays = inventoryService.getBaysByLocationId(loc.id);
      const bay = bays[0];

      const bayWithPhoto = inventoryService.addBayPhoto(loc.id, bay.id, loc.hostId, {
        url: '/assets/images/test_bay_photo.jpg',
        caption: 'Test Bay Image',
        isPrimary: true,
      });

      expect(bayWithPhoto.photos?.length).toBeGreaterThanOrEqual(1);
      const added = bayWithPhoto.photos!.find((p) => p.url === '/assets/images/test_bay_photo.jpg')!;
      expect(added.isPrimary).toBe(true);

      // Remove photo
      const bayAfterRemove = inventoryService.removeBayPhoto(loc.id, bay.id, added.id, loc.hostId);
      expect(bayAfterRemove.photos?.some((p) => p.id === added.id)).toBe(false);
    });

    it('should support database updateBulkBays in server/db', async () => {
      const facilities = await db.getFacilities();
      expect(facilities.length).toBeGreaterThan(0);
      const fac = facilities[0];
      const bays = await db.getBaysByFacility(fac.id);
      if (bays.length > 0) {
        const host = (await db.getAllHosts()).find((h) => h.id === fac.hostId) || {
          id: fac.hostId,
          fullName: 'Host User',
          role: 'host' as const,
        };

        const updated = await db.updateBulkBays(
          fac.id,
          [{ id: bays[0].id, status: 'occupied' }],
          host as any
        );
        expect(updated[0].status).toBe('occupied');

        // Restore status
        await db.updateBulkBays(
          fac.id,
          [{ id: bays[0].id, status: 'available' }],
          host as any
        );
      }
    });
  });
});
