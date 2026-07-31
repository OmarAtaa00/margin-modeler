export type MarginTheme = {
  bg: string;
  border: string;
  text: string;
  badge: string;
};

export const getMarginTheme = (
  margin: number,
  isDark: boolean
): MarginTheme => {
  if (margin >= 50) {
    return {
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
      border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
      text: isDark ? '#34d399' : '#047857',
      badge: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5'
    };
  }

  if (margin >= 35) {
    return {
      bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
      border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
      text: isDark ? '#fbbf24' : '#b45309',
      badge: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7'
    };
  }

  return {
    bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
    text: isDark ? '#f87171' : '#b91c1c',
    badge: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'
  };
};

export const getScenarioMarginTheme = (
  margin: number,
  baseMargin: number | null,
  isBaseScenario: boolean,
  isDark: boolean
): MarginTheme => {
  if (baseMargin === null) {
    return getMarginTheme(margin, isDark);
  }

  if (isBaseScenario) {
    return {
      bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      border: isDark ? 'rgba(96, 165, 250, 0.35)' : '#bfdbfe',
      text: isDark ? '#93c5fd' : '#1d4ed8',
      badge: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe'
    };
  }

  if (margin >= baseMargin) {
    return {
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
      border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
      text: isDark ? '#34d399' : '#047857',
      badge: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5'
    };
  }

  return {
    bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
    text: isDark ? '#f87171' : '#b91c1c',
    badge: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'
  };
};