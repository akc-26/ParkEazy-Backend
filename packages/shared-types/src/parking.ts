export const VEHICLE_TYPES = ['car', 'bike', 'auto', 'suv'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const SPACE_STATUSES = ['available', 'occupied', 'reserved', 'maintenance'] as const;
export type SpaceStatus = (typeof SPACE_STATUSES)[number];

export const FACILITY_STATUSES = ['draft', 'under_review', 'published', 'suspended'] as const;
export type FacilityStatus = (typeof FACILITY_STATUSES)[number];

export interface ParkingSpaceStub {
  id: string;
  facilityId: string;
  code: string;
  vehicleType: VehicleType;
  status: SpaceStatus;
  hourlyRateInr: number;
  floorLevel?: string;
  bayNumber?: string;
}

export interface FacilityStub {
  id: string;
  name: string;
  address: string;
  city: string;
  totalSpaces: number;
  activeSpaces: number;
  isOpen: boolean;
}

export interface ParkingSpace {
  id: string; // UUID
  facilityId: string;
  tenantId: string;
  bayIdentifier: string; // e.g. 'A-01'
  floorLevel: string;    // e.g. 'Ground', 'B1'
  vehicleCategory: VehicleType;
  hasEvCharger: boolean;
  evChargerPowerKw?: number;
  isDisabledAccessible: boolean;
  hourlyRateInr: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperatingSchedule {
  id: string;
  facilityId: string;
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)
  openTime: string;  // '08:00'
  closeTime: string; // '22:00'
  isClosed: boolean;
}

export interface FacilityClosure {
  id: string;
  facilityId: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export interface ParkingFacility {
  id: string; // UUID
  tenantId: string;
  hostId: string;
  facilityCode: string; // e.g. '#FAC-0104'
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  entranceInstructions?: string;
  gatePinCode?: string;
  isCovered: boolean;
  is24x7: boolean;
  status: FacilityStatus;
  totalSpaces: number;
  activeSpaces: number;
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}
