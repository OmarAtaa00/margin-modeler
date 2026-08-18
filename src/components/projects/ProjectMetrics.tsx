import {
  formatCurrency,
  formatDisplayNumber
} from '../../utils/formatting';

import type {
  ScenarioTotals
} from '../../utils/scenarioCalculations';

type ProjectMetricsColors = {
  card: string;
  border: string;
  textMuted: string;
};

type ProjectMetricsProps = {
  totals: ScenarioTotals;
  isMobile: boolean;
  colors: ProjectMetricsColors;
};

export default function ProjectMetrics({
  totals,
  isMobile,
  colors
}: ProjectMetricsProps) {
  const metrics = [
    {
      label: 'Effective Work Hours',
      value:
        `${formatDisplayNumber(
          totals.totalHours
        )} hrs`
    },
    {
      label: 'Calculated Cost',
      value: formatCurrency(
        totals.totalCost
      )
    },
    {
      label: 'Expected Revenue',
      value: formatCurrency(
        totals.totalRevenue
      )
    },
    {
      label: 'Margin Value',
      value: formatCurrency(
        totals.marginValue
      )
    }
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '1fr'
          : 'repeat(2, minmax(0, 1fr))',
        gap: '16px'
      }}
    >
      {metrics.map((metric) => (
        <div
          key={metric.label}
          style={{
            backgroundColor: colors.card,
            borderRadius: '16px',
            border:
              `1px solid ${colors.border}`,
            padding: '20px',
            boxShadow:
              '0 2px 8px rgba(0, 0, 0, 0.01)'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: colors.textMuted,
              letterSpacing: '0.05em'
            }}
          >
            {metric.label}
          </span>

          <div
            style={{
              fontSize: '20px',
              fontWeight: 800,
              marginTop: '4px',
              overflowWrap: 'anywhere'
            }}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}