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

export enum VehicleCategory {
  COMPACT = 'COMPACT',
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  TRUCK = 'TRUCK',
  VAN = 'VAN',
  MOTORCYCLE = 'MOTORCYCLE',
}

export enum PropertyType {
  DRIVEWAY = 'DRIVEWAY',
  GARAGE = 'GARAGE',
  PARKING_LOT = 'PARKING_LOT',
  UNDERGROUND = 'UNDERGROUND',
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  CARPORT = 'CARPORT',
  OTHER = 'OTHER',
}

export interface FacilityPhoto {
  id: string;
  url: string;
  caption?: string;
  isPrimary?: boolean;
  uploadedAt: string;
}

export interface ParkingLocation {
  id: string;
  hostId: string;
  name: string;
  description: string;
  propertyType?: PropertyType | string;
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
  photos?: FacilityPhoto[];
  publishedAt?: string;
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
  maxVehicleLengthMeters?: number;
  maxVehicleWidthMeters?: number;
  supportedVehicles?: VehicleCategory[];
  isEvCharging: boolean;
  evChargerKw?: number;
  hasCctv: boolean;
  isAccessible?: boolean;
  isCovered?: boolean;
  notes?: string;
  instructions?: string;
  photos?: FacilityPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFacilityRequest {
  name: string;
  description: string;
  propertyType?: PropertyType | string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  timezone?: string;
  accessMethod?: AccessMethod;
  accessInstructions?: string;
  hourlyRateCents?: number;
  dailyRateCents?: number;
  securityDepositCents?: number;
  amenities?: string[];
  imageUrl?: string;
  photos?: FacilityPhoto[];
}

export interface UpdateFacilityRequest {
  name?: string;
  description?: string;
  propertyType?: PropertyType | string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  timezone?: string;
  accessMethod?: AccessMethod;
  accessInstructions?: string;
  hourlyRateCents?: number;
  dailyRateCents?: number;
  securityDepositCents?: number;
  amenities?: string[];
  imageUrl?: string;
  photos?: FacilityPhoto[];
  status?: LocationStatus;
}

export interface CreateBayRequest {
  bayNumber: string;
  bayType?: BayType;
  levelOrFloor?: string;
  status?: BayStatus;
  maxVehicleHeightMeters?: number;
  maxVehicleLengthMeters?: number;
  maxVehicleWidthMeters?: number;
  supportedVehicles?: VehicleCategory[];
  isEvCharging?: boolean;
  evChargerKw?: number;
  hasCctv?: boolean;
  isAccessible?: boolean;
  isCovered?: boolean;
  notes?: string;
  instructions?: string;
}

export interface UpdateBayRequest {
  bayNumber?: string;
  bayType?: BayType;
  levelOrFloor?: string;
  status?: BayStatus;
  maxVehicleHeightMeters?: number;
  maxVehicleLengthMeters?: number;
  maxVehicleWidthMeters?: number;
  supportedVehicles?: VehicleCategory[];
  isEvCharging?: boolean;
  evChargerKw?: number;
  hasCctv?: boolean;
  isAccessible?: boolean;
  isCovered?: boolean;
  notes?: string;
  instructions?: string;
}

export interface PublicationCheckItem {
  key: string;
  label: string;
  passed: boolean;
  message?: string;
}

export interface FacilityPublicationValidation {
  facilityId: string;
  isReady: boolean;
  currentStatus: LocationStatus;
  checks: PublicationCheckItem[];
  missingRequirements: string[];
}

export interface PublishFacilityResponse {
  success: boolean;
  facility: ParkingLocation;
  validation: FacilityPublicationValidation;
}
