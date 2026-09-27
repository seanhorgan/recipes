// Dates are ISO strings (YYYY-MM-DD) handled in UTC so results never depend on the viewer's time zone.

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type Day = (typeof DAYS)[number];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(iso: string): number {
  return (toDate(iso).getUTCDay() + 6) % 7;
}

export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

/** Repo path of the weekly plan for the week starting on `monday`. */
export function planPath(monday: string): string {
  const d = toDate(monday);
  return `${d.getUTCFullYear()}/${MONTHS[d.getUTCMonth()]}/${monday}.md`;
}

export function formatLong(iso: string): string {
  const d = toDate(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
