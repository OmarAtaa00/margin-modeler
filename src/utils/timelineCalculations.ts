import {
  addDays,
  dateOnlyToUtcMs,
  differenceInCalendarDays,
  formatDateOnlyUtc,
  parseDateOnlyUtc
} from './dates';

import type { Resource } from '../validation/workspaceValidation';

export type TimelineZoom = 'fit' | '3m' | '6m' | '1y';

export type TimelineRange = {
  startDate: string;
  endDate: string;
  totalDays: number;
};

export type TimelineMonth = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  leftPercent: number;
  widthPercent: number;
};

export type TimelineWeek = {
  key: string;
  label: string;
  date: string;
  leftPercent: number;
};

export type TimelineBarPosition = {
  leftPercent: number;
  widthPercent: number;
  isVisible: boolean;
};

const getStartOfMonth = (value: string): string | null => {
  const date = parseDateOnlyUtc(value);

  if (!date) return null;

  date.setUTCDate(1);

  return formatDateOnlyUtc(date);
};

const getEndOfMonth = (value: string): string | null => {
  const date = parseDateOnlyUtc(value);

  if (!date) return null;

  date.setUTCMonth(date.getUTCMonth() + 1, 0);

  return formatDateOnlyUtc(date);
};

const addCalendarMonths = (
  value: string,
  months: number
): string | null => {
  const date = parseDateOnlyUtc(value);

  if (!date || !Number.isFinite(months)) return null;

  const originalDay = date.getUTCDate();

  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + Math.trunc(months));

  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  date.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));

  return formatDateOnlyUtc(date);
};

const getDateMinimum = (
  values: string[]
): string | null => {
  let minimumValue: string | null = null;
  let minimumMs: number | null = null;

  values.forEach((value) => {
    const valueMs = dateOnlyToUtcMs(value);

    if (
      valueMs !== null &&
      (minimumMs === null || valueMs < minimumMs)
    ) {
      minimumMs = valueMs;
      minimumValue = value;
    }
  });

  return minimumValue;
};

const getDateMaximum = (
  values: string[]
): string | null => {
  let maximumValue: string | null = null;
  let maximumMs: number | null = null;

  values.forEach((value) => {
    const valueMs = dateOnlyToUtcMs(value);

    if (
      valueMs !== null &&
      (maximumMs === null || valueMs > maximumMs)
    ) {
      maximumMs = valueMs;
      maximumValue = value;
    }
  });

  return maximumValue;
};

const getFixedZoomMonths = (
  zoom: TimelineZoom
): number | null => {
  if (zoom === '3m') return 3;
  if (zoom === '6m') return 6;
  if (zoom === '1y') return 12;

  return null;
};

export const getTimelineRange = (
  projectStartDate: string,
  resources: Resource[],
  zoom: TimelineZoom
): TimelineRange | null => {
  const validProjectStart = parseDateOnlyUtc(
    projectStartDate
  );

  if (!validProjectStart) return null;

  const fixedMonths = getFixedZoomMonths(zoom);

  let startDate: string;
  let endDate: string;

  if (fixedMonths !== null) {
    const monthStart = getStartOfMonth(projectStartDate);

    if (!monthStart) return null;

    const finalMonth = addCalendarMonths(
      monthStart,
      fixedMonths - 1
    );

    if (!finalMonth) return null;

    const monthEnd = getEndOfMonth(finalMonth);

    if (!monthEnd) return null;

    startDate = monthStart;
    endDate = monthEnd;
  } else {
    const validResourceStarts = resources
      .map((resource) => resource.startDate)
      .filter((value) => parseDateOnlyUtc(value) !== null);

    const validResourceEnds = resources
      .map((resource) => resource.endDate)
      .filter((value) => parseDateOnlyUtc(value) !== null);

    const earliestDate =
      getDateMinimum([
        projectStartDate,
        ...validResourceStarts
      ]) ?? projectStartDate;

    const latestDate =
      getDateMaximum([
        projectStartDate,
        ...validResourceEnds
      ]) ?? projectStartDate;

    const monthStart = getStartOfMonth(earliestDate);
    const monthEnd = getEndOfMonth(latestDate);

    if (!monthStart || !monthEnd) return null;

    startDate = monthStart;
    endDate = monthEnd;
  }

  const totalDays =
    differenceInCalendarDays(endDate, startDate);

  if (totalDays === null || totalDays < 0) {
    return null;
  }

  return {
    startDate,
    endDate,
    totalDays: totalDays + 1
  };
};

