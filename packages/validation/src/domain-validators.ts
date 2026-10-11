import {
  CreateBookingRequest,
  VEHICLE_TYPES,
  VehicleType,
  USER_ROLES,
  UserRole,
} from '@parkeazy/shared-types';
import { ValidationResult } from './tenant-validator';
import {
  isValidEmail,
  isValidIndianMobile,
  isValidVehiclePlate,
  isValidUuid,
  isValidTenantId,
  isValidIsoDateTime,
  isValidGeoCoordinate,
  isValidPostalCode,
  isValidNonNegativeNumber,
  isValidPositiveNumber,
  isValidEnum,
  sanitizeString,
} from './common-validators';

export interface ValidatedTimeWindow {
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
}

export function validateTimeWindow(
  startsAt: unknown,
  endsAt: unknown,
  options: { minDurationMinutes?: number; maxDurationDays?: number } = {}
): ValidationResult<ValidatedTimeWindow> {
  const errors: string[] = [];
  const minDurationMinutes = options.minDurationMinutes ?? 15;
  const maxDurationDays = options.maxDurationDays ?? 30;

  if (!isValidIsoDateTime(startsAt)) {
    errors.push('startsAt must be a valid ISO-8601 date-time string');
  }

  if (!isValidIsoDateTime(endsAt)) {
    errors.push('endsAt must be a valid ISO-8601 date-time string');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const startMs = Date.parse(startsAt as string);
  const endMs = Date.parse(endsAt as string);

  if (endMs <= startMs) {
    errors.push('endsAt must be chronologically after startsAt');
    return { success: false, errors };
  }

  const durationMinutes = Math.round((endMs - startMs) / (1000 * 60));
  if (durationMinutes < minDurationMinutes) {
    errors.push(`Booking duration must be at least ${minDurationMinutes} minutes`);
  }

  const maxMinutes = maxDurationDays * 24 * 60;
  if (durationMinutes > maxMinutes) {
    errors.push(`Booking duration cannot exceed ${maxDurationDays} days`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      startsAt: new Date(startMs).toISOString(),
      endsAt: new Date(endMs).toISOString(),
      durationMinutes,
    },
    errors: [],
  };
}

export interface ValidatedCreateBooking {
  tenantId: string;
  spaceId: string;
  facilityId: string;
  vehiclePlate: string;
  vehicleCategory: VehicleType;
  startsAt: string;
  endsAt: string;
}

export function validateCreateBooking(input: unknown): ValidationResult<ValidatedCreateBooking> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Request body must be a non-null object'] };
  }

  const b = input as Record<string, any>;

  const tenantId = b.tenantId ? String(b.tenantId).trim() : 'default';
  if (!isValidTenantId(tenantId)) {
    errors.push('tenantId must be a valid alphanumeric slug with hyphens');
  }

  if (!isValidUuid(b.spaceId)) {
    errors.push('spaceId must be a valid UUID');
  }

  if (!isValidUuid(b.facilityId)) {
    errors.push('facilityId must be a valid UUID');
  }

  if (typeof b.vehiclePlate !== 'string' || !isValidVehiclePlate(b.vehiclePlate)) {
    errors.push('vehiclePlate must be a valid Indian registration plate (e.g. TN01AB1234)');
  }

  if (!isValidEnum(b.vehicleCategory, VEHICLE_TYPES)) {
    errors.push(`vehicleCategory must be one of: ${VEHICLE_TYPES.join(', ')}`);
  }

  const timeWindowResult = validateTimeWindow(b.startsAt, b.endsAt);
  if (!timeWindowResult.success) {
    errors.push(...timeWindowResult.errors);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      tenantId,
      spaceId: b.spaceId,
      facilityId: b.facilityId,
      vehiclePlate: sanitizeString(b.vehiclePlate).toUpperCase().replace(/[\s-]/g, ''),
      vehicleCategory: b.vehicleCategory,
      startsAt: timeWindowResult.data!.startsAt,
      endsAt: timeWindowResult.data!.endsAt,
    },
    errors: [],
  };
}

