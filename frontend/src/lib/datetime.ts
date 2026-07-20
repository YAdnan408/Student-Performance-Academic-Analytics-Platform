/** Bangladesh Standard Time — UTC+6, no daylight saving. */
export const BD_TIMEZONE = 'Asia/Dhaka';

const bdDisplayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BD_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** Display an ISO timestamp in Bangladesh Standard Time. */
export function formatBdDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${bdDisplayFormatter.format(d)} BST`;
}

/**
 * Convert a datetime-local input value to ISO, treating the value as Bangladesh time.
 * datetime-local has no timezone; we always attach +06:00 before sending to the API.
 */
export function bdDatetimeLocalToIso(localValue: string): string | null {
  if (!localValue) return null;
  const normalized = localValue.length === 16 ? `${localValue}:00` : localValue;
  return `${normalized}+06:00`;
}

/** Convert API ISO timestamp to datetime-local string in Bangladesh time (for editing). */
export function isoToBdDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BD_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * Default enrollment close for new courses: 24 hours before start_date 00:00 BD
 * → previous calendar day at 00:00 (datetime-local value).
 */
export function defaultEnrollmentClosesLocal(startDate: string): string {
  if (!startDate) return '';
  const start = new Date(`${startDate}T00:00:00+06:00`);
  if (Number.isNaN(start.getTime())) return '';
  start.setTime(start.getTime() - 24 * 60 * 60 * 1000);
  return isoToBdDatetimeLocal(start.toISOString());
}
