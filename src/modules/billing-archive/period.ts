/**
 * Reine Perioden-Logik (ohne DB) – Monat/Quartal/Jahr-Zuordnung.
 * Bewusst pure Funktionen, damit unit-testbar und überall wiederverwendbar.
 */

export const MONTH_NAMES_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export interface PeriodParts {
  year: number;
  month: number; // 1..12
  quarter: number; // 1..4
  label: string; // "01_Januar 2026"
}

export function quarterOfMonth(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

export function monthsOfQuarter(quarter: number): number[] {
  const start = (quarter - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

export function monthLabel(year: number, month: number): string {
  const mm = String(month).padStart(2, "0");
  return `${mm}_${MONTH_NAMES_DE[month - 1]} ${year}`;
}

/** Aus einem Datum (i.d.R. issueDate der Rechnung) die Periode ableiten. */
export function periodFromDate(date: Date): PeriodParts {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const quarter = quarterOfMonth(month);
  return { year, month, quarter, label: monthLabel(year, month) };
}