export interface ValidatedCreateFacility {
  tenantId: string;
  hostId: string;
  facilityCode: string;
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
  amenities: string[];
}

export function validateCreateFacility(input: unknown): ValidationResult<ValidatedCreateFacility> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Request body must be a non-null object'] };
  }

  const f = input as Record<string, any>;
  const tenantId = f.tenantId ? String(f.tenantId).trim() : 'default';
  if (!isValidTenantId(tenantId)) {
    errors.push('tenantId must be a valid alphanumeric identifier');
  }

  if (!isValidUuid(f.hostId)) {
    errors.push('hostId must be a valid UUID');
  }

  if (typeof f.facilityCode !== 'string' || f.facilityCode.trim().length === 0) {
    errors.push('facilityCode is required (e.g. #FAC-0104)');
  }

  if (typeof f.name !== 'string' || f.name.trim().length < 3) {
    errors.push('name must be at least 3 characters long');
  }

  if (typeof f.addressLine1 !== 'string' || f.addressLine1.trim().length < 5) {
    errors.push('addressLine1 must be at least 5 characters long');
  }

  if (typeof f.city !== 'string' || f.city.trim().length === 0) {
    errors.push('city is required');
  }

  if (!isValidPostalCode(f.postalCode)) {
    errors.push('postalCode must be a valid 6-digit Indian PIN code');
  }

  const lat = Number(f.latitude);
  const lng = Number(f.longitude);
  if (!isValidGeoCoordinate(lat, lng)) {
    errors.push('latitude and longitude must be valid geographic coordinates');
  }

  if (f.gatePinCode && (typeof f.gatePinCode !== 'string' || !/^\d{4,8}$/.test(f.gatePinCode.trim()))) {
    errors.push('gatePinCode must be 4 to 8 digits if provided');
  }

  const amenities = Array.isArray(f.amenities)
    ? f.amenities.map((a: unknown) => sanitizeString(a)).filter((a: string) => a.length > 0)
    : [];

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      tenantId,
      hostId: f.hostId,
      facilityCode: sanitizeString(f.facilityCode),
      name: sanitizeString(f.name),
      addressLine1: sanitizeString(f.addressLine1),
      addressLine2: f.addressLine2 ? sanitizeString(f.addressLine2) : undefined,
      city: sanitizeString(f.city),
      postalCode: sanitizeString(f.postalCode),
      latitude: lat,
      longitude: lng,
      entranceInstructions: f.entranceInstructions ? sanitizeString(f.entranceInstructions) : undefined,
      gatePinCode: f.gatePinCode ? sanitizeString(f.gatePinCode) : undefined,
      isCovered: Boolean(f.isCovered),
      is24x7: Boolean(f.is24x7),
      amenities,
    },
    errors: [],
  };
}

export interface ValidatedCreateSpace {
  facilityId: string;
  tenantId: string;
  bayIdentifier: string;
  floorLevel: string;
  vehicleCategory: VehicleType;
  hasEvCharger: boolean;
  evChargerPowerKw?: number;
  isDisabledAccessible: boolean;
  hourlyRateInr: number;
}

