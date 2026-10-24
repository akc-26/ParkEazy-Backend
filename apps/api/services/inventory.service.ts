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

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production' || appConfig.nodeEnv === 'production' || appConfig.database.isRequired;
  }

  public isDemoSeedingPermitted(): boolean {
    if (this.isProduction()) {
      return false;
    }
    return process.env.NODE_ENV === 'test' || process.env.PARKEAZY_DEMO_MODE === 'true' || process.env.ENABLE_DEMO_SEEDING === 'true';
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.locations)) {
          this.locations = parsed.locations;
          this.bays = Array.isArray(parsed.bays) ? parsed.bays : [];
          return;
        }
      }
    } catch (err: any) {
      console.warn('[ParkEazy-Inventory] Notice loading persisted store:', err.message);
    }

    // Only seed demo fixtures if strictly permitted in non-production
    if (this.isDemoSeedingPermitted()) {
      this.locations = JSON.parse(JSON.stringify(this.INITIAL_LOCATIONS));
      this.bays = JSON.parse(JSON.stringify(this.INITIAL_BAYS));
      this.saveToDisk();
    } else {
      this.locations = [];
      this.bays = [];
    }
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
    if (this.isProduction()) {
      throw new Error('resetStores is strictly prohibited in production.');
    }
    if (this.isDemoSeedingPermitted()) {
      this.locations = JSON.parse(JSON.stringify(this.INITIAL_LOCATIONS));
      this.bays = JSON.parse(JSON.stringify(this.INITIAL_BAYS));
    } else {
      this.locations = [];
      this.bays = [];
    }
    this.saveToDisk();
  }

  public async resetStoresAsync(): Promise<void> {
    if (this.isProduction()) {
      throw new Error('resetStoresAsync is strictly prohibited in production.');
    }
    this.resetStores();
    if (dbManager.isPostgresConnected()) {
      const client = await dbManager.getClient();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM parking_bays');
        await client.query('DELETE FROM parking_locations');
        await client.query('COMMIT');
      } catch (err: any) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }

      if (this.isDemoSeedingPermitted()) {
        for (const loc of this.locations) {
          await this.syncLocationToPostgres(loc);
        }
        for (const bay of this.bays) {
          await this.syncBayToPostgres(bay);
        }
      }
    }
  }

  public async initialize(): Promise<void> {
    if (!dbManager.isPostgresConnected()) {
      if (this.isProduction()) {
        throw new Error('Authoritative PostgreSQL database is not connected in production mode.');
      }
      return;
    }
    await this.loadFromPostgres();
  }

  public async loadFromPostgres(): Promise<void> {
    if (!dbManager.isPostgresConnected()) return;

    try {
      const locRes = await dbManager.query('SELECT * FROM parking_locations ORDER BY created_at ASC');
      const bayRes = await dbManager.query('SELECT * FROM parking_bays ORDER BY created_at ASC');

      if (locRes && Array.isArray(locRes.rows) && locRes.rows.length > 0) {
        const loadedBays: ParkingBay[] = bayRes && Array.isArray(bayRes.rows)
          ? bayRes.rows.map((r: any) => ({
              id: r.id,
              locationId: r.location_id,
              bayNumber: r.bay_number,
              bayType: r.bay_type || BayType.STANDARD,
              levelOrFloor: r.level_or_floor || 'Ground',
              status: r.status || BayStatus.AVAILABLE,
              maxVehicleHeightMeters: r.max_vehicle_height_meters ? parseFloat(r.max_vehicle_height_meters) : undefined,
              maxVehicleLengthMeters: r.max_vehicle_length_meters ? parseFloat(r.max_vehicle_length_meters) : undefined,
              maxVehicleWidthMeters: r.max_vehicle_width_meters ? parseFloat(r.max_vehicle_width_meters) : undefined,
              supportedVehicles: Array.isArray(r.supported_vehicles) ? r.supported_vehicles : [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.COMPACT],
              isEvCharging: Boolean(r.is_ev_charging),
              evChargerKw: r.ev_charger_kw ? parseFloat(r.ev_charger_kw) : undefined,
              hasCctv: Boolean(r.has_cctv),
              isAccessible: Boolean(r.is_accessible),
              isCovered: Boolean(r.is_covered),
              notes: r.notes || undefined,
              instructions: r.instructions || undefined,
              createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
              updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
            }))
          : [];

        const loadedLocations: ParkingLocation[] = locRes.rows.map((r: any) => {
          let parsedPhotos = [];
          if (Array.isArray(r.photos)) {
            parsedPhotos = r.photos;
          } else if (typeof r.photos === 'string') {
            try { parsedPhotos = JSON.parse(r.photos); } catch {}
          }
          const loc: ParkingLocation = {
            id: r.id,
            hostId: r.host_id,
            name: r.name,
            description: r.description || '',
            propertyType: r.property_type || PropertyType.GARAGE,
            address: {
              line1: r.address_line1,
              line2: r.address_line2 || undefined,
              city: r.city,
              state: r.state,
              postalCode: r.postal_code,
              country: r.country || 'US',
              latitude: parseFloat(r.latitude) || 37.7749,
              longitude: parseFloat(r.longitude) || -122.4194,
            },
            timezone: r.timezone || 'America/Los_Angeles',
            accessMethod: r.access_method || AccessMethod.GATE_CODE,
            accessInstructions: r.access_instructions || undefined,
            status: r.status || LocationStatus.DRAFT,
            totalBays: loadedBays.filter((b) => b.locationId === r.id).length,
            hourlyRateCents: Number(r.hourly_rate_cents) || 500,
            dailyRateCents: Number(r.daily_rate_cents) || 3500,
            securityDepositCents: Number(r.security_deposit_cents) || 2000,
            amenities: Array.isArray(r.amenities) ? r.amenities : [],
            imageUrl: r.image_url || undefined,
            photos: parsedPhotos,
            publishedAt: r.published_at_utc ? new Date(r.published_at_utc).toISOString() : undefined,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
          };
          return loc;
        });

        this.locations = loadedLocations;
        this.bays = loadedBays;
        this.saveToDisk();
      } else {
        // Empty database: In production startup NEVER seed demo facilities or bays into empty DB!
        if (!this.isProduction() && this.isDemoSeedingPermitted() && process.env.SEED_DEMO_DATA === 'true') {
          for (const loc of this.INITIAL_LOCATIONS) {
            await this.syncLocationToPostgres(loc);
          }
          for (const bay of this.INITIAL_BAYS) {
            await this.syncBayToPostgres(bay);
          }
        } else {
          this.locations = [];
          this.bays = [];
          this.saveToDisk();
        }
      }
    } catch (err: any) {
      if (this.isProduction()) {
        throw new Error(`Failed to load inventory from PostgreSQL: ${err.message}`);
      }
      console.warn('[ParkEazy-Inventory] Warning reading inventory from PostgreSQL:', err.message);
    }
  }

  public async syncLocationToPostgres(loc: ParkingLocation): Promise<void> {
    const isProd = this.isProduction();
    if (!dbManager.isPostgresConnected()) {
      if (isProd) {
        throw new AppError('Authoritative PostgreSQL database is required in production.', 503, 'DATABASE_UNAVAILABLE');
      }
      return;
    }

    const client = await dbManager.getClient();
    try {
      await client.query('BEGIN');

      // Ensure host record exists in users table to satisfy foreign key constraint
      await client.query(
        `INSERT INTO users (id, email, first_name, last_name, roles, is_host_verified)
         VALUES ($1, $2, 'Host', 'Partner', '{"HOST","CUSTOMER"}', true)
         ON CONFLICT (id) DO NOTHING`,
        [loc.hostId, `${loc.hostId}@parkeazy.internal`]
      );

      await client.query(
        `INSERT INTO parking_locations (
          id, host_id, name, description, address_line1, address_line2,
          city, state, postal_code, country, latitude, longitude,
          timezone, access_method, status, hourly_rate_cents, daily_rate_cents,
          security_deposit_cents, property_type, access_instructions, amenities,
          image_url, photos, published_at_utc, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          address_line1 = EXCLUDED.address_line1,
          address_line2 = EXCLUDED.address_line2,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          postal_code = EXCLUDED.postal_code,
          country = EXCLUDED.country,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          timezone = EXCLUDED.timezone,
          access_method = EXCLUDED.access_method,
          status = EXCLUDED.status,
          hourly_rate_cents = EXCLUDED.hourly_rate_cents,
          daily_rate_cents = EXCLUDED.daily_rate_cents,
          security_deposit_cents = EXCLUDED.security_deposit_cents,
          property_type = EXCLUDED.property_type,
          access_instructions = EXCLUDED.access_instructions,
          amenities = EXCLUDED.amenities,
          image_url = EXCLUDED.image_url,
          photos = EXCLUDED.photos,
          published_at_utc = EXCLUDED.published_at_utc,
          updated_at = NOW()`,
        [
          loc.id,
          loc.hostId,
          loc.name,
          loc.description,
          loc.address.line1,
          loc.address.line2 || null,
          loc.address.city,
          loc.address.state,
          loc.address.postalCode,
          loc.address.country || 'US',
          loc.address.latitude,
          loc.address.longitude,
          loc.timezone,
          loc.accessMethod,
          loc.status,
          loc.hourlyRateCents,
          loc.dailyRateCents,
          loc.securityDepositCents,
          loc.propertyType,
          loc.accessInstructions || null,
          loc.amenities || [],
          loc.imageUrl || null,
          JSON.stringify(loc.photos || []),
          loc.publishedAt || null,
          loc.createdAt,
        ]
      );

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw new AppError(`Failed to persist facility to PostgreSQL: ${err.message}`, 500, 'DATABASE_PERSISTENCE_ERROR');
    } finally {
      client.release();
    }
  }

  public async deleteLocationFromPostgres(locationId: string): Promise<void> {
    const isProd = this.isProduction();
    if (!dbManager.isPostgresConnected()) {
      if (isProd) {
        throw new AppError('Authoritative PostgreSQL database is required in production.', 503, 'DATABASE_UNAVAILABLE');
      }
      return;
    }

    const client = await dbManager.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM parking_bays WHERE location_id = $1', [locationId]);
      await client.query('DELETE FROM parking_locations WHERE id = $1', [locationId]);
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw new AppError(`Failed to delete facility from PostgreSQL: ${err.message}`, 500, 'DATABASE_PERSISTENCE_ERROR');
    } finally {
      client.release();
    }
  }

  public async syncBayToPostgres(bay: ParkingBay): Promise<void> {
    const isProd = this.isProduction();
    if (!dbManager.isPostgresConnected()) {
      if (isProd) {
        throw new AppError('Authoritative PostgreSQL database is required in production.', 503, 'DATABASE_UNAVAILABLE');
      }
      return;
    }

    // Ensure parent facility exists in PostgreSQL
    const parentLoc = this.getLocationById(bay.locationId);
    if (parentLoc) {
      await this.syncLocationToPostgres(parentLoc);
    }

    const client = await dbManager.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO parking_bays (
          id, location_id, bay_number, bay_type, level_or_floor, status,
          is_ev_charging, has_cctv, max_vehicle_height_meters, max_vehicle_length_meters,
          max_vehicle_width_meters, supported_vehicles, ev_charger_kw, is_accessible,
          is_covered, notes, instructions, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          bay_number = EXCLUDED.bay_number,
          bay_type = EXCLUDED.bay_type,
          level_or_floor = EXCLUDED.level_or_floor,
          status = EXCLUDED.status,
          is_ev_charging = EXCLUDED.is_ev_charging,
          has_cctv = EXCLUDED.has_cctv,
          max_vehicle_height_meters = EXCLUDED.max_vehicle_height_meters,
          max_vehicle_length_meters = EXCLUDED.max_vehicle_length_meters,
          max_vehicle_width_meters = EXCLUDED.max_vehicle_width_meters,
          supported_vehicles = EXCLUDED.supported_vehicles,
          ev_charger_kw = EXCLUDED.ev_charger_kw,
          is_accessible = EXCLUDED.is_accessible,
          is_covered = EXCLUDED.is_covered,
          notes = EXCLUDED.notes,
          instructions = EXCLUDED.instructions,
          updated_at = NOW()`,
        [
          bay.id,
          bay.locationId,
          bay.bayNumber,
          bay.bayType,
          bay.levelOrFloor || null,
          bay.status,
          bay.isEvCharging,
          bay.hasCctv,
          bay.maxVehicleHeightMeters || null,
          bay.maxVehicleLengthMeters || null,
          bay.maxVehicleWidthMeters || null,
          bay.supportedVehicles || [],
          bay.evChargerKw || null,
          bay.isAccessible,
          bay.isCovered,
          bay.notes || null,
          bay.instructions || null,
          bay.createdAt,
        ]
      );
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw new AppError(`Failed to persist bay to PostgreSQL: ${err.message}`, 500, 'DATABASE_PERSISTENCE_ERROR');
    } finally {
      client.release();
    }
  }

  public async syncBulkBaysToPostgres(bays: ParkingBay[]): Promise<void> {
    if (!bays || bays.length === 0) return;
    const isProd = this.isProduction();
    if (!dbManager.isPostgresConnected()) {
      if (isProd) {
        throw new AppError('Authoritative PostgreSQL database is required in production.', 503, 'DATABASE_UNAVAILABLE');
      }
      return;
    }

    const client = await dbManager.getClient();
    try {
      await client.query('BEGIN');
      for (const bay of bays) {
        await client.query(
          `INSERT INTO parking_bays (
            id, location_id, bay_number, bay_type, level_or_floor, status,
            is_ev_charging, has_cctv, max_vehicle_height_meters, max_vehicle_length_meters,
            max_vehicle_width_meters, supported_vehicles, ev_charger_kw, is_accessible,
            is_covered, notes, instructions, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            bay_number = EXCLUDED.bay_number,
            bay_type = EXCLUDED.bay_type,
            level_or_floor = EXCLUDED.level_or_floor,
            status = EXCLUDED.status,
            is_ev_charging = EXCLUDED.is_ev_charging,
            has_cctv = EXCLUDED.has_cctv,
            max_vehicle_height_meters = EXCLUDED.max_vehicle_height_meters,
            max_vehicle_length_meters = EXCLUDED.max_vehicle_length_meters,
            max_vehicle_width_meters = EXCLUDED.max_vehicle_width_meters,
            supported_vehicles = EXCLUDED.supported_vehicles,
            ev_charger_kw = EXCLUDED.ev_charger_kw,
            is_accessible = EXCLUDED.is_accessible,
            is_covered = EXCLUDED.is_covered,
            notes = EXCLUDED.notes,
            instructions = EXCLUDED.instructions,
            updated_at = NOW()`,
          [
            bay.id,
            bay.locationId,
            bay.bayNumber,
            bay.bayType,
            bay.levelOrFloor || null,
            bay.status,
            bay.isEvCharging,
            bay.hasCctv,
            bay.maxVehicleHeightMeters || null,
            bay.maxVehicleLengthMeters || null,
            bay.maxVehicleWidthMeters || null,
            bay.supportedVehicles || [],
            bay.evChargerKw || null,
            bay.isAccessible,
            bay.isCovered,
            bay.notes || null,
            bay.instructions || null,
            bay.createdAt,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw new AppError(`Failed to persist bulk bays to PostgreSQL: ${err.message}`, 500, 'DATABASE_PERSISTENCE_ERROR');
    } finally {
      client.release();
    }
  }

  public async deleteBayFromPostgres(bayId: string): Promise<void> {
    const isProd = this.isProduction();
    if (!dbManager.isPostgresConnected()) {
      if (isProd) {
        throw new AppError('Authoritative PostgreSQL database is required in production.', 503, 'DATABASE_UNAVAILABLE');
      }
      return;
    }

    try {
      await dbManager.query('DELETE FROM parking_bays WHERE id = $1', [bayId]);
    } catch (err: any) {
      throw new AppError(`Failed to delete bay from PostgreSQL: ${err.message}`, 500, 'DATABASE_PERSISTENCE_ERROR');
    }
  }

  public rollbackLocation(locationId: string): void {
    this.locations = this.locations.filter((l) => l.id !== locationId);
    this.saveToDisk();
  }

  public rollbackBay(bayId: string, locationId: string): void {
    this.bays = this.bays.filter((b) => b.id !== bayId);
    const loc = this.getLocationById(locationId);
    if (loc) {
      loc.totalBays = this.getBaysByLocationId(locationId).length;
    }
    this.saveToDisk();
  }

  public rollbackBays(bayIds: string[], locationId: string): void {
    const set = new Set(bayIds);
    this.bays = this.bays.filter((b) => !set.has(b.id));
    const loc = this.getLocationById(locationId);
    if (loc) {
      loc.totalBays = this.getBaysByLocationId(locationId).length;
    }
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
    return this.locations.find((l) => l.id === id) || this.INITIAL_LOCATIONS.find((l) => l.id === id);
  }

  public getBaysByLocationId(locationId: string): ParkingBay[] {
    const fromList = this.bays.filter((b) => b.locationId === locationId);
    if (fromList.length > 0) return fromList;
    return this.INITIAL_BAYS.filter((b) => b.locationId === locationId);
  }

  public getBayById(bayId: string): ParkingBay | undefined {
    return this.bays.find((b) => b.id === bayId) || this.INITIAL_BAYS.find((b) => b.id === bayId);
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

  public bulkUpdateBays(
    locationId: string,
    hostId: string,
    updates: (UpdateBayRequest & { id: string })[],
    isAdmin = false
  ): ParkingBay[] {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new AppError('A non-empty list of bay updates is required.', 400, 'VALIDATION_ERROR');
    }

    const locationBays = this.getBaysByLocationId(locationId);
    const locationBayMap = new Map<string, ParkingBay>(locationBays.map((b) => [b.id, b]));

    // Validate that all target bays belong to this location
    for (const update of updates) {
      if (!update.id) {
        throw new AppError('Bay id is required for each update.', 400, 'VALIDATION_ERROR');
      }
      const existing = locationBayMap.get(update.id);
      if (!existing) {
        throw new AppError(
          `Parking bay '${update.id}' does not belong to facility '${locationId}'. Unauthorized reassignment.`,
          403,
          'FORBIDDEN'
        );
      }
    }

    const now = new Date().toISOString();
    const updatedBays: ParkingBay[] = [];

    for (const update of updates) {
      const bay = locationBayMap.get(update.id)!;
      if (update.bayNumber !== undefined) {
        const normalized = update.bayNumber.trim();
        if (normalized.length === 0) {
          throw new AppError('Bay identifier cannot be empty.', 400, 'VALIDATION_ERROR');
        }
        const duplicate = locationBays.some(
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
      if (update.bayType !== undefined) bay.bayType = update.bayType;
      if (update.levelOrFloor !== undefined) bay.levelOrFloor = update.levelOrFloor.trim() || undefined;
      if (update.status !== undefined) bay.status = update.status;
      if (update.maxVehicleHeightMeters !== undefined) bay.maxVehicleHeightMeters = update.maxVehicleHeightMeters;
      if (update.maxVehicleLengthMeters !== undefined) bay.maxVehicleLengthMeters = update.maxVehicleLengthMeters;
      if (update.maxVehicleWidthMeters !== undefined) bay.maxVehicleWidthMeters = update.maxVehicleWidthMeters;
      if (Array.isArray(update.supportedVehicles)) bay.supportedVehicles = update.supportedVehicles;
      if (update.isEvCharging !== undefined) {
        bay.isEvCharging = Boolean(update.isEvCharging);
        if (update.isEvCharging && typeof update.evChargerKw === 'number') {
          bay.evChargerKw = update.evChargerKw;
        } else if (!update.isEvCharging) {
          bay.evChargerKw = undefined;
        }
      }
      if (update.hasCctv !== undefined) bay.hasCctv = Boolean(update.hasCctv);
      if (update.isAccessible !== undefined) bay.isAccessible = Boolean(update.isAccessible);
      if (update.isCovered !== undefined) bay.isCovered = Boolean(update.isCovered);
      if (update.notes !== undefined) bay.notes = update.notes.trim() || undefined;
      if (update.instructions !== undefined) bay.instructions = update.instructions.trim() || undefined;
      bay.updatedAt = now;
      updatedBays.push(bay);
    }

    location.updatedAt = now;
    this.saveToDisk();

    return updatedBays;
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

  public updateLocationStatus(
    locationId: string,
    hostId: string,
    status: LocationStatus,
    isAdmin = false
  ): ParkingLocation {
    const location = this.getLocationForHost(locationId, hostId, isAdmin);
    const validStatuses = [LocationStatus.DRAFT, LocationStatus.ACTIVE, LocationStatus.SUSPENDED, LocationStatus.PENDING_APPROVAL];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status '${status}'.`, 400, 'VALIDATION_ERROR');
    }
    if (status === LocationStatus.ACTIVE && !isAdmin) {
      return this.publishLocation(locationId, hostId, isAdmin).facility;
    }
    location.status = status;
    location.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return location;
  }

  public addBayPhoto(
    locationId: string,
    bayId: string,
    hostId: string,
    photo: Partial<FacilityPhoto>,
    isAdmin = false
  ): ParkingBay {
    const bay = this.getBayForHost(locationId, bayId, hostId, isAdmin);
    if (!photo.url || typeof photo.url !== 'string') {
      throw new AppError('A valid image URL is required.', 400, 'VALIDATION_ERROR');
    }
    if (!Array.isArray(bay.photos)) {
      bay.photos = [];
    }
    const isFirst = bay.photos.length === 0;
    const isPrimary = photo.isPrimary !== undefined ? photo.isPrimary : isFirst;
    if (isPrimary) {
      bay.photos.forEach((p) => {
        p.isPrimary = false;
      });
    }
    const newPhoto: FacilityPhoto = {
      id: photo.id || `pho-${crypto.randomBytes(4).toString('hex')}`,
      url: photo.url,
      caption: photo.caption?.trim() || undefined,
      isPrimary,
      uploadedAt: new Date().toISOString(),
    };
    bay.photos.push(newPhoto);
    bay.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return bay;
  }

  public removeBayPhoto(
    locationId: string,
    bayId: string,
    photoId: string,
    hostId: string,
    isAdmin = false
  ): ParkingBay {
    const bay = this.getBayForHost(locationId, bayId, hostId, isAdmin);
    if (!Array.isArray(bay.photos) || bay.photos.length === 0) {
      throw new NotFoundError('No photos found for this space.');
    }
    const index = bay.photos.findIndex((p) => p.id === photoId);
    if (index === -1) {
      throw new NotFoundError(`Photo '${photoId}' not found.`);
    }
    const wasPrimary = bay.photos[index].isPrimary;
    bay.photos.splice(index, 1);
    if (wasPrimary && bay.photos.length > 0) {
      bay.photos[0].isPrimary = true;
    }
    bay.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return bay;
  }
}

export const inventoryService = InventoryService.getInstance();
