import { isValidIsoDateTime, isValidGeoCoordinate, isValidPostalCode, sanitizeString } from './common-validators';
import { ValidationResult } from './tenant-validator';
export function validateTimeWindow(startsAt: string, endsAt: string): ValidationResult<{ startsAt: string; endsAt: string }> {
  if (!isValidIsoDateTime(startsAt) || !isValidIsoDateTime(endsAt) || Date.parse(endsAt) <= Date.parse(startsAt)) return { success: false, errors: ['A valid time window with end after start is required'] };
  return { success: true, data: { startsAt, endsAt }, errors: [] };
}
export function validateCreateBooking(input: unknown): ValidationResult<Record<string, unknown>> {
  if (!input || typeof input !== 'object') return { success: false, errors: ['Booking payload must be an object'] };
  const p = input as Record<string, unknown>;
  if (typeof p.spaceId !== 'string' || !p.spaceId.trim()) return { success: false, errors: ['spaceId is required'] };
  return { success: true, data: { ...p }, errors: [] };
}
export function validateCreateFacility(input: unknown): ValidationResult<Record<string, unknown>> { return validateNamedPayload(input, 'Facility'); }
export function validateCreateSpace(input: unknown): ValidationResult<Record<string, unknown>> { return validateNamedPayload(input, 'Space'); }
function validateNamedPayload(input: unknown, label: string): ValidationResult<Record<string, unknown>> {
  if (!input || typeof input !== 'object') return { success: false, errors: [`${label} payload must be an object`] };
  const p = input as Record<string, unknown>;
  if (!sanitizeString(p.name)) return { success: false, errors: [`${label} name is required`] };
  return { success: true, data: { ...p, name: sanitizeString(p.name) }, errors: [] };
}
export function validateUserRegistration(input: unknown): ValidationResult<Record<string, unknown>> { return validateNamedPayload(input, 'User'); }
export function validateSearchQuery(input: unknown): ValidationResult<{ query: string }> {
  if (!input || typeof input !== 'object') return { success: false, errors: ['Search query must be an object'] };
  const query = sanitizeString((input as Record<string, unknown>).query);
  if (!query) return { success: false, errors: ['Search query is required'] };
  return { success: true, data: { query }, errors: [] };
}
export { isValidGeoCoordinate, isValidPostalCode };
