/**
 * Inventory contracts: Parking Location vs Physical Bay separation
 * As specified in architecture rule: A parking location and a physical parking bay are distinct entities.
 * Each physical bay has its own inventory identity.
 */

export enum LocationStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum BayType {
  STANDARD = 'STANDARD',
  COMPACT = 'COMPACT',
  EV_CHARGING = 'EV_CHARGING',
  ACCESSIBLE = 'ACCESSIBLE',
  COVERED = 'COVERED',
  OVERSIZED = 'OVERSIZED',
}

export enum BayStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum AccessMethod {
  APP_BLE = 'APP_BLE',
  GATE_CODE = 'GATE_CODE',
  KEYCARD = 'KEYCARD',
  ATTENDANT = 'ATTENDANT',
  OPEN_ACCESS = 'OPEN_ACCESS',
}

export interface ParkingLocation {
  id: string;
  hostId: string;
  name: string;
  description: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  timezone: string;
  accessMethod: AccessMethod;
  accessInstructions?: string;
  status: LocationStatus;
  totalBays: number;
  hourlyRateCents: number;
  dailyRateCents: number;
  securityDepositCents: number;
  amenities: string[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingBay {
  id: string;
  locationId: string;
  bayNumber: string;
  bayType: BayType;
  levelOrFloor?: string;
  status: BayStatus;
  maxVehicleHeightMeters?: number;
  isEvCharging: boolean;
  evChargerKw?: number;
  hasCctv: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
