import {
  ParkingLocation,
  ParkingBay,
  LocationStatus,
  BayType,
  BayStatus,
  AccessMethod,
} from '../../../packages/contracts';

// In-memory baseline store initialized with verified domain models
class InventoryService {
  private locations: ParkingLocation[] = [
    {
      id: 'loc-dt-001',
      hostId: 'usr-host-001',
      name: 'Financial Tower Covered Facility',
      description: 'Secured underground parking facility with 24/7 CCTV surveillance, automated gate access, and EV charging points in the core financial district.',
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
      amenities: ['EV Charging', 'CCTV Security', 'Covered Garage', 'Elevator Access', 'Paved Surface'],
      imageUrl: '/src/assets/images/hero_parking_bay_1792157347279.jpg',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-01T12:00:00Z',
    },
    {
      id: 'loc-res-002',
      hostId: 'usr-host-001',
      name: 'Oakridge Residential Driveway & EV Point',
      description: 'Private suburban double-driveway in a tranquil, quiet neighborhood. Features a dedicated 11kW Level 2 EV charging post.',
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
      imageUrl: '/src/assets/images/host_parking_driveway_1792157348722.jpg',
      createdAt: '2026-01-20T14:30:00Z',
      updatedAt: '2026-02-15T09:15:00Z',
    },
    {
      id: 'loc-hub-003',
      hostId: 'usr-host-002',
      name: 'Urban Transit Mobility Hub Bay 12',
      description: 'Multi-level smart transit center bay adjacent to central rail interchange. Direct skyway connection to terminal.',
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
      imageUrl: '/src/assets/images/admin_facility_aerial_1792157347651.jpg',
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-03-01T16:00:00Z',
    },
  ];

  private bays: ParkingBay[] = [
    {
      id: 'bay-001-a',
      locationId: 'loc-dt-001',
      bayNumber: 'B2-30',
      bayType: BayType.COVERED,
      levelOrFloor: 'B2',
      status: BayStatus.AVAILABLE,
      maxVehicleHeightMeters: 2.1,
      isEvCharging: false,
      hasCctv: true,
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
      isEvCharging: true,
      evChargerKw: 7.4,
      hasCctv: true,
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
      isEvCharging: true,
      evChargerKw: 11,
      hasCctv: false,
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
      isEvCharging: false,
      hasCctv: true,
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-03-01T16:00:00Z',
    },
  ];

  public getAllLocations(): ParkingLocation[] {
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
}

export const inventoryService = new InventoryService();
