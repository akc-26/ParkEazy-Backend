export * from '../shared-types/src/index';

export enum AccessMethod {
  APP_BLE = 'APP_BLE',
  GATE_CODE = 'GATE_CODE',
  OPEN_ACCESS = 'OPEN_ACCESS',
  SECURITY_STAFF = 'SECURITY_STAFF',
  ANPR = 'ANPR',
}

export enum BayStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  BLOCKED = 'BLOCKED',
}

export enum BayType {
  ACCESSIBLE = 'ACCESSIBLE',
  COMPACT = 'COMPACT',
  COVERED = 'COVERED',
  EV_CHARGING = 'EV_CHARGING',
  STANDARD = 'STANDARD',
  MOTORCYCLE = 'MOTORCYCLE',
  LARGE = 'LARGE',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  HELD = 'HELD',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  DISPUTED = 'DISPUTED',
}

export enum IntegrationStatus {
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  TEST_MODE = 'TEST_MODE',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum LedgerAccountType {
  CUSTOMER_PAYABLE = 'CUSTOMER_PAYABLE',
  HOST_PAYABLE = 'HOST_PAYABLE',
  PLATFORM_COMMISSION_REVENUE = 'PLATFORM_COMMISSION_REVENUE',
  SECURITY_DEPOSIT_ESCROW = 'SECURITY_DEPOSIT_ESCROW',
}

export enum LedgerEntryType {
  DEPOSIT_HELD = 'DEPOSIT_HELD',
  HOST_EARNING_ACCRUED = 'HOST_EARNING_ACCRUED',
  PARKING_FEE_COLLECTED = 'PARKING_FEE_COLLECTED',
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum LocationStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum PaymentProvider {
  INTERNAL_MOCK = 'INTERNAL_MOCK',
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
}

export enum PropertyType {
  DRIVEWAY = 'DRIVEWAY',
  GARAGE = 'GARAGE',
  UNDERGROUND = 'UNDERGROUND',
  COMMERCIAL = 'COMMERCIAL',
  STANDALONE = 'STANDALONE',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  HOST = 'HOST',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum VehicleCategory {
  COMPACT = 'COMPACT',
  MOTORCYCLE = 'MOTORCYCLE',
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  TRUCK = 'TRUCK',
  VAN = 'VAN',
}

export enum HostApplicationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum HostOnboardingStep {
  PROFILE = 'PROFILE',
  IDENTITY = 'IDENTITY',
  FACILITY = 'FACILITY',
  PRICING = 'PRICING',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
}

export const BOOKING_CONSTRAINTS = {
  HOLD_DURATION_SECONDS: 600,
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 72,
  INCREMENT_MINUTES: 30,
  MIN_LEAD_TIME_MINUTES: 15,
  MAX_BOOKING_HORIZON_DAYS: 30,
  TRANSITION_BUFFER_MINUTES: 15,
  PLATFORM_FEE_RATE: 0.15,
  TAX_RATE: 0.18,
  HOST_REVENUE_SHARE_RATE: 0.85,
};

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole | string;
  fullName?: string;
  name?: string;
  tenantId?: string;
  phone?: string;
}

export interface ParkingLocation {
  id: string;
  hostId: string;
  tenantId: string;
  name: string;
  addressLine1: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  propertyType: PropertyType;
  accessMethod: AccessMethod;
  status: LocationStatus;
  hourlyRateCents: number;
  dailyRateCents?: number;
  securityDepositCents?: number;
  accessInstructions?: string;
  amenities?: string[];
  photos?: any[];
  publishedAtUtc?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingBay {
  id: string;
  locationId: string;
  bayNumber: string;
  type: BayType;
  status: BayStatus;
  hourlyRateCents: number;
  dailyRateCents?: number;
  securityDepositCents?: number;
  floorLevel?: string;
  vehicleCategories?: VehicleCategory[];
  isAvailable?: boolean;
}

export interface CreateFacilityRequest {
  name: string;
  addressLine1: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  propertyType?: PropertyType;
  accessMethod?: AccessMethod;
  hourlyRateCents?: number;
  dailyRateCents?: number;
  securityDepositCents?: number;
  totalSpaces?: number;
  amenities?: string[];
}

export interface UpdateFacilityRequest extends Partial<CreateFacilityRequest> {
  status?: LocationStatus;
}

export interface CreateBayRequest {
  bayNumber: string;
  type: BayType;
  hourlyRateCents: number;
  dailyRateCents?: number;
  securityDepositCents?: number;
  floorLevel?: string;
}

export interface UpdateBayRequest extends Partial<CreateBayRequest> {
  status?: BayStatus;
}

export interface PublicationCheckItem {
  id: string;
  title: string;
  passed: boolean;
  message?: string;
}

export interface FacilityPublicationValidation {
  isReady: boolean;
  score: number;
  checks: PublicationCheckItem[];
}

export interface PublishFacilityResponse {
  success: boolean;
  facility: any;
  validation: FacilityPublicationValidation;
}

export interface RatePlan {
  id: string;
  facilityId: string;
  name: string;
  hourlyRateCents: number;
  dailyRateCents?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isDefault?: boolean;
  bayId?: string;
  isActive?: boolean;
  updatedAtUtc?: string;
  hostId?: string;
}

export interface CreateRatePlanRequest {
  name: string;
  hourlyRateCents: number;
  dailyRateCents?: number;
}

export interface UpdateRatePlanRequest extends Partial<CreateRatePlanRequest> {}

export interface FacilityOperatingDay {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface UpdateOperatingHoursRequest {
  days: FacilityOperatingDay[];
}

export interface PricingPolicy {
  id: string;
  facilityId: string;
  minDurationMinutes: number;
  maxDurationHours: number;
  maxDurationMinutes?: number;
  gracePeriodMinutes: number;
  weekendMultiplier?: number;
  securityDepositCents?: number;
  cancellationPolicyTier?: string;
}

export interface UpdatePricingPolicyRequest extends Partial<PricingPolicy> {}

export interface FacilityClosure {
  id: string;
  facilityId: string;
  startDate: string;
  endDate: string;
  reason: string;
  bayId?: string;
  title?: string;
  hostId?: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
}

export interface CreateFacilityClosureRequest {
  startDate: string;
  endDate: string;
  reason: string;
  facilityId?: string;
  bayId?: string;
}

export interface PriceEstimateRequest {
  facilityId: string;
  startTime: string;
  endTime: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
  bayId?: string;
}

export interface PriceEstimateResponse {
  baseAmountCents: number;
  platformFeeCents: number;
  taxesCents: number;
  securityDepositCents: number;
  totalAmountCents: number;
  durationMinutes: number;
  currency: string;
  quoteId?: string;
  breakdown?: any;
}

export interface BulkPriceUpdateRequest {
  facilityIds?: string[];
  percentageChange?: number;
  fixedRateCents?: number;
  effectiveFromUtc?: string;
  targetType?: string;
  rateAdjustment?: any;
}

export interface BulkPriceUpdateTargetPreview {
  facilityId: string;
  facilityName: string;
  currentRateCents: number;
  newRateCents: number;
  hasConflict?: boolean;
  conflictReason?: string;
  proposedHourlyRateCents?: number;
  proposedDailyRateCents?: number;
  currentHourlyRateCents?: number;
  currentDailyRateCents?: number;
}

export interface BulkPriceUpdatePreviewResponse {
  targets: BulkPriceUpdateTargetPreview[];
  totalAffected: number;
  totalTargetsCount?: number;
  conflictingTargetsCount?: number;
  eligibleTargetsCount?: number;
}

export interface PricingConflict {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'CRITICAL' | string;
  facilityId?: string;
  facilityName?: string;
}

export interface PricingAuditRecord {
  id: string;
  timestamp: string;
  action: string;
  changedBy: string;
  details: Record<string, unknown>;
  hostId?: string;
}

export interface BookingHold {
  id: string;
  holdToken: string;
  bayId: string;
  facilityId: string;
  userId: string;
  startTime: string;
  endTime: string;
  expiresAtUtc: string;
  quoteSnapshot: BookingQuoteSnapshot;
}

export interface BookingQuoteSnapshot {
  baseAmountCents: number;
  platformFeeCents: number;
  taxesCents: number;
  securityDepositCents: number;
  totalAmountCents: number;
}

export interface BookingSummary {
  id: string;
  bookingReference: string;
  facilityId: string;
  facilityName: string;
  bayId: string;
  bayNumber: string;
  startTime: string;
  endTime: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
  status: BookingStatus;
  totalAmountCents: number;
  vehiclePlate?: string;
  licensePlate?: string;
  hostId?: string;
  locationId?: string;
}

export interface CustomerVehicle {
  id: string;
  userId: string;
  plateNumber?: string;
  licensePlate?: string;
  make?: string;
  model?: string;
  color?: string;
  category?: VehicleCategory;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVehicleRequest {
  plateNumber?: string;
  licensePlate?: string;
  make?: string;
  model?: string;
  color?: string;
  category?: VehicleCategory;
  isDefault?: boolean;
}

export interface UpdateVehicleRequest extends Partial<CreateVehicleRequest> {
  isDefault?: boolean;
  licensePlate?: string;
}

export interface RecurringAvailabilitySchedule {
  id: string;
  facilityId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

export interface AvailabilityOverride {
  id: string;
  facilityId: string;
  date: string;
  isClosed: boolean;
  customHours?: { startTime: string; endTime: string };
}

export interface MaintenanceBlock {
  id: string;
  bayId: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface CreateMaintenanceBlockRequest {
  bayId: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'booking' | 'hold' | 'maintenance' | 'closure';
}

export interface AvailabilityInterval {
  start: string;
  end: string;
  isAvailable: boolean;
}

export interface SpaceAvailabilitySummary {
  bayId: string;
  isCurrentlyOccupied: boolean;
  nextAvailableAt?: string;
}

export interface ValidateAvailabilityChangeRequest {
  facilityId: string;
  changes: any;
}

export interface ValidateAvailabilityChangeResponse {
  isValid: boolean;
  conflicts: PricingConflict[];
}

export interface LoginResponse {
  token: string;
  user: SessionUser;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  bookingAlerts: boolean;
  promotions: boolean;
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword?: string;
}

export interface HostRegisterRequest {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  companyName?: string;
  propertyType?: PropertyType;
}

export interface HostRegisterResponse {
  success: boolean;
  user: SessionUser;
  token?: string;
}

export interface VerificationStatusResponse {
  verified: boolean;
  step: HostOnboardingStep;
  details?: Record<string, unknown>;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword?: string;
}

export interface HostOnboardingProfile {
  id: string;
  userId: string;
  step: HostOnboardingStep;
  status: HostApplicationStatus;
  companyName?: string;
  bankAccountVerified?: boolean;
}

export interface UpdateHostOnboardingRequest {
  step?: HostOnboardingStep;
  companyName?: string;
  data?: Record<string, unknown>;
}

export interface ResendCodeResponse {
  success: boolean;
  cooldownSeconds: number;
}

export interface IntegrationConfig {
  id: string;
  provider: string;
  category: 'payment' | 'notification' | 'hardware' | 'maps';
  status: IntegrationStatus;
  configuredAt?: string;
  lastTestedAt?: string;
}

export interface UpdateIntegrationDto {
  credentials: Record<string, string>;
  enabled?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  latencyMs: number;
  message?: string;
}

export interface ActivePaymentGatewayConfig {
  provider: PaymentProvider;
  isLive: boolean;
  publicKey?: string;
}

export interface ProviderFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'boolean';
  required: boolean;
  defaultValue?: string;
}

export interface ConfigCompleteness {
  isComplete: boolean;
  missingFields: string[];
}

export interface IntegrationAuditRecord {
  id: string;
  timestamp: string;
  provider: string;
  action: string;
  operatorId: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}
