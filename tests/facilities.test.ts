import { describe, it, expect, beforeEach } from 'vitest';
import { FacilitiesService } from '../services/api/src/modules/facilities/facilities.service';
import { CreateFacilityPayload, CreateSpacePayload, BulkCreateSpacesPayload, UpdateSpacePayload } from '@parkeazy/shared-types';

describe('Part 05: Facilities & Space Inventory Subsystem Tests', () => {
  let facilitiesService: FacilitiesService;
  const HOST_A_ID = '00000000-0000-4000-a000-000000000002';
  const HOST_B_ID = '00000000-0000-4000-a000-000000000003';

  beforeEach(() => {
    facilitiesService = new FacilitiesService();
  });

  describe('1. Facility Lifecycle & Multi-Step Creation', () => {
    it('should list default pre-seeded host facilities with complete metadata', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      expect(facilities.length).toBeGreaterThanOrEqual(3);
      const annaNagar = facilities.find((f: any) => f.facilityCode === '#FAC-0104');
      expect(annaNagar).toBeDefined();
      expect(annaNagar?.name).toContain('Anna Nagar Plaza');
      expect(annaNagar?.city).toBe('Chennai');
      expect(annaNagar?.totalSpaces).toBe(24);
      expect(annaNagar?.status).toBe('published');
    });

    it('should retrieve specific facility details with operating parameters', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const targetId = facilities[0].id;
      const facility = await facilitiesService.getFacility(targetId, HOST_A_ID, 'default');
      expect(facility.id).toBe(targetId);
      expect(facility.latitude).toBeDefined();
      expect(facility.longitude).toBeDefined();
    });

    it('should create a new draft parking facility with geocoded coordinates', async () => {
      const payload: CreateFacilityPayload = {
        name: 'Guindy Industrial Park Garage',
        addressLine1: '40 Inner Ring Road, Guindy',
        city: 'Chennai',
        postalCode: '600032',
        latitude: 13.0067,
        longitude: 80.2025,
        operatingModel: 'commercial_garage',
        isCovered: true,
        is24x7: true,
        maxHeightClearanceMeters: 2.3,
        entranceInstructions: 'Gate 4, opposite Guindy Railway Station',
      };
      const created = await facilitiesService.createFacility(HOST_A_ID, 'default', payload);
      expect(created.id).toBeDefined();
      expect(created.status).toBe('draft');
      expect(created.name).toBe(payload.name);
      expect(created.totalSpaces).toBe(0);
    });

    it('should update facility entrance instructions and gate security rules', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const targetId = facilities[0].id;
      const updated = await facilitiesService.updateFacility(targetId, HOST_A_ID, 'default', {
        entranceInstructions: 'Ramp entrance updated: take Right lane',
        gatePinCode: '8899',
      });
      expect(updated.entranceInstructions).toBe('Ramp entrance updated: take Right lane');
      expect(updated.gatePinCode).toBe('8899');
    });
  });

  describe('2. Space Inventory & Bay Layout Management', () => {
    it('should list pre-seeded spaces for Anna Nagar Plaza facility', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const annaNagar = facilities.find((f: any) => f.facilityCode === '#FAC-0104')!;
      const spaces = await facilitiesService.listSpaces(annaNagar.id, HOST_A_ID, 'default');
      expect(spaces.length).toBe(24);
      expect(spaces.some((s: any) => s.bayIdentifier === 'A-01')).toBe(true);
      expect(spaces.some((s: any) => s.hasEvCharger)).toBe(true);
    });

    it('should create an individual parking space with custom attributes', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const facilityId = facilities[0].id;
      const spacePayload: CreateSpacePayload = {
        bayIdentifier: 'VIP-01',
        floorLevel: 'Basement 1',
        vehicleCategory: 'car',
        hasEvCharger: true,
        evChargerPowerKw: 50.0,
        isDisabledAccessible: true,
        hourlyRateInr: 100.0,
        classification: 'oversized',
        stallPosition: 'single_independent',
        maneuverabilityAngle: '90_perpendicular',
        surfaceFlooring: 'epoxy_coated',
        maxLengthMeters: 5.5,
        maxWidthMeters: 2.5,
        maxHeightMeters: 2.4,
        maxWeightTonnes: 4.0,
        allowedVehicleCategories: ['car', 'suv'],
        fuelCompatibility: ['petrol', 'diesel', 'electric'],
      };
      const space = await facilitiesService.createSpace(facilityId, HOST_A_ID, 'default', spacePayload);
      expect(space.id).toBeDefined();
      expect(space.bayIdentifier).toBe('VIP-01');
      expect(space.hasEvCharger).toBe(true);
      expect(space.evChargerPowerKw).toBe(50.0);
      expect(space.hourlyRateInr).toBe(100.0);
      expect(space.status).toBe('available');
    });

    it('should reject duplicate bay identifiers within the same facility', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const facilityId = facilities[0].id;
      const spacePayload: CreateSpacePayload = {
        bayIdentifier: 'DUP-01',
        hourlyRateInr: 50.0,
      };
      await facilitiesService.createSpace(facilityId, HOST_A_ID, 'default', spacePayload);
      await expect(
        facilitiesService.createSpace(facilityId, HOST_A_ID, 'default', spacePayload)
      ).rejects.toThrow(/already exists/i);
    });

    it('should bulk generate spaces with prefix range', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const facilityId = facilities[0].id;
      const bulkPayload: BulkCreateSpacesPayload = {
        prefix: 'BULK',
        startNumber: 1,
        endNumber: 5,
        floorLevel: 'Basement 2',
        vehicleCategory: 'car',
        hourlyRateInr: 45.0,
        classification: 'standard',
        hasEvCharger: false,
        isDisabledAccessible: false,
      };
      const created = await facilitiesService.bulkCreateSpaces(facilityId, HOST_A_ID, 'default', bulkPayload);
      expect(created.length).toBe(5);
      expect(created.map((s: any) => s.bayIdentifier)).toEqual([
        'BULK-01',
        'BULK-02',
        'BULK-03',
        'BULK-04',
        'BULK-05',
      ]);
    });

    it('should update space details and operational status transitions', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const facilityId = facilities[0].id;
      const spaces = await facilitiesService.listSpaces(facilityId, HOST_A_ID, 'default');
      const targetSpace = spaces[0];

      const updatePayload: UpdateSpacePayload = {
        hourlyRateInr: 65.0,
        classification: 'compact',
        allowedVehicleCategories: ['car'],
      };
      const updated = await facilitiesService.updateSpace(targetSpace.id, HOST_A_ID, 'default', updatePayload);
      expect(updated.hourlyRateInr).toBe(65.0);
      expect(updated.classification).toBe('compact');

      const maintenanceSpace = await facilitiesService.updateSpaceStatus(
        targetSpace.id,
        HOST_A_ID,
        'default',
        'maintenance'
      );
      expect(maintenanceSpace.status).toBe('maintenance');

      const availableSpace = await facilitiesService.updateSpaceStatus(
        targetSpace.id,
        HOST_A_ID,
        'default',
        'available'
      );
      expect(availableSpace.status).toBe('available');
    });
  });

  describe('3. Security, Ownership & Tenant Isolation', () => {
    it('should prevent Host B from reading Host A private facilities', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const facilityAId = facilities[0].id;
      await expect(
        facilitiesService.getFacility(facilityAId, HOST_B_ID, 'default')
      ).rejects.toThrow(/permission/i);
    });

    it('should prevent Host B from creating spaces in Host A facility', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const facilityAId = facilities[0].id;
      await expect(
        facilitiesService.createSpace(facilityAId, HOST_B_ID, 'default', {
          bayIdentifier: 'HACK-01',
          hourlyRateInr: 10.0,
        })
      ).rejects.toThrow(/permission/i);
    });

    it('should isolate facilities across tenants', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'other-tenant');
      expect(facilities.length).toBe(0);
    });
  });

  describe('4. Publication Readiness & Publishing Lifecycle', () => {
    it('should evaluate publication readiness checklist for pre-configured facility', async () => {
      const facilities = await facilitiesService.listHostFacilities(HOST_A_ID, 'default');
      const facilityId = facilities[0].id;
      const readiness = await facilitiesService.getPublicationReadiness(facilityId, HOST_A_ID, 'default');
      expect(readiness.facilityId).toBe(facilityId);
      expect(readiness.checks.length).toBeGreaterThanOrEqual(7);
      expect(readiness.canPublish).toBe(true);
      expect(readiness.score).toBeGreaterThanOrEqual(80);
    });

    it('should reject publishing an empty facility without parking spaces', async () => {
      const emptyFacility = await facilitiesService.createFacility(HOST_A_ID, 'default', {
        name: 'Empty Staging Lot',
        addressLine1: '100 Mount Road',
        city: 'Chennai',
        postalCode: '600002',
        latitude: 13.06,
        longitude: 80.25,
      });
      const readiness = await facilitiesService.getPublicationReadiness(emptyFacility.id, HOST_A_ID, 'default');
      expect(readiness.canPublish).toBe(false);
      expect(readiness.missingRequirements).toContain('Physical Bay Inventory');
      await expect(
        facilitiesService.publishFacility(emptyFacility.id, HOST_A_ID, 'default')
      ).rejects.toThrow(/cannot be published/i);
    });

    it('should allow publishing when all prerequisites are fulfilled', async () => {
      const newFacility = await facilitiesService.createFacility(HOST_A_ID, 'default', {
        name: 'Adyar River View Parking',
        addressLine1: '12 Gandhi Mandapam Road',
        city: 'Chennai',
        postalCode: '600025',
        latitude: 13.0067,
        longitude: 80.2458,
        entranceInstructions: 'Gate 1 next to Anna Centenary Library',
      });
      await facilitiesService.createSpace(newFacility.id, HOST_A_ID, 'default', {
        bayIdentifier: 'ADY-01',
        hourlyRateInr: 30.0,
        vehicleCategory: 'car',
      });
      const published = await facilitiesService.publishFacility(newFacility.id, HOST_A_ID, 'default');
      expect(published.status).toBe('published');
    });
  });

  describe('5. Public Customer Listing Exposure', () => {
    it('should expose ONLY published facilities on the public feed', async () => {
      const draft = await facilitiesService.createFacility(HOST_A_ID, 'default', {
        name: 'Unpublished Secret Garage',
        addressLine1: 'Hidden Street 9',
        city: 'Chennai',
        postalCode: '600001',
        latitude: 13.08,
        longitude: 80.28,
      });
      const publicListings = await facilitiesService.listPublicListings('default');
      expect(publicListings.length).toBeGreaterThanOrEqual(1);
      expect(publicListings.some((l: any) => l.id === draft.id)).toBe(false);
      expect(publicListings.some((l: any) => l.facilityCode === '#FAC-0104')).toBe(true);
    });

    it('should redact private host fields from public responses', async () => {
      const publicListings = await facilitiesService.listPublicListings('default');
      const listing = publicListings[0];
      expect((listing as any).gatePinCode).toBeUndefined();
      expect((listing as any).accessHotline).toBeUndefined();
      expect((listing as any).hostId).toBeUndefined();
      expect(listing.minHourlyRateInr).toBeGreaterThan(0);
      expect(listing.totalSpaces).toBeGreaterThan(0);
    });
  });
});