export function validateCreateSpace(input: unknown): ValidationResult<ValidatedCreateSpace> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Request body must be a non-null object'] };
  }

  const s = input as Record<string, any>;
  const tenantId = s.tenantId ? String(s.tenantId).trim() : 'default';

  if (!isValidUuid(s.facilityId)) {
    errors.push('facilityId must be a valid UUID');
  }

  if (typeof s.bayIdentifier !== 'string' || s.bayIdentifier.trim().length === 0) {
    errors.push('bayIdentifier is required (e.g. A-01)');
  }

  if (!isValidEnum(s.vehicleCategory, VEHICLE_TYPES)) {
    errors.push(`vehicleCategory must be one of: ${VEHICLE_TYPES.join(', ')}`);
  }

  const hourlyRate = Number(s.hourlyRateInr);
  if (!isValidPositiveNumber(hourlyRate)) {
    errors.push('hourlyRateInr must be a positive number');
  }

  let evChargerPowerKw: number | undefined = undefined;
  if (s.hasEvCharger) {
    if (s.evChargerPowerKw !== undefined && s.evChargerPowerKw !== null) {
      const kw = Number(s.evChargerPowerKw);
      if (!isValidPositiveNumber(kw)) {
        errors.push('evChargerPowerKw must be a positive number when EV charger is present');
      } else {
        evChargerPowerKw = kw;
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      facilityId: s.facilityId,
      tenantId,
      bayIdentifier: sanitizeString(s.bayIdentifier).toUpperCase(),
      floorLevel: s.floorLevel ? sanitizeString(s.floorLevel) : 'Ground',
      vehicleCategory: s.vehicleCategory,
      hasEvCharger: Boolean(s.hasEvCharger),
      evChargerPowerKw,
      isDisabledAccessible: Boolean(s.isDisabledAccessible),
      hourlyRateInr: hourlyRate,
    },
    errors: [],
  };
}

export interface ValidatedUserRegistration {
  tenantId: string;
  email: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  password?: string;
}

export function validateUserRegistration(input: unknown): ValidationResult<ValidatedUserRegistration> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Request body must be a non-null object'] };
  }

  const u = input as Record<string, any>;
  const tenantId = u.tenantId ? String(u.tenantId).trim() : 'default';

  if (!isValidEmail(u.email)) {
    errors.push('email must be a valid email address');
  }

  if (u.phone && !isValidIndianMobile(u.phone)) {
    errors.push('phone must be a valid Indian mobile number (e.g. +919876543210 or 9876543210)');
  }

  if (typeof u.fullName !== 'string' || u.fullName.trim().length < 2) {
    errors.push('fullName must be at least 2 characters long');
  }

  const role = u.role ? u.role : 'customer';
  if (!isValidEnum(role, USER_ROLES)) {
    errors.push(`role must be one of: ${USER_ROLES.join(', ')}`);
  }

  if (u.password && (typeof u.password !== 'string' || u.password.length < 8)) {
    errors.push('password must be at least 8 characters long if provided');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      tenantId,
      email: String(u.email).toLowerCase().trim(),
      phone: u.phone ? String(u.phone).trim() : undefined,
      fullName: sanitizeString(u.fullName),
      role,
      password: u.password,
    },
    errors: [],
  };
}

export interface ValidatedSearchQuery {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  vehicleCategory?: VehicleType;
  startsAt?: string;
  endsAt?: string;
  requiresEv?: boolean;
}

export function validateSearchQuery(input: unknown): ValidationResult<ValidatedSearchQuery> {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Search request must be a non-null object'] };
  }

  const s = input as Record<string, any>;
  const lat = Number(s.latitude);
  const lng = Number(s.longitude);

  if (!isValidGeoCoordinate(lat, lng)) {
    errors.push('latitude and longitude must be valid geographic coordinates');
  }

  const radius = s.radiusMeters ? Number(s.radiusMeters) : 5000;
  if (!isValidPositiveNumber(radius) || radius > 50000) {
    errors.push('radiusMeters must be a positive number up to 50,000 meters (50km)');
  }

  let vehicleCategory: VehicleType | undefined = undefined;
  if (s.vehicleCategory) {
    if (!isValidEnum(s.vehicleCategory, VEHICLE_TYPES)) {
      errors.push(`vehicleCategory must be one of: ${VEHICLE_TYPES.join(', ')}`);
    } else {
      vehicleCategory = s.vehicleCategory;
    }
  }

  let validatedTime: ValidatedTimeWindow | undefined = undefined;
  if (s.startsAt || s.endsAt) {
    const timeRes = validateTimeWindow(s.startsAt, s.endsAt);
    if (!timeRes.success) {
      errors.push(...timeRes.errors);
    } else {
      validatedTime = timeRes.data;
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
      vehicleCategory,
      startsAt: validatedTime?.startsAt,
      endsAt: validatedTime?.endsAt,
      requiresEv: Boolean(s.requiresEv),
    },
    errors: [],
  };
}
