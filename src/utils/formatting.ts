export const roundForDisplay = (
  value: number,
  fractionDigits = 2
): number => {
  if (!Number.isFinite(value)) return 0;

  const factor = 10 ** fractionDigits;

  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const formatEditableNumber = (
  value: number,
  fractionDigits = 2
): string => String(roundForDisplay(value, fractionDigits));

export const formatDisplayNumber = (
  value: number,
  fractionDigits = 2
): string =>
  roundForDisplay(value, fractionDigits).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  });