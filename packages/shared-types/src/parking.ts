export const VEHICLE_TYPES = ['car', 'bike', 'auto', 'suv'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const SPACE_STATUSES = ['available', 'occupied', 'reserved', 'maintenance'] as const;
export type SpaceStatus = (typeof SPACE_STATUSES)[number];

export const FACILITY_STATUSES = ['draft', 'under_review', 'published', 'suspended'] as const;
export type FacilityStatus = (typeof FACILITY_STATUSES)[number];

export const FACILITY_OPERATING_MODELS = [
  'commercial_garage',
  'residential_driveway',
  'open_ground',
] as const;
export type FacilityOperatingModel = (typeof FACILITY_OPERATING_MODELS)[number];

export const BAY_CLASSIFICATIONS = [
  'standard',
  'compact',
  'oversized',
  'tandem',
] as const;
export type BayClassification = (typeof BAY_CLASSIFICATIONS)[number];

export const STALL_POSITIONS = [
  'single_independent',
  'pillar_left',
  'pillar_right',
  'wall_backing',
] as const;
export type StallPosition = (typeof STALL_POSITIONS)[number];

export const MANEUVERABILITY_ANGLES = [
  '90_perpendicular',
  '60_angled',
  'parallel',
] as const;
export type ManeuverabilityAngle = (typeof MANEUVERABILITY_ANGLES)[number];

export const SURFACE_FLOORINGS = [
  'epoxy_coated',
  'concrete_pavers',
  'asphalt',
  'gravel',
] as const;
export type SurfaceFlooringCondition = (typeof SURFACE_FLOORINGS)[number];

export const INGRESS_CORRIDOR_TYPES = [
  'two_way_ramp',
  'single_lane_signal',
  'ground_level_barrier',
  'open_driveway',
] as const;
export type IngressCorridorType = (typeof INGRESS_CORRIDOR_TYPES)[number];

export const ACCESS_ARRANGEMENTS = [
  'anpr_barrier',
  'guarded_boom_barrier',
  'keypad_lockbox',
  'open_ingress',
] as const;
export type AccessArrangementType = (typeof ACCESS_ARRANGEMENTS)[number];

export const FUEL_COMPATIBILITIES = [
  'petrol',
  'diesel',
  'electric',
  'cng',
] as const;
export type FuelCompatibility = (typeof FUEL_COMPATIBILITIES)[number];

export interface FacilityPhoto {
  id: string;
  url: string;
  caption?: string;
  category: 'entrance' | 'bay' | 'overview' | 'amenities';
  isCover?: boolean;
  createdAt: string;
}

export interface ReadinessCheckItem {
  id: string;
  label: string;
  passed: boolean;
  category: 'facility' | 'space' | 'pricing';
  message?: string;
}

export interface PublicationReadinessResult {
  facilityId: string;
  isReady: boolean;
  score: number; // 0 to 100 percentage
  checks: ReadinessCheckItem[];
  canPublish: boolean;
  missingRequirements: string[];
}

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
  spaceNumber?: string;
  bayNumber?: string;
  floorLevel: string;    // e.g. 'Ground', 'B1'
  vehicleCategory: VehicleType;
  hasEvCharger: boolean;
  evChargerPowerKw?: number;
  isDisabledAccessible: boolean;
  hourlyRateInr: number;
  isActive: boolean;
  classification?: BayClassification;
  stallPosition?: StallPosition;
  maneuverabilityAngle?: ManeuverabilityAngle;
  surfaceFlooring?: SurfaceFlooringCondition;
  sensorId?: string;
  maxLengthMeters?: number;
  maxWidthMeters?: number;
  maxHeightMeters?: number;
  maxWeightTonnes?: number;
  allowedVehicleCategories?: VehicleType[];
  fuelCompatibility?: FuelCompatibility[];
  evPlugType?: string;
  accessMethod?: AccessArrangementType;
  amenities?: string[];
  photos?: FacilityPhoto[];
  status?: SpaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OperatingSchedule {
  id?: string;
  facilityId: string;
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)
  openTime: string;  // '08:00'
  closeTime: string; // '22:00'
  isClosed: boolean;
  isOvernight?: boolean;
  tenantId?: string;
}

