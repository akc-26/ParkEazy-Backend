/**
 * @fileoverview Pure utility validators and sanitizers for untrusted inputs.
 * Browser-safe and server-safe with zero native dependencies.
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidIndianMobile(phone: string): boolean {
  // Common format: +91 followed by 10 digits or simply 10 digits
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+91)?[6-9]\d{9}$/.test(cleaned);
}

export function isValidVehiclePlate(plate: string): boolean {
  // Indian vehicle registration standard format (e.g., TN01AB1234 or TN-01-AB-1234)
  const cleaned = plate.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/.test(cleaned);
}

export function isValidUuid(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function isValidTenantId(tenantId: unknown): boolean {
  if (typeof tenantId !== 'string') return false;
  return /^[a-z0-9-]{1,64}$/.test(tenantId);
}

export function isValidBookingReference(ref: unknown): boolean {
  if (typeof ref !== 'string') return false;
  return /^#?PKZ-\d{4}-\d{4,8}$/i.test(ref.trim());
}

export function isValidIsoDateTime(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string') return false;
  const timestamp = Date.parse(dateStr);
  return !Number.isNaN(timestamp) && (dateStr.includes('T') || dateStr.endsWith('Z'));
}

export function isValidTimeFormat(timeStr: unknown): boolean {
  if (typeof timeStr !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(timeStr.trim());
}

export function isValidPositiveNumber(val: unknown): boolean {
  return typeof val === 'number' && Number.isFinite(val) && val > 0;
}

export function isValidNonNegativeNumber(val: unknown): boolean {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

export function isValidGeoCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isValidPostalCode(postalCode: unknown): boolean {
  if (typeof postalCode !== 'string') return false;
  const cleaned = postalCode.trim();
  // Standard 6-digit Indian PIN code
  return /^[1-9][0-9]{5}$/.test(cleaned);
}

export function isValidEnum<T extends string>(val: unknown, allowed: readonly T[]): val is T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val);
}

export function sanitizeString(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/[<>]/g, '');
}
