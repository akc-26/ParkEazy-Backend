export type UserRole = 'host' | 'customer' | 'admin';
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'closed';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  avatarUrl?: string;
  isEmailVerified: boolean;
  businessDetails?: {
    businessName: string;
    registrationNumber: string;
    taxId: string;
    payoutBankName: string;
    payoutAccountNumber: string;
    payoutRoutingNumber: string;
    stripeConnectAccountId?: string;
    isVerified: boolean;
  };
}

export type VehicleCompatibility = 'compact' | 'sedan' | 'suv' | 'ev' | 'motorcycle' | 'van_truck' | 'oversized';
export type FacilityStatus = 'draft' | 'under_review' | 'approved' | 'rejected' | 'active' | 'suspended';

export interface OperatingHours {
  is24x7: boolean;
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

export interface Facility {
  id: string;
  hostId: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  accessInstructions: string;
  gateType: 'automated_barrier' | 'pin_code' | 'license_plate_recognition' | 'manual_attendant' | 'qr_scanner';
  defaultGateCode?: string;
  clearanceHeightMeters: number;
  operatingHours: OperatingHours;
  amenities: {
    covered: boolean;
    cctv: boolean;
    securityGuard: boolean;
    evCharging: boolean;
    lighting: boolean;
    wheelchairAccessible: boolean;
    valetAssist: boolean;
    automatedBarrier: boolean;
  };
  photos: string[];
  status: FacilityStatus;
  moderationNotes?: string;
  totalBays: number;
  activeBays: number;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
  bays?: ParkingBay[];
  pricingRules?: PricingRule[];
  reviews?: Review[];
}

export interface FacilityClosure {
  id: string;
  facilityId: string;
  tenantId?: string;
  title?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
  startsAt?: string;
  endsAt?: string;
  bayId?: string;
  spaceId?: string;
  affectedBayIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface FacilityMaintenance {
  id: string;
  facilityId: string;
  tenantId?: string;
  bayId?: string | null;
  spaceId?: string | null;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  startsAt?: string;
  endsAt?: string;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
}

export type BayStatus = 'available' | 'held' | 'occupied' | 'maintenance' | 'reserved' | 'retired';

export interface ParkingBay {
  id: string;
  facilityId: string;
  identifier: string;
  zone: string;
  vehicleCompatibility: VehicleCompatibility[];
  dimensions: {
    lengthMeters: number;
    widthMeters: number;
    heightMeters: number;
  };
  isAccessibleADA: boolean;
  hasEvCharger: boolean;
  evChargerDetails?: {
    powerKw: number;
    plugType: 'Type2' | 'CCS' | 'Tesla' | 'CHAdeMO';
  };
  amenities: string[];
  status: BayStatus;
  statusReason?: string;
  hourlyRateMultiplier: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRule {
  id: string;
  facilityId: string;
  name: string;
  baseHourlyRate: number;
  dailyMaxRate: number;
  overnightFlatRate: number;
  surgeMultiplier: number;
  peakHours: {
    start: string;
    end: string;
    daysOfWeek: number[];
  }[];
  weekendHourlyRate?: number;
  specialEvents: {
    eventName: string;
    startDate: string;
    endDate: string;
    flatRateSurcharge: number;
  }[];
  discounts: {
    minHours: number;
    discountPercent: number;
  }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityHold {
  id: string;
  bayId: string;
  facilityId: string;
  userId: string;
  startTime: string;
  endTime: string;
  heldAt: string;
  expiresAt: string;
}

export type BookingStatus = 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'refunded';

export interface Booking {
  id: string;
  bookingReference: string;
  facilityId: string;
  bayId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  licensePlate: string;
  vehicleMakeModel: string;
  startTime: string;
  endTime: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  grossAmount: number;
  platformFee: number;
  hostNetEarnings: number;
  taxAmount: number;
  refundAmount?: number;
  status: BookingStatus;
  qrCodeToken: string;
  gateAccessCode: string;
  idempotencyKey?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  facility?: Facility;
  bay?: ParkingBay;
}

export interface LedgerEntry {
  id: string;
  idempotencyKey: string;
  hostId: string;
  facilityId?: string;
  bookingId?: string;
  type: 'booking_income' | 'platform_commission' | 'host_payout' | 'booking_refund';
  amount: number;
  balanceAfter: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  hostId: string;
  amount: number;
  method: 'stripe_instant' | 'ach_bank_transfer';
  destinationAccount: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  referenceNumber: string;
  providerTransferId?: string;
  idempotencyKey?: string;
  requestedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface Review {
  id: string;
  facilityId: string;
  customerId: string;
  customerName: string;
  bookingId: string;
  rating: number;
  comment: string;
  createdAt: string;
  hostResponse?: {
    text: string;
    respondedAt: string;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'hold' | 'payout' | 'moderation' | 'alert' | 'dispute';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface DisputeTicket {
  id: string;
  ticketNumber: string;
  bookingId: string;
  facilityId: string;
  customerId: string;
  hostId: string;
  reason: 'bay_occupied_on_arrival' | 'overcharge' | 'gate_barrier_malfunction' | 'damage_safety_issue' | 'other';
  status: 'open' | 'under_review' | 'resolved_refunded' | 'resolved_dismissed';
  customerStatement: string;
  hostStatement?: string;
  resolutionNotes?: string;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ThirdPartyProviderConfig {
  id: string;
  category: 'access_control' | 'payment_gateway' | 'payout_service' | 'mapping' | 'communications' | 'cloud_storage';
  name: string;
  provider: string;
  isEnabled: boolean;
  settings: Record<string, string>;
  lastTestedAt?: string;
  testStatus?: 'healthy' | 'degraded' | 'error';
  testMessage?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'facility' | 'bay' | 'pricing' | 'booking' | 'payout' | 'user' | 'provider' | 'dispute';
  entityId: string;
  details: string;
}
