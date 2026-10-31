/** Company clock. One zone for the calendar, the schedule, and the weekly check-in. */
export const COMPANY_ZONE = "America/Denver";

/** Calendar dates stored as UTC midnights. They are dates, not instants. */

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function asUtcDate(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** Calendar date of an instant in an IANA zone. DST-aware via Intl. */
export function calendarDate(instant: Date, zone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  if (!year || !month || !day) {
    throw new Error(`Could not read a calendar date in ${zone}`);
  }
  return utcDate(year, month, day);
}

/** Whole calendar days from start to end. Negative when end is earlier. */
export function calendarDaysBetween(start: Date, end: Date): number {
  const first = asUtcDate(start).getTime();
  const last = asUtcDate(end).getTime();
  return Math.round((last - first) / 86_400_000);
}

export function formatDate(value: Date): string {
  const day = asUtcDate(value);
  const month = String(day.getUTCMonth() + 1).padStart(2, "0");
  const date = String(day.getUTCDate()).padStart(2, "0");
  return `${day.getUTCFullYear()}-${month}-${date}`;
}

export function addUtcDays(value: Date, days: number): Date {
  const day = asUtcDate(value);
  return new Date(day.getTime() + days * 86_400_000);
}

/** Monday of the company week that contains `day`. Sunday belongs to the Monday before it. */
export function mondayOnOrBefore(day: Date): Date {
  const weekday = asUtcDate(day).getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addUtcDays(day, delta);
}

/** Week starting Monday, from the company date when we have one. */
export function currentWeekStart(today: string | null, now = new Date()): string {
  const day = today ? parseDate(today) : calendarDate(now, COMPANY_ZONE);
  return formatDate(mondayOnOrBefore(day));
}

export function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Expected a YYYY-MM-DD date, received ${value}`);
  return utcDate(Number(match[1]), Number(match[2]), Number(match[3]));
}
