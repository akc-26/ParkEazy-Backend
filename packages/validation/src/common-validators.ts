const TENANT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/;
export function isValidEmail(value: string): boolean {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
export function isValidTenantId(value: string): boolean { return typeof value === 'string' && TENANT_ID.test(value); }
export function sanitizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 500) : '';
}
export function isValidUuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export function isValidBookingReference(value: string): boolean { return /^[A-Z0-9-]{5,40}$/.test(value); }
export function isValidIsoDateTime(value: string): boolean { return !Number.isNaN(Date.parse(value)) && /^\d{4}-\d\d-\d\dT/.test(value); }
export function isValidTimeFormat(value: string): boolean { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function isValidGeoCoordinate(lat: number, lon: number): boolean { return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180; }
export function isValidPostalCode(value: string): boolean { return /^[1-9][0-9]{5}$/.test(value); }
export function isValidEnum<T extends string>(value: unknown, allowed: readonly T[]): value is T { return typeof value === 'string' && allowed.includes(value as T); }