export interface FacilityClosure {
  id: string;
  facilityId: string;
  tenantId?: string;
  spaceId?: string;
  title: string;
  reason?: string;
  startsAt: string;
  endsAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface FacilityMaintenance {
  id: string;
  facilityId: string;
  tenantId?: string;
  spaceId?: string;
  title: string;
  description?: string;
  status: MaintenanceStatus;
  startsAt: string;
  endsAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClosurePayload {
  facilityId?: string;
  spaceId?: string;
  title: string;
  reason?: string;
  startsAt: string;
  endsAt: string;
}

export interface UpdateClosurePayload {
  title?: string;
  reason?: string;
  startsAt?: string;
  endsAt?: string;
  spaceId?: string;
}

export interface CreateMaintenancePayload {
  facilityId?: string;
  spaceId?: string;
  title: string;
  description?: string;
  status?: MaintenanceStatus;
  startsAt: string;
  endsAt: string;
}

export interface UpdateMaintenancePayload {
  title?: string;
  description?: string;
  status?: MaintenanceStatus;
  startsAt?: string;
  endsAt?: string;
  spaceId?: string;
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
  timezone?: string;
  entranceInstructions?: string;
  gatePinCode?: string;
  isCovered: boolean;
  is24x7: boolean;
  status: FacilityStatus;
  totalSpaces: number;
  activeSpaces: number;
  amenities: string[];
  operatingModel?: FacilityOperatingModel;
  propertyOwner?: string;
  landmark?: string;
  ingressType?: IngressCorridorType;
  maxHeightClearanceMeters?: number;
  accessHotline?: string;
  turnByTurnDirections?: string;
  pedestrianAccessInstructions?: string;
  photos?: FacilityPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFacilityPayload {
  name: string;
  facilityCode?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  operatingModel?: FacilityOperatingModel;
  propertyOwner?: string;
  landmark?: string;
  entranceInstructions?: string;
  gatePinCode?: string;
  ingressType?: IngressCorridorType;
  maxHeightClearanceMeters?: number;
  accessHotline?: string;
  turnByTurnDirections?: string;
  pedestrianAccessInstructions?: string;
  isCovered?: boolean;
  is24x7?: boolean;
  amenities?: string[];
  photos?: FacilityPhoto[];
}

export interface UpdateFacilityPayload extends Partial<CreateFacilityPayload> {
  status?: FacilityStatus;
}

export interface CreateSpacePayload {
  bayIdentifier: string;
  floorLevel?: string;
  vehicleCategory?: VehicleType;
  hasEvCharger?: boolean;
  evChargerPowerKw?: number;
  isDisabledAccessible?: boolean;
  hourlyRateInr: number;
  classification?: BayClassification;
  stallPosition?: StallPosition;
  maneuverabilityAngle?: ManeuverabilityAngle;
  surfaceFlooring?: SurfaceFlooringCondition;
  sensorId?: string;
  maxLengthMeters?: number;
  maxWidthMeters?: number;
  maxHeightMeters?: number;
  maxWeightTonnes?: number;
  allowedVehicleCategories?: VehicleType[];
  fuelCompatibility?: FuelCompatibility[];
  evPlugType?: string;
  accessMethod?: AccessArrangementType;
  amenities?: string[];
  photos?: FacilityPhoto[];
}

export interface BulkCreateSpacesPayload {
  prefix: string;
  startNumber: number;
  endNumber: number;
  floorLevel: string;
  vehicleCategory: VehicleType;
  hourlyRateInr: number;
  classification?: BayClassification;
  hasEvCharger?: boolean;
  isDisabledAccessible?: boolean;
}

export interface UpdateSpacePayload extends Partial<CreateSpacePayload> {
  isActive?: boolean;
  status?: SpaceStatus;
}

export interface PublicListingSummary {
  id: string;
  facilityCode: string;
  name: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isCovered: boolean;
  is24x7: boolean;
  totalSpaces: number;
  activeSpaces: number;
  minHourlyRateInr: number;
  supportedVehicles: VehicleType[];
  amenities: string[];
  coverPhotoUrl?: string;
  operatingModel?: FacilityOperatingModel;
  maxHeightClearanceMeters?: number;
}
