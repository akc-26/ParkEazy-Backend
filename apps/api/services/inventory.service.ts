import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ParkingLocation,
  ParkingBay,
  LocationStatus,
  BayType,
  BayStatus,
  AccessMethod,
  PropertyType,
  FacilityPhoto,
  CreateFacilityRequest,
  UpdateFacilityRequest,
  CreateBayRequest,
  UpdateBayRequest,
  FacilityPublicationValidation,
  PublishFacilityResponse,
  PublicationCheckItem,
  VehicleCategory,
} from '../../../packages/contracts';
import { AppError, ForbiddenError, NotFoundError } from '../middleware/error-handler';
import { dbManager } from '../database/connection';
import { appConfig } from '../config/env';

export class InventoryService {
  private static instance: InventoryService;
  private readonly storageFilePath: string;

  private locations: ParkingLocation[] = [];
  private bays: ParkingBay[] = [];

  private readonly INITIAL_LOCATIONS: ParkingLocation[] = [
    {
      id: 'loc-dt-001',
      hostId: 'usr-host-001',
      name: 'Financial Tower Covered Facility',
      description: 'Secured underground parking facility with 24/7 CCTV surveillance, automated gate access, and EV charging points in the core financial district.',
      propertyType: PropertyType.UNDERGROUND,
      address: {
        line1: '450 Montgomery Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94104',
        country: 'US',
        latitude: 37.7925,
        longitude: -122.4032,
      },
      timezone: 'America/Los_Angeles',
      accessMethod: AccessMethod.GATE_CODE,
      accessInstructions: 'Enter 4-digit PIN at entry keypad. Drive down to B2 level.',
      status: LocationStatus.ACTIVE,
      totalBays: 4,
      hourlyRateCents: 650,
      dailyRateCents: 3800,
      securityDepositCents: 2500,
      amenities: ['EV Charging', 'CCTV Security', 'Covered Garage', 'Elevator Access', 'Paved Surface', '24/7 Access'],
      imageUrl: '/assets/images/hero_parking_bay_1792157347279.jpg',
      photos: [
        {
          id: 'pho-001-a',
          url: '/assets/images/hero_parking_bay_1792157347279.jpg',
          caption: 'Main Underground Facility Entrance',
          isPrimary: true,
          uploadedAt: '2026-01-10T10:00:00Z',
        },
      ],
      publishedAt: '2026-01-10T10:00:00Z',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-01T12:00:00Z',
    },
    {
      id: 'loc-res-002',
      hostId: 'usr-host-001',
      name: 'Oakridge Residential Driveway & EV Point',
      description: 'Private suburban double-driveway in a tranquil, quiet neighborhood. Features a dedicated 11kW Level 2 EV charging post.',
      propertyType: PropertyType.DRIVEWAY,
      address: {
        line1: '1248 Oakridge Boulevard',
        city: 'Palo Alto',
        state: 'CA',
        postalCode: '94301',
        country: 'US',
        latitude: 37.4419,
        longitude: -122.143,
      },
      timezone: 'America/Los_Angeles',
      accessMethod: AccessMethod.OPEN_ACCESS,
      accessInstructions: 'Park on the left side of driveway designated by EV Reserved marking.',
      status: LocationStatus.ACTIVE,
      totalBays: 2,
      hourlyRateCents: 450,
      dailyRateCents: 2800,
      securityDepositCents: 1500,
      amenities: ['11kW EV Charger', 'Driveway Parking', 'Well-Lit', 'Quiet Street'],
      imageUrl: '/assets/images/host_parking_driveway_1792157348722.jpg',
      photos: [
        {
          id: 'pho-002-a',
          url: '/assets/images/host_parking_driveway_1792157348722.jpg',
          caption: 'Driveway Frontage with EV Charger',
          isPrimary: true,
          uploadedAt: '2026-01-20T14:30:00Z',
        },
      ],
      publishedAt: '2026-01-20T14:30:00Z',
      createdAt: '2026-01-20T14:30:00Z',
      updatedAt: '2026-02-15T09:15:00Z',
    },
    {
      id: 'loc-hub-003',
      hostId: 'usr-host-002',
      name: 'Urban Transit Mobility Hub Bay 12',
      description: 'Multi-level smart transit center bay adjacent to central rail interchange. Direct skyway connection to terminal.',
      propertyType: PropertyType.GARAGE,
      address: {
        line1: '200 Terminal Way',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
        latitude: 37.7891,
        longitude: -122.3965,
      },
      timezone: 'America/Los_Angeles',
      accessMethod: AccessMethod.APP_BLE,
      accessInstructions: 'Bluetooth reader at boom gate triggers access via ParkEazy app.',
      status: LocationStatus.ACTIVE,
      totalBays: 3,
      hourlyRateCents: 800,
      dailyRateCents: 4500,
      securityDepositCents: 3000,
      amenities: ['Transit Access', 'High Clearance', 'Disabled Parking', 'Staffed Kiosk'],
      imageUrl: '/assets/images/admin_facility_aerial_1792157347651.jpg',
      photos: [
        {
          id: 'pho-003-a',
          url: '/assets/images/admin_facility_aerial_1792157347651.jpg',
          caption: 'Facility Aerial Overview',
          isPrimary: true,
          uploadedAt: '2026-02-01T08:00:00Z',
        },
      ],
      publishedAt: '2026-02-01T08:00:00Z',
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-03-01T16:00:00Z',
    },
  ];