export const getTimelineMonthSegments = (
  range: TimelineRange
): TimelineMonth[] => {
  const months: TimelineMonth[] = [];
  let currentMonth = getStartOfMonth(range.startDate);

  if (!currentMonth) return months;

  while (currentMonth <= range.endDate) {
    const naturalMonthEnd = getEndOfMonth(currentMonth);

    if (!naturalMonthEnd) break;

    const segmentStart =
      currentMonth < range.startDate
        ? range.startDate
        : currentMonth;

    const segmentEnd =
      naturalMonthEnd > range.endDate
        ? range.endDate
        : naturalMonthEnd;

    const daysBefore =
      differenceInCalendarDays(
        segmentStart,
        range.startDate
      ) ?? 0;

    const segmentDays =
      (differenceInCalendarDays(
        segmentEnd,
        segmentStart
      ) ?? 0) + 1;

    const parsedMonth = parseDateOnlyUtc(currentMonth);

    if (!parsedMonth) break;

    months.push({
      key: currentMonth,
      label: parsedMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }),
      startDate: segmentStart,
      endDate: segmentEnd,
      leftPercent:
        (daysBefore / range.totalDays) * 100,
      widthPercent:
        (segmentDays / range.totalDays) * 100
    });

    const nextMonth = addCalendarMonths(currentMonth, 1);

    if (!nextMonth || nextMonth <= currentMonth) break;

    currentMonth = nextMonth;
  }

  return months;
};

export const getTimelineWeekMarkers = (
  range: TimelineRange
): TimelineWeek[] => {
  const markers: TimelineWeek[] = [];
  const rangeStart = parseDateOnlyUtc(range.startDate);

  if (!rangeStart) return markers;

  const daysUntilMonday =
    (8 - rangeStart.getUTCDay()) % 7;

  let currentDate = addDays(
    range.startDate,
    daysUntilMonday,
    range.startDate
  );

  while (currentDate <= range.endDate) {
    const daysBefore =
      differenceInCalendarDays(
        currentDate,
        range.startDate
      ) ?? 0;

    const parsedDate = parseDateOnlyUtc(currentDate);

    if (!parsedDate) break;

    markers.push({
      key: currentDate,
      date: currentDate,
      label: parsedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      }),
      leftPercent:
        (daysBefore / range.totalDays) * 100
    });

    currentDate = addDays(
      currentDate,
      7,
      currentDate
    );
  }

  return markers;
};

export const getTimelineBarPosition = (
  startDate: string,
  endDate: string,
  range: TimelineRange
): TimelineBarPosition | null => {
  const startOffset = differenceInCalendarDays(
    startDate,
    range.startDate
  );

  const endOffset = differenceInCalendarDays(
    endDate,
    range.startDate
  );

  if (startOffset === null || endOffset === null) {
    return null;
  }

  const visibleStart = Math.max(0, startOffset);
  const visibleEnd = Math.min(
    range.totalDays,
    endOffset + 1
  );

  const isVisible =
    visibleEnd > 0 &&
    visibleStart < range.totalDays &&
    visibleEnd > visibleStart;

  return {
    leftPercent:
      (visibleStart / range.totalDays) * 100,
    widthPercent:
      (Math.max(0, visibleEnd - visibleStart) /
        range.totalDays) *
      100,
    isVisible
  };
};

export const convertPixelsToCalendarDays = (
  deltaPixels: number,
  timelineWidth: number,
  totalDays: number
): number => {
  if (
    !Number.isFinite(deltaPixels) ||
    !Number.isFinite(timelineWidth) ||
    timelineWidth <= 0 ||
    totalDays <= 0
  ) {
    return 0;
  }

  const pixelsPerDay = timelineWidth / totalDays;

  return Math.round(deltaPixels / pixelsPerDay);
};

export const getRecommendedTimelineWidth = (
  range: TimelineRange,
  viewportWidth: number
): number => {
  const safeViewportWidth = Number.isFinite(viewportWidth)
    ? Math.max(600, viewportWidth)
    : 600;

  const pixelsPerDay =
    range.totalDays <= 100
      ? 10
      : range.totalDays <= 200
        ? 6
        : 3.5;

  return Math.max(
    safeViewportWidth,
    Math.round(range.totalDays * pixelsPerDay)
  );
};