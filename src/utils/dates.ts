const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const parseDateOnlyUtc = (value: string): Date | null => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
};

export const formatDateOnlyUtc = (date: Date): string =>
  date.toISOString().slice(0, 10);

export const dateOnlyToUtcMs = (value: string): number | null =>
  parseDateOnlyUtc(value)?.getTime() ?? null;

export const getMonday = (value: string, fallback: string): string => {
  const date = parseDateOnlyUtc(value);
  if (!date) return fallback;

  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return formatDateOnlyUtc(date);
};

export const addDays = (
  value: string,
  days: number,
  fallback: string
): string => {
  const date = parseDateOnlyUtc(value);
  if (!date || !Number.isFinite(days)) return fallback;

  date.setUTCDate(date.getUTCDate() + Math.trunc(days));
  return formatDateOnlyUtc(date);
};

export const addWeeks = (
  value: string,
  weeks: number,
  fallback: string
): string => addDays(value, weeks * 7, fallback);

export const compareDateOnly = (left: string, right: string): number | null => {
  const leftMs = dateOnlyToUtcMs(left);
  const rightMs = dateOnlyToUtcMs(right);
  if (leftMs === null || rightMs === null) return null;
  return leftMs - rightMs;
};

export const differenceInCalendarDays = (
  later: string,
  earlier: string
): number | null => {
  const laterMs = dateOnlyToUtcMs(later);
  const earlierMs = dateOnlyToUtcMs(earlier);
  if (laterMs === null || earlierMs === null) return null;
  return Math.round((laterMs - earlierMs) / MILLISECONDS_PER_DAY);
};

export const calculateWorkingDays = (
  startValue: string,
  endValue: string
): number => {
  const start = parseDateOnlyUtc(startValue);
  const end = parseDateOnlyUtc(endValue);
  if (!start || !end || start > end) return 0;

  let count = 0;
  const current = new Date(start.getTime());

  while (current <= end) {
    const weekday = current.getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
};