  private readonly INITIAL_BAYS: ParkingBay[] = [
    {
      id: 'bay-001-a',
      locationId: 'loc-dt-001',
      bayNumber: 'B2-30',
      bayType: BayType.COVERED,
      levelOrFloor: 'B2',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.1,
      maxVehicleLengthMeters: 5.2,
      maxVehicleWidthMeters: 2.2,
      supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.COMPACT],
      isEvCharging: false,
      hasCctv: true,
      isAccessible: false,
      isCovered: true,
      notes: 'Pillar adjacent on passenger side.',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-01T12:00:00Z',
    },
    {
      id: 'bay-001-b',
      locationId: 'loc-dt-001',
      bayNumber: 'B2-32',
      bayType: BayType.EV_CHARGING,
      levelOrFloor: 'B2',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.1,
      maxVehicleLengthMeters: 5.2,
      maxVehicleWidthMeters: 2.2,
      supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.COMPACT],
      isEvCharging: true,
      evChargerKw: 7.4,
      hasCctv: true,
      isAccessible: false,
      isCovered: true,
      notes: 'Type 2 Mennekes plug available.',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-01T12:00:00Z',
    },
    {
      id: 'bay-001-c',
      locationId: 'loc-dt-001',
      bayNumber: 'B2-34',
      bayType: BayType.COVERED,
      levelOrFloor: 'B2',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.1,
      maxVehicleLengthMeters: 5.2,
      maxVehicleWidthMeters: 2.2,
      supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.COMPACT],
      isEvCharging: false,
      hasCctv: true,
      isAccessible: false,
      isCovered: true,
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-01T12:00:00Z',
    },
    {
      id: 'bay-001-d',
      locationId: 'loc-dt-001',
      bayNumber: 'B2-36',
      bayType: BayType.STANDARD,
      levelOrFloor: 'B2',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.1,
      maxVehicleLengthMeters: 5.2,
      maxVehicleWidthMeters: 2.2,
      supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.COMPACT],
      isEvCharging: false,
      hasCctv: true,
      isAccessible: false,
      isCovered: true,
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-01T12:00:00Z',
    },
    {
      id: 'bay-002-a',
      locationId: 'loc-res-002',
      bayNumber: 'Bay 1 (EV)',
      bayType: BayType.EV_CHARGING,
      levelOrFloor: 'Ground',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.8,
      maxVehicleLengthMeters: 6.0,
      maxVehicleWidthMeters: 2.4,
      supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.TRUCK, VehicleCategory.VAN, VehicleCategory.COMPACT],
      isEvCharging: true,
      evChargerKw: 11,
      hasCctv: false,
      isAccessible: true,
      isCovered: false,
      notes: 'Tesla wall connector and J1772 adapter on site.',
      createdAt: '2026-01-20T14:30:00Z',
      updatedAt: '2026-02-15T09:15:00Z',
    },
    {
      id: 'bay-002-b',
      locationId: 'loc-res-002',
      bayNumber: 'Bay 2 (Standard)',
      bayType: BayType.STANDARD,
      levelOrFloor: 'Ground',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.8,
      maxVehicleLengthMeters: 6.0,
      maxVehicleWidthMeters: 2.4,
      supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.COMPACT],
      isEvCharging: false,
      hasCctv: false,
      isAccessible: false,
      isCovered: false,
      createdAt: '2026-01-20T14:30:00Z',
      updatedAt: '2026-02-15T09:15:00Z',
    },
    {
      id: 'bay-003-a',
      locationId: 'loc-hub-003',
      bayNumber: 'L3-12',
      bayType: BayType.ACCESSIBLE,
      levelOrFloor: 'Level 3',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.4,
      maxVehicleLengthMeters: 5.5,
      maxVehicleWidthMeters: 2.8,
      supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.VAN, VehicleCategory.COMPACT],
      isEvCharging: false,
      hasCctv: true,
      isAccessible: true,
      isCovered: true,
      notes: 'Direct ramp access to elevators.',
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-03-01T16:00:00Z',
    },
    {
      id: 'bay-003-b',
      locationId: 'loc-hub-003',
      bayNumber: 'L3-14',
      bayType: BayType.COMPACT,
      levelOrFloor: 'Level 3',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.4,
      maxVehicleLengthMeters: 4.5,
      maxVehicleWidthMeters: 2.0,
      supportedVehicles: [VehicleCategory.COMPACT, VehicleCategory.MOTORCYCLE],
      isEvCharging: false,
      hasCctv: true,
      isAccessible: false,
      isCovered: true,
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-03-01T16:00:00Z',
    },
    {
      id: 'bay-003-c',
      locationId: 'loc-hub-003',
      bayNumber: 'L3-16',
      bayType: BayType.COVERED,
      levelOrFloor: 'Level 3',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.4,
      maxVehicleLengthMeters: 5.5,
      maxVehicleWidthMeters: 2.2,
      supportedVehicles: [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.COMPACT],
      isEvCharging: false,
      hasCctv: true,
      isAccessible: false,
      isCovered: true,
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-03-01T16:00:00Z',
    },
  ];

  private constructor() {
    this.storageFilePath = path.resolve(
      process.cwd(),
      'apps/api/database/data/inventory_store.json'
    );
    this.loadFromDisk();
  }

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.locations) && parsed.locations.length > 0) {
          this.locations = parsed.locations;
          this.bays = Array.isArray(parsed.bays) ? parsed.bays : [];
          return;
        }
      }
    } catch (err: any) {
      console.warn('[ParkEazy-Inventory] Notice loading persisted store, falling back to seed:', err.message);
    }

    // Seed defaults
    this.locations = JSON.parse(JSON.stringify(this.INITIAL_LOCATIONS));
    this.bays = JSON.parse(JSON.stringify(this.INITIAL_BAYS));
    this.saveToDisk();
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        locations: this.locations,
        bays: this.bays,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[ParkEazy-Inventory] Error writing inventory storage:', err.message);
    }
  }

  public resetStores(): void {
    this.locations = JSON.parse(JSON.stringify(this.INITIAL_LOCATIONS));
    this.bays = JSON.parse(JSON.stringify(this.INITIAL_BAYS));
    this.saveToDisk();
  }

  // --------------------------------------------------------------------------
  // Public Customer & Admin Location Retrieval
  // --------------------------------------------------------------------------

  /**
   * Retrieves all locations. If activeOnly is true (default for public customer search),
   * only returns locations in ACTIVE status.
   */
  public getAllLocations(activeOnly = false): ParkingLocation[] {
    if (activeOnly) {
      return this.locations.filter((loc) => loc.status === LocationStatus.ACTIVE);
    }
    return this.locations;
  }

  public getLocationById(id: string): ParkingLocation | undefined {
    return this.locations.find((l) => l.id === id);
  }

  public getBaysByLocationId(locationId: string): ParkingBay[] {
    return this.bays.filter((b) => b.locationId === locationId);
  }

  public getBayById(bayId: string): ParkingBay | undefined {
    return this.bays.find((b) => b.id === bayId);
  }

  // --------------------------------------------------------------------------
  // Host Facility Operations & Tenancy Enforcement
  // --------------------------------------------------------------------------

  public getLocationsForHost(hostId: string): ParkingLocation[] {
    return this.locations.filter((l) => l.hostId === hostId);
  }

  public getLocationForHost(locationId: string, hostId: string, isAdmin = false): ParkingLocation {
    const location = this.getLocationById(locationId);
    if (!location) {
      throw new NotFoundError(`Parking facility '${locationId}' does not exist.`);
    }
    if (!isAdmin && location.hostId !== hostId) {
      throw new ForbiddenError(
        `Access denied. You do not have permission to access facility '${locationId}'.`
      );
    }
    return location;
  }

  public createLocation(hostId: string, data: CreateFacilityRequest): ParkingLocation {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) {
      throw new AppError('Facility name is required and must be at least 3 characters.', 400, 'VALIDATION_ERROR');
    }
    if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) {
      throw new AppError('Facility description is required and must be at least 10 characters.', 400, 'VALIDATION_ERROR');
    }
    if (!data.address || !data.address.line1 || !data.address.city || !data.address.state || !data.address.postalCode) {
      throw new AppError('Complete facility street address (line1, city, state, postal code) is required.', 400, 'VALIDATION_ERROR');
    }

    const facilityId = `loc-${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const newLocation: ParkingLocation = {
      id: facilityId,
      hostId,
      name: data.name.trim(),
      description: data.description.trim(),
      propertyType: data.propertyType || PropertyType.GARAGE,
      address: {
        line1: data.address.line1.trim(),
        line2: data.address.line2?.trim() || undefined,
        city: data.address.city.trim(),
        state: data.address.state.trim(),
        postalCode: data.address.postalCode.trim(),
        country: data.address.country?.trim() || 'US',
        latitude: typeof data.address.latitude === 'number' ? data.address.latitude : 37.7749,
        longitude: typeof data.address.longitude === 'number' ? data.address.longitude : -122.4194,
      },
      timezone: data.timezone || 'America/Los_Angeles',
      accessMethod: data.accessMethod || AccessMethod.GATE_CODE,
      accessInstructions: data.accessInstructions?.trim() || undefined,
      status: LocationStatus.DRAFT,
      totalBays: 0,
      hourlyRateCents: typeof data.hourlyRateCents === 'number' && data.hourlyRateCents >= 0 ? data.hourlyRateCents : 500,
      dailyRateCents: typeof data.dailyRateCents === 'number' && data.dailyRateCents >= 0 ? data.dailyRateCents : 3500,
      securityDepositCents: typeof data.securityDepositCents === 'number' && data.securityDepositCents >= 0 ? data.securityDepositCents : 2000,
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
      imageUrl: data.imageUrl || undefined,
      photos: Array.isArray(data.photos) ? data.photos : (data.imageUrl ? [{
        id: `pho-${crypto.randomBytes(4).toString('hex')}`,
        url: data.imageUrl,
        isPrimary: true,
        uploadedAt: now,
      }] : []),
      createdAt: now,
      updatedAt: now,
    };

    this.locations.push(newLocation);
    this.saveToDisk();
    return newLocation;
  }

  public updateLocation(
    locationId: string,
    hostId: string,
    data: UpdateFacilityRequest,
    isAdmin = false
  ): ParkingLocation {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length < 3) {
        throw new AppError('Facility name must be at least 3 characters.', 400, 'VALIDATION_ERROR');
      }
      location.name = data.name.trim();
    }

    if (data.description !== undefined) {
      if (typeof data.description !== 'string' || data.description.trim().length < 10) {
        throw new AppError('Facility description must be at least 10 characters.', 400, 'VALIDATION_ERROR');
      }
      location.description = data.description.trim();
    }

    if (data.propertyType !== undefined) {
      location.propertyType = data.propertyType;
    }

    if (data.address) {
      if (data.address.line1 !== undefined) location.address.line1 = data.address.line1.trim();
      if (data.address.line2 !== undefined) location.address.line2 = data.address.line2.trim() || undefined;
      if (data.address.city !== undefined) location.address.city = data.address.city.trim();
      if (data.address.state !== undefined) location.address.state = data.address.state.trim();
      if (data.address.postalCode !== undefined) location.address.postalCode = data.address.postalCode.trim();
      if (data.address.country !== undefined) location.address.country = data.address.country.trim();
      if (typeof data.address.latitude === 'number') location.address.latitude = data.address.latitude;
      if (typeof data.address.longitude === 'number') location.address.longitude = data.address.longitude;
    }

    if (data.timezone !== undefined) location.timezone = data.timezone;
    if (data.accessMethod !== undefined) location.accessMethod = data.accessMethod;
    if (data.accessInstructions !== undefined) location.accessInstructions = data.accessInstructions.trim();

    if (typeof data.hourlyRateCents === 'number' && data.hourlyRateCents >= 0) {
      location.hourlyRateCents = data.hourlyRateCents;
    }
    if (typeof data.dailyRateCents === 'number' && data.dailyRateCents >= 0) {
      location.dailyRateCents = data.dailyRateCents;
    }
    if (typeof data.securityDepositCents === 'number' && data.securityDepositCents >= 0) {
      location.securityDepositCents = data.securityDepositCents;
    }
    if (Array.isArray(data.amenities)) {
      location.amenities = data.amenities;
    }
    if (data.imageUrl !== undefined) {
      location.imageUrl = data.imageUrl;
    }
    if (Array.isArray(data.photos)) {
      location.photos = data.photos;
      if (!location.imageUrl && data.photos.length > 0) {
        location.imageUrl = data.photos[0].url;
      }
    }
    if (data.status !== undefined && isAdmin) {
      location.status = data.status;
    }

    // Keep totalBays in sync with actual physical bays
    const currentBays = this.getBaysByLocationId(locationId);
    location.totalBays = currentBays.length;

    location.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return location;
  }

  public deleteLocation(locationId: string, hostId: string, isAdmin = false): void {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);

    // Delete associated bays
    this.bays = this.bays.filter((b) => b.locationId !== location.id);
    this.locations = this.locations.filter((l) => l.id !== location.id);
    this.saveToDisk();
  }

  // --------------------------------------------------------------------------
  // Physical Bay / Parking-Space Inventory
  // --------------------------------------------------------------------------

  public getBaysForHost(locationId: string, hostId: string, isAdmin = false): ParkingBay[] {
    // Verifies ownership of the facility
    this.getLocationForHost(locationId, hostId, isAdmin);
    return this.getBaysByLocationId(locationId);
  }

  public getBayForHost(
    locationId: string,
    bayId: string,
    hostId: string,
    isAdmin = false
  ): ParkingBay {
    this.getLocationForHost(locationId, hostId, isAdmin);
    const bay = this.getBayById(bayId);
    if (!bay || bay.locationId !== locationId) {
      throw new NotFoundError(`Parking space '${bayId}' not found in facility '${locationId}'.`);
    }
    return bay;
  }

  public createBay(
    locationId: string,
    hostId: string,
    data: CreateBayRequest,
    isAdmin = false
  ): ParkingBay {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);

    if (!data.bayNumber || typeof data.bayNumber !== 'string' || data.bayNumber.trim().length === 0) {
      throw new AppError('Bay identifier or number is required.', 400, 'VALIDATION_ERROR');
    }

    const normalizedBayNumber = data.bayNumber.trim();
    const existingBays = this.getBaysByLocationId(locationId);
    const duplicate = existingBays.some(
      (b) => b.bayNumber.toLowerCase() === normalizedBayNumber.toLowerCase()
    );
    if (duplicate) {
      throw new AppError(
        `A parking space with identifier '${normalizedBayNumber}' already exists in this facility.`,
        409,
        'DUPLICATE_BAY_IDENTIFIER'
      );
    }

    const bayId = `bay-${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const newBay: ParkingBay = {
      id: bayId,
      locationId: location.id,
      bayNumber: normalizedBayNumber,
      bayType: data.bayType || BayType.STANDARD,
      levelOrFloor: data.levelOrFloor?.trim() || 'Ground',
      status: data.status || BayStatus.AVAILABLE,
      maxVehicleHeightMeters: typeof data.maxVehicleHeightMeters === 'number' ? data.maxVehicleHeightMeters : undefined,
      maxVehicleLengthMeters: typeof data.maxVehicleLengthMeters === 'number' ? data.maxVehicleLengthMeters : undefined,
      maxVehicleWidthMeters: typeof data.maxVehicleWidthMeters === 'number' ? data.maxVehicleWidthMeters : undefined,
      supportedVehicles: Array.isArray(data.supportedVehicles) && data.supportedVehicles.length > 0
        ? data.supportedVehicles
        : [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.COMPACT],
      isEvCharging: Boolean(data.isEvCharging),
      evChargerKw: data.isEvCharging && typeof data.evChargerKw === 'number' ? data.evChargerKw : undefined,
      hasCctv: Boolean(data.hasCctv),
      isAccessible: Boolean(data.isAccessible),
      isCovered: Boolean(data.isCovered),
      notes: data.notes?.trim() || undefined,
      instructions: data.instructions?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.bays.push(newBay);

    // Update location totalBays count
    location.totalBays = this.getBaysByLocationId(locationId).length;
    location.updatedAt = now;

    this.saveToDisk();
    return newBay;
  }

  public bulkCreateBays(
    locationId: string,
    hostId: string,
    baysData: CreateBayRequest[],
    isAdmin = false
  ): ParkingBay[] {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);
    const created: ParkingBay[] = [];
    const now = new Date().toISOString();

    for (const data of baysData) {
      if (!data.bayNumber || typeof data.bayNumber !== 'string' || data.bayNumber.trim().length === 0) {
        continue;
      }
      const normalizedBayNumber = data.bayNumber.trim();
      const existingBays = this.getBaysByLocationId(locationId);
      const duplicate = existingBays.some(
        (b) => b.bayNumber.toLowerCase() === normalizedBayNumber.toLowerCase()
      );
      if (duplicate) {
        continue;
      }

      const bayId = `bay-${crypto.randomBytes(6).toString('hex')}`;
      const newBay: ParkingBay = {
        id: bayId,
        locationId: location.id,
        bayNumber: normalizedBayNumber,
        bayType: data.bayType || BayType.STANDARD,
        levelOrFloor: data.levelOrFloor?.trim() || 'Ground',
        status: data.status || BayStatus.AVAILABLE,
        maxVehicleHeightMeters: typeof data.maxVehicleHeightMeters === 'number' ? data.maxVehicleHeightMeters : undefined,
        maxVehicleLengthMeters: typeof data.maxVehicleLengthMeters === 'number' ? data.maxVehicleLengthMeters : undefined,
        maxVehicleWidthMeters: typeof data.maxVehicleWidthMeters === 'number' ? data.maxVehicleWidthMeters : undefined,
        supportedVehicles: Array.isArray(data.supportedVehicles) && data.supportedVehicles.length > 0
          ? data.supportedVehicles
          : [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.COMPACT],
        isEvCharging: Boolean(data.isEvCharging),
        evChargerKw: data.isEvCharging && typeof data.evChargerKw === 'number' ? data.evChargerKw : undefined,
        hasCctv: Boolean(data.hasCctv),
        isAccessible: Boolean(data.isAccessible),
        isCovered: Boolean(data.isCovered),
        notes: data.notes?.trim() || undefined,
        instructions: data.instructions?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      this.bays.push(newBay);
      created.push(newBay);
    }

    location.totalBays = this.getBaysByLocationId(locationId).length;
    location.updatedAt = now;
    this.saveToDisk();

    return created;
  }

  public updateBay(
    locationId: string,
    bayId: string,
    hostId: string,
    data: UpdateBayRequest,
    isAdmin = false
  ): ParkingBay {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);
    const bay = this.getBayForHost(locationId, bayId, hostId, isAdmin);

    if (data.bayNumber !== undefined) {
      if (typeof data.bayNumber !== 'string' || data.bayNumber.trim().length === 0) {
        throw new AppError('Bay identifier cannot be empty.', 400, 'VALIDATION_ERROR');
      }
      const normalized = data.bayNumber.trim();
      if (normalized.toLowerCase() !== bay.bayNumber.toLowerCase()) {
        const existingBays = this.getBaysByLocationId(locationId);
        const duplicate = existingBays.some(
          (b) => b.id !== bay.id && b.bayNumber.toLowerCase() === normalized.toLowerCase()
        );
        if (duplicate) {
          throw new AppError(
            `A parking space with identifier '${normalized}' already exists in this facility.`,
            409,
            'DUPLICATE_BAY_IDENTIFIER'
          );
        }
        bay.bayNumber = normalized;
      }
    }

    if (data.bayType !== undefined) bay.bayType = data.bayType;
    if (data.levelOrFloor !== undefined) bay.levelOrFloor = data.levelOrFloor.trim() || undefined;
    if (data.status !== undefined) bay.status = data.status;
    if (data.maxVehicleHeightMeters !== undefined) bay.maxVehicleHeightMeters = data.maxVehicleHeightMeters;
    if (data.maxVehicleLengthMeters !== undefined) bay.maxVehicleLengthMeters = data.maxVehicleLengthMeters;
    if (data.maxVehicleWidthMeters !== undefined) bay.maxVehicleWidthMeters = data.maxVehicleWidthMeters;
    if (Array.isArray(data.supportedVehicles)) bay.supportedVehicles = data.supportedVehicles;
    if (data.isEvCharging !== undefined) {
      bay.isEvCharging = Boolean(data.isEvCharging);
      if (data.isEvCharging && typeof data.evChargerKw === 'number') {
        bay.evChargerKw = data.evChargerKw;
      } else if (!data.isEvCharging) {
        bay.evChargerKw = undefined;
      }
    }
    if (data.hasCctv !== undefined) bay.hasCctv = Boolean(data.hasCctv);
    if (data.isAccessible !== undefined) bay.isAccessible = Boolean(data.isAccessible);
    if (data.isCovered !== undefined) bay.isCovered = Boolean(data.isCovered);
    if (data.notes !== undefined) bay.notes = data.notes.trim() || undefined;
    if (data.instructions !== undefined) bay.instructions = data.instructions.trim() || undefined;

    bay.updatedAt = new Date().toISOString();
    location.updatedAt = bay.updatedAt;

    this.saveToDisk();
    return bay;
  }

  public deleteBay(
    locationId: string,
    bayId: string,
    hostId: string,
    isAdmin = false
  ): void {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);
    const bay = this.getBayForHost(locationId, bayId, hostId, isAdmin);

    this.bays = this.bays.filter((b) => b.id !== bay.id);
    location.totalBays = this.getBaysByLocationId(locationId).length;
    location.updatedAt = new Date().toISOString();

    this.saveToDisk();
  }

  // --------------------------------------------------------------------------
  // Media / Photo Management
  // --------------------------------------------------------------------------

  public addPhoto(
    locationId: string,
    hostId: string,
    photo: Partial<FacilityPhoto>,
    isAdmin = false
  ): ParkingLocation {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);

    if (!photo.url || typeof photo.url !== 'string') {
      throw new AppError('A valid image URL is required.', 400, 'VALIDATION_ERROR');
    }

    if (!Array.isArray(location.photos)) {
      location.photos = [];
    }

    const isFirst = location.photos.length === 0;
    const isPrimary = photo.isPrimary !== undefined ? photo.isPrimary : isFirst;

    if (isPrimary) {
      location.photos.forEach((p) => {
        p.isPrimary = false;
      });
      location.imageUrl = photo.url;
    }

    const newPhoto: FacilityPhoto = {
      id: photo.id || `pho-${crypto.randomBytes(4).toString('hex')}`,
      url: photo.url,
      caption: photo.caption?.trim() || undefined,
      isPrimary,
      uploadedAt: new Date().toISOString(),
    };

    location.photos.push(newPhoto);
    if (!location.imageUrl) {
      location.imageUrl = newPhoto.url;
    }

    location.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return location;
  }

  public removePhoto(
    locationId: string,
    photoId: string,
    hostId: string,
    isAdmin = false
  ): ParkingLocation {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);

    if (!Array.isArray(location.photos) || location.photos.length === 0) {
      throw new NotFoundError('No photos found for this facility.');
    }

    const removedIndex = location.photos.findIndex((p) => p.id === photoId);
    if (removedIndex === -1) {
      throw new NotFoundError(`Photo '${photoId}' not found.`);
    }

    const wasPrimary = location.photos[removedIndex].isPrimary;
    location.photos.splice(removedIndex, 1);

    if (wasPrimary && location.photos.length > 0) {
      location.photos[0].isPrimary = true;
      location.imageUrl = location.photos[0].url;
    } else if (location.photos.length === 0) {
      location.imageUrl = undefined;
    }

    location.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return location;
  }

  // --------------------------------------------------------------------------
  // Listing Publication Readiness & Lifecycle
  // --------------------------------------------------------------------------

  public validatePublicationReadiness(locationId: string): FacilityPublicationValidation {
    const location = this.getLocationById(locationId);
    if (!location) {
      throw new NotFoundError(`Facility '${locationId}' not found.`);
    }

    const bays = this.getBaysByLocationId(locationId);
    const availableBays = bays.filter((b) => b.status === BayStatus.AVAILABLE);
    const checks: PublicationCheckItem[] = [];
    const missing: string[] = [];

    // Check 1: Facility Basic Profile
    const hasValidName = Boolean(location.name && location.name.trim().length >= 3);
    const hasValidDescription = Boolean(location.description && location.description.trim().length >= 10);
    const basicProfilePassed = hasValidName && hasValidDescription;
    checks.push({
      key: 'BASIC_PROFILE',
      label: 'Facility Name & Detailed Description',
      passed: basicProfilePassed,
      message: basicProfilePassed
        ? 'Facility name and description meet requirements.'
        : 'Name must be at least 3 characters and description at least 10 characters.',
    });
    if (!basicProfilePassed) missing.push('Facility name (min 3 chars) and description (min 10 chars)');

    // Check 2: Physical Address
    const hasAddress = Boolean(
      location.address &&
      location.address.line1 &&
      location.address.city &&
      location.address.state &&
      location.address.postalCode
    );
    checks.push({
      key: 'ADDRESS',
      label: 'Complete Street Address & Geo Coordinates',
      passed: hasAddress,
      message: hasAddress
        ? 'Physical address and geographic location verified.'
        : 'Street address line 1, city, state, and postal code are required.',
    });
    if (!hasAddress) missing.push('Complete street address (line1, city, state, postal code)');

    // Check 3: Entry & Access Instructions
    const hasAccess = Boolean(location.accessMethod && location.accessInstructions && location.accessInstructions.trim().length >= 5);
    checks.push({
      key: 'ACCESS_INSTRUCTIONS',
      label: 'Access Method & Driver Entry Guidance',
      passed: hasAccess,
      message: hasAccess
        ? `Driver access method configured (${location.accessMethod}) with entry instructions.`
        : 'Access method must be selected and entry instructions provided (min 5 chars).',
    });
    if (!hasAccess) missing.push('Access method and entry instructions (min 5 chars)');

    // Check 4: Pricing Defaults
    const hasPricing = Boolean(location.hourlyRateCents && location.hourlyRateCents > 0);
    checks.push({
      key: 'PRICING',
      label: 'Operational Rates & Security Deposit',
      passed: hasPricing,
      message: hasPricing
        ? `Hourly rate set ($${(location.hourlyRateCents / 100).toFixed(2)}/hr).`
        : 'Hourly parking rate must be configured and greater than $0.',
    });
    if (!hasPricing) missing.push('Valid hourly parking rate (> $0.00)');

    // Check 5: Physical Bays Inventory
    const hasAvailableBays = availableBays.length > 0;
    checks.push({
      key: 'BAY_INVENTORY',
      label: 'Physical Parking Spaces (At least 1 Available Space)',
      passed: hasAvailableBays,
      message: hasAvailableBays
        ? `${bays.length} physical bay(s) configured (${availableBays.length} available).`
        : 'Facility must have at least one physical parking space with AVAILABLE status.',
    });
    if (!hasAvailableBays) missing.push('At least one configured parking space with AVAILABLE status');

    // Check 6: Photographs
    const hasPhotos = Boolean(
      (location.photos && location.photos.length > 0) ||
      (location.imageUrl && location.imageUrl.trim().length > 0)
    );
    checks.push({
      key: 'PHOTOGRAPHS',
      label: 'Photographs & Visual Verification',
      passed: hasPhotos,
      message: hasPhotos
        ? 'Facility photography provided for driver orientation.'
        : 'At least one photograph must be uploaded or selected for this listing.',
    });
    if (!hasPhotos) missing.push('At least one facility photograph for driver orientation');

    const isReady = checks.every((c) => c.passed);

    return {
      facilityId: location.id,
      isReady,
      currentStatus: location.status,
      checks,
      missingRequirements: missing,
    };
  }

  public publishLocation(
    locationId: string,
    hostId: string,
    isAdmin = false
  ): PublishFacilityResponse {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);
    const validation = this.validatePublicationReadiness(locationId);

    if (!validation.isReady) {
      throw new AppError(
        `Facility cannot be published. ${validation.missingRequirements.length} requirement(s) are not satisfied: ${validation.missingRequirements.join('; ')}`,
        400,
        'PUBLICATION_REQUIREMENTS_NOT_MET'
      );
    }

    location.status = LocationStatus.ACTIVE;
    location.publishedAt = new Date().toISOString();
    location.updatedAt = new Date().toISOString();
    this.saveToDisk();

    return {
      success: true,
      facility: location,
      validation: {
        ...validation,
        currentStatus: location.status,
      },
    };
  }

  public unpublishLocation(
    locationId: string,
    hostId: string,
    isAdmin = false
  ): ParkingLocation {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);
    location.status = LocationStatus.DRAFT;
    location.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return location;
  }
}

export const inventoryService = InventoryService.getInstance();
