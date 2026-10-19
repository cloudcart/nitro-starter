/** The API's weekday keys, Monday first, as stores' opening hours use them. */
export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/** A weekday's name in the visitor's language, from the API's key (`monday` …); an unknown key as it is. */
export function formatWeekday(day: string, language: string) {
  const index = WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);
  if (index < 0) return day;
  // 1 January 2024 was a Monday.
  return new Intl.DateTimeFormat(language, {weekday: 'long', timeZone: 'UTC'}).format(Date.UTC(2024, 0, 1 + index));
}

const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

/** A file's size in the visitor's language: "850 KB", "1.2 MB", "2.4 GB". */
export function formatBytes(bytes: number, language: string) {
  let value = bytes;
  let step = 0;
  while (value >= 1024 && step < BYTE_UNITS.length - 1) {
    value /= 1024;
    step++;
  }
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: BYTE_UNITS[step],
    unitDisplay: 'short',
    // Whole bytes and kilobytes; one decimal from megabytes.
    maximumFractionDigits: step >= 2 ? 1 : 0,
  }).format(value);
}

/** A count with the language's digit grouping: "27,285", "27 285" (B-435). */
export function formatCount(count: number, language: string) {
  return new Intl.NumberFormat(language).format(count);
}

/** A percentage as the language writes it — "2.5%", "2,5 %" — with its sign when `signed`: "+10%" (B-435). */
export function formatPercent(percent: number, language: string, {signed = false} = {}) {
  return new Intl.NumberFormat(language, {
    style: 'percent',
    maximumFractionDigits: 2,
    signDisplay: signed ? 'always' : 'auto',
  }).format(percent / 100);
}

/** The API's length units (`LengthUnit`) as `Intl`'s. */
const LENGTH_UNITS: Record<string, string> = {
  MILLIMETERS: 'millimeter',
  CENTIMETERS: 'centimeter',
  METERS: 'meter',
  INCHES: 'inch',
  FEET: 'foot',
  YARDS: 'yard',
};

/** A length with its unit as the language writes them: "12.5 cm", "12,5 см"; a unit `Intl` lacks after the number. */
export function formatLength(value: number, unit: string, language: string) {
  const unitName = LENGTH_UNITS[unit];
  return unitName
    ? new Intl.NumberFormat(language, {style: 'unit', unit: unitName, maximumFractionDigits: 2}).format(value)
    : `${new Intl.NumberFormat(language, {maximumFractionDigits: 2}).format(value)} ${unit.toLowerCase()}`;
}

/** How much a variant holds, as the store's Units app gives it, in the visitor's language: "360 ml", "0,5 kg". */
export function formatMeasure(
  {quantityValue, quantityUnit}: {quantityValue: number; quantityUnit: string},
  language: string,
) {
  return `${new Intl.NumberFormat(language, {maximumFractionDigits: 3}).format(quantityValue)} ${quantityUnit}`;
}
