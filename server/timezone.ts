/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ParkEazy Facility Timezone Standardizer
 * Canonical documented default timezone across ParkEazy backend: 'Asia/Kolkata'.
 *
 * RATIONALE & CONTEXT:
 * 1. Reconciles the previous discrepancy where server/db.ts defaulted to 'UTC'
 *    while PostgreSQL database migrations (010, 011, 012) and NestJS services
 *    standardized on 'Asia/Kolkata'.
 * 2. Operating hours, date-specific closures, maintenance blocks, and availability
 *    calculations must be evaluated consistently in the facility's explicit or default timezone.
 * 3. Never relies on server machine local timezone (process.env.TZ).
 * 4. Preserves explicitly configured valid IANA timezones (e.g., America/New_York, UTC).
 */

export const DEFAULT_FACILITY_TIMEZONE = 'Asia/Kolkata';

/**
 * Validates whether an input string is a valid IANA timezone identifier.
 */
export function isValidTimezone(tz?: string | null): boolean {
  if (!tz || typeof tz !== 'string' || tz.trim() === '') return false;
  const clean = tz.trim();
  try {
    Intl.DateTimeFormat(undefined, { timeZone: clean });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a facility's timezone:
 * - Prefers explicit valid timezone if provided.
 * - Preserves existing valid timezone.
 * - Defaults to 'Asia/Kolkata' if missing or invalid.
 */
export function resolveFacilityTimezone(tz?: string | null): string {
  if (tz && isValidTimezone(tz)) {
    return tz.trim();
  }
  return DEFAULT_FACILITY_TIMEZONE;
}

export interface FacilityLocalDateTime {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  year: number;
  month: number;
  day: number;
  dateString: string; // 'YYYY-MM-DD'
  timeString: string; // 'HH:mm'
  hours: number;
  minutes: number;
  seconds: number;
  hour: number;
  minute: number;
  second: number;
  timezone: string;
}

const DAY_NAMES: FacilityLocalDateTime['dayName'][] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Extracts date and time components in the facility's timezone.
 * Uses Intl.DateTimeFormat to avoid any server-local timezone dependency.
 */
export function getFacilityLocalDateTime(
  dateInput: Date | string | number,
  timezoneInput?: string | null
): FacilityLocalDateTime {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date provided: ${dateInput}`);
  }

  const timezone = resolveFacilityTimezone(timezoneInput);

  // Format parts in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  // Handle midnight 24:00 edge case from Intl
  let hours = parseInt(partMap.hour, 10);
  if (hours === 24) hours = 0;
  const minutes = parseInt(partMap.minute, 10);
  const seconds = parseInt(partMap.second, 10);

  const yearNum = parseInt(partMap.year, 10);
  const monthNum = parseInt(partMap.month, 10);
  const dayNum = parseInt(partMap.day, 10);

  const dateString = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const weekdayStr = partMap.weekday;
  const dayOfWeekIndex = DAY_NAMES.indexOf(weekdayStr as any);
  const dayOfWeek = dayOfWeekIndex >= 0 ? dayOfWeekIndex : date.getUTCDay();
  const dayName = DAY_NAMES[dayOfWeek];

  return {
    dayOfWeek,
    dayName,
    year: yearNum,
    month: monthNum,
    day: dayNum,
    dateString,
    timeString,
    hours,
    minutes,
    seconds,
    hour: hours,
    minute: minutes,
    second: seconds,
    timezone,
  };
}

/**
 * Converts a zoned local date ("YYYY-MM-DD") and time ("HH:mm") in a given timezone to a UTC ISO string.
 * Server-independent; does not rely on process.env.TZ.
 */
export function convertZonedTimeToUtc(
  dateStr: string,
  timeStr: string,
  timezoneInput?: string | null
): string {
  const timezone = resolveFacilityTimezone(timezoneInput);
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Initial naive UTC approximation
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const local = getFacilityLocalDateTime(naiveUtc, timezone);

  const localAsUtc = new Date(Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0));
  const offsetMs = localAsUtc.getTime() - naiveUtc.getTime();
  const targetUtcMs = naiveUtc.getTime() - offsetMs;

  // Single refinement step for DST boundaries
  const refinedLocal = getFacilityLocalDateTime(new Date(targetUtcMs), timezone);
  const refinedLocalAsUtc = new Date(Date.UTC(refinedLocal.year, refinedLocal.month - 1, refinedLocal.day, refinedLocal.hour, refinedLocal.minute, 0));
  const diff = refinedLocalAsUtc.getTime() - naiveUtc.getTime();

  return new Date(targetUtcMs - diff).toISOString();
}

/**
 * Evaluates whether a given UTC instant falls within facility operating hours.
 */
export function isInstantWithinOperatingHours(
  instant: Date | string,
  operatingHours: any,
  timezoneInput?: string | null
): boolean {
  if (!operatingHours) return true;
  if (operatingHours === '24/7' || operatingHours.is24x7 === true) return true;

  const localTime = getFacilityLocalDateTime(instant, timezoneInput);
  const dayKey = localTime.dayName.toLowerCase();

  // If operating hours is structured object: { monday: { open, close, isOpen }, ... }
  if (typeof operatingHours === 'object' && operatingHours[dayKey]) {
    const dayConfig = operatingHours[dayKey];
    if (dayConfig.isOpen === false || dayConfig.isClosed === true) return false;
    const open = dayConfig.open || '00:00';
    const close = dayConfig.close || '23:59';
    return localTime.timeString >= open && localTime.timeString <= close;
  }

  // If operating hours is array: [ { dayOfWeek, openTime, closeTime, isClosed, isOvernight }, ... ]
  if (Array.isArray(operatingHours)) {
    const dayConfig = operatingHours.find(
      (item) => item.dayOfWeek === localTime.dayOfWeek || item.day?.toLowerCase() === dayKey
    );
    if (!dayConfig) return true;
    if (dayConfig.isClosed === true || dayConfig.isOpen === false) return false;
    const open = dayConfig.openTime || dayConfig.open || '00:00';
    const close = dayConfig.closeTime || dayConfig.close || '23:59';
    if (dayConfig.isOvernight) {
      return localTime.timeString >= open || localTime.timeString <= close;
    }
    return localTime.timeString >= open && localTime.timeString <= close;
  }

  return true;
}

/**
 * Formats a timestamp into a standardized string within the facility's timezone.
 */
export function formatInFacilityTimezone(
  dateInput: Date | string | number,
  timezoneInput?: string | null
): string {
  const local = getFacilityLocalDateTime(dateInput, timezoneInput);
  return `${local.dateString} ${local.timeString}:${String(local.second).padStart(2, '0')} (${local.timezone})`;
}
