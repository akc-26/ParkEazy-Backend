/**
 * @fileoverview Shared TypeScript models, contracts, and interfaces for ParkEazy.
 */

export type UserRole = 'driver' | 'host' | 'admin' | 'superadmin' | 'operator' | 'customer' | string;

export type BookingStatus =
  | 'pending'
  | 'held'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'expired'
  | string;

export type BayClassification = 'standard' | 'compact' | 'large' | 'premium' | string;
export type StallPosition = 'single_independent' | 'tandem_front' | 'tandem_rear' | string;
export type ManeuverabilityAngle = '90_perpendicular' | '60_angled' | '45_angled' | 'parallel' | string;
export type SurfaceFlooringCondition = 'epoxy_coated' | 'concrete' | 'asphalt' | 'paver_blocks' | string;
export type VehicleType = 'car' | 'bike' | 'suv' | 'ev' | 'compact' | 'sedan' | 'truck' | 'van' | string;
export type SpaceStatus = 'available' | 'reserved' | 'occupied' | 'blocked' | 'maintenance' | string;

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  tenantId?: string;
  status?: string;
  verified?: boolean;
  avatarUrl?: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface FacilityPhoto {
  id: string;
  url: string;
  caption?: string;
  isPrimary?: boolean;
  isCover?: boolean;
  category?: string;
  createdAt?: string;
}

export type FacilityOperatingModel =
  | 'self_park'
  | 'valet'
  | 'automated'
  | 'attended'
  | 'commercial_garage'
  | 'residential_driveway'
  | 'open_ground'
  | string;

export interface ParkingFacility {
  id: string;
  tenantId: string;
  hostId: string;
  facilityCode: string;
  name: string;
  address?: string;
  addressLine1?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  totalSpaces: number;
  availableSpaces: number;
  status: 'active' | 'maintenance' | 'draft' | 'suspended';
  operatingModel?: FacilityOperatingModel;
  photos?: FacilityPhoto[];
  hourlyRateInr?: number;
  dailyRateInr?: number;
  securityDepositInr?: number;
  amenities?: string[];
  rules?: string[];
  isCovered?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParkingSpace {
  id: string;
  facilityId: string;
  spaceNumber: string;
  bayNumber?: string;
  bayIdentifier?: string;
  floorLevel?: string;
  type: 'standard' | 'compact' | 'ev' | 'accessible' | 'covered' | 'motorcycle' | string;
  status: SpaceStatus;
  hourlyRateInr: number;
  dailyRateInr?: number;
  securityDepositInr?: number;
  features?: string[];
  isAvailable?: boolean;
  vehicleCategory?: VehicleType;
  classification?: BayClassification;
  stallPosition?: StallPosition;
  maneuverabilityAngle?: ManeuverabilityAngle;
  surfaceFlooring?: SurfaceFlooringCondition;
  sensorId?: string;
  hasEvCharger?: boolean;
  evChargerPowerKw?: number | string;
  evPlugType?: string;
  isDisabledAccessible?: boolean;
}

export interface HostProfile {
  id: string;
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  status: 'pending' | 'verified' | 'rejected' | 'suspended';
  kycStatus?: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  totalEarningsInr?: number;
  payoutSchedule?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  createdAt?: string;
}

export interface BookingDetailsResponse {
  id: string;
  bookingReference: string;
  userId?: string;
  tenantId?: string;
  facilityId: string;
  facilityName?: string;
  spaceId: string;
  spaceNumber?: string;
  bayIdentifier?: string;
  startTime?: string;
  endTime?: string;
  startsAt?: string;
  endsAt?: string;
  status: BookingStatus;
  vehiclePlate?: string;
  vehicleCategory?: string;
  customerName?: string;
  customerPhone?: string;
  gatePinCode?: string;
  totalAmountInr?: number;
  platformFeeInr?: number;
  hostEarningsInr?: number;
  securityDepositInr?: number;
  paymentStatus?: 'pending' | 'paid' | 'refunded' | 'failed';
  checkInTime?: string;
  checkOutTime?: string;
  customerId?: string;
  qrAccessToken?: string;
  updatedAt?: string;
  pricing?: {
    baseAmountInr?: number;
    platformFeeInr?: number;
    taxesInr?: number;
    taxInr?: number;
    totalAmountInr?: number;
    securityDepositInr?: number;
  };
  createdAt: string;
}

export interface AdminPlatformOverview {
  totalUsers: number;
  totalFacilities: number;
  totalSpaces: number;
  totalBookings: number;
  activeHolds: number;
  totalRevenueCents: number;
  platformCommissionCents: number;
  escrowBalanceCents: number;
  systemHealth: string;
  activeAnomalies: number;
}

export interface HostEarningsSummary {
  totalEarningsInr: number;
  pendingPayoutInr: number;
  pendingBalanceInr?: number;
  grossEarningsInr?: number;
  platformCommissionInr?: number;
  netPayoutInr?: number;
  completedPayoutInr: number;
  currentMonthEarningsInr: number;
  currency: string;
}

export interface HostSettlement {
  id: string;
  settlementDate: string;
  settlementReference?: string;
  utrNumber?: string;
  amountInr: number;
  netPayoutInr?: number;
  status: 'pending' | 'processed' | 'failed';
  referenceNumber: string;
  disbursedAt?: string;
  createdAt?: string;
}

export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'critical';
  version: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
  activeModules: string[];
}

export interface SystemReadinessResponse {
  ready: boolean;
  services: Record<string, { ready: boolean; latencyMs?: number; message?: string }>;
  timestamp: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountType: 'escrow' | 'platform_commission' | 'host_payable' | 'driver_receivable' | string;
  entryType: 'debit' | 'credit' | string;
  amountInr: number;
  currency: string;
  correlationId: string;
  bookingReference?: string;
  description: string;
  timestamp: string;
}

export interface ReadinessDependencyStatus {
  status: 'connected' | 'unreachable' | 'degraded' | 'disabled';
  latencyMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  correlationId?: string;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  correlationId?: string;
  timestamp?: string;
}

export interface CreateFacilityPayload {
  name: string;
  addressLine1: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  operatingModel?: string;
  totalSpaces?: number;
  hourlyRateInr?: number;
  dailyRateInr?: number;
  securityDepositInr?: number;
}
