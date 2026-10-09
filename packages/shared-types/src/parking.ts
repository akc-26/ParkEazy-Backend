export type VehicleType = 'car' | 'bike' | 'auto' | 'suv';

export type SpaceStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

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
