import {
    formatCurrency,
    formatSignedCurrency
} from '../../utils/formatting';

import {
    getScenarioMarginTheme
} from '../../utils/marginTheme';

import {
    computeScenarioTotals
} from '../../utils/scenarioCalculations';

import type {
    Scenario
} from '../../validation/workspaceValidation';

type ScenarioMatrixColors = {
    card: string;
    border: string;
    primary: string;
    text: string;
    textMuted: string;
};

type ScenarioMatrixProps = {
    scenarios: Scenario[];
    activeScenarioId: string;
    baseScenarioId: string | null;
    isDark: boolean;
    colors: ScenarioMatrixColors;
    onSwitchScenario: (
        scenario: Scenario
    ) => void;
};

export default function ScenarioMatrix({
    scenarios,
    activeScenarioId,
    baseScenarioId,
    isDark,
    colors,
    onSwitchScenario
}: ScenarioMatrixProps) {
    const baseScenario =
        scenarios.find(
            (scenario) =>
                scenario.id === baseScenarioId
        ) ?? null;

    const baseTotals = baseScenario
        ? computeScenarioTotals(
            baseScenario.resources
        )
        : null;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '32px',
                minWidth: 0
            }}
        >
            <div
                style={{
                    backgroundColor: colors.card,
                    borderRadius: '16px',
                    border:
                        `1px solid ${colors.border}`,
                    padding: '24px',
                    boxShadow:
                        '0 4px 18px -4px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}
            >
                <div>
                    <h3
                        style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <svg
                            aria-hidden="true"
                            style={{
                                width: '20px',
                                height: '20px',
                                color: '#10b981'
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                        </svg>

                        Scenario Matrix Comparison
                    </h3>

                    <p
                        style={{
                            color: colors.textMuted,
                            fontSize: '11px',
                            lineHeight: 1.5,
                            margin: '4px 0 0'
                        }}
                    >
                        {baseTotals
                            ? 'Green margins meet or beat the base. Red margins are below the base.'
                            : 'Set one project as Base to enable green and red margin comparison.'}
                    </p>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}
                >
                    {scenarios.map((scenario) => {
                        const totals =
                            computeScenarioTotals(
                                scenario.resources
                            );

                        const isCurrent =
                            scenario.id ===
                            activeScenarioId;

                        const isBase =
                            scenario.id ===
                            baseScenarioId;

                        const marginDelta =
                            baseTotals
                                ? totals.margin -
                                baseTotals.margin
                                : null;

                        const marginValueDelta =
                            baseTotals
                                ? totals.marginValue -
                                baseTotals.marginValue
                                : null;

                        const matrixTheme =
                            getScenarioMarginTheme(
                                totals.margin,
                                baseTotals?.margin ?? null,
                                isBase,
                                isDark
                            );

                        return (
                            <button
                                key={scenario.id}
                                type="button"
                                onClick={() =>
                                    onSwitchScenario(scenario)
                                }
                                aria-current={
                                    isCurrent
                                        ? 'page'
                                        : undefined
                                }
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    margin: 0,
                                    borderRadius: '12px',
                                    border: `1px solid ${isCurrent
                                        ? colors.primary
                                        : baseTotals
                                            ? matrixTheme.border
                                            : colors.border
                                        }`,
                                    backgroundColor: isCurrent
                                        ? isDark
                                            ? 'rgba(59, 130, 246, 0.08)'
                                            : '#eff6ff'
                                        : 'transparent',
                                    color: colors.text,
                                    cursor: isCurrent
                                        ? 'default'
                                        : 'pointer',
                                    display: 'flex',
                                    justifyContent:
                                        'space-between',
                                    alignItems: 'center',
                                    gap: '12px',
                                    textAlign: 'left',
                                    boxShadow: 'none',
                                    transition:
                                        'all 0.15s ease'
                                }}
                            >
                                <div
                                    style={{
                                        minWidth: 0,
                                        flex: 1,
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span
                                            style={{
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow:
                                                    'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                color: colors.text
                                            }}
                                        >
                                            {scenario.name}
                                        </span>

                                        {isCurrent && (
                                            <span
                                                aria-hidden="true"
                                                style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    flexShrink: 0,
                                                    borderRadius: '50%',
                                                    backgroundColor:
                                                        colors.primary
                                                }}
                                            />
                                        )}

                                        {isBase && (
                                            <span
                                                style={{
                                                    padding: '2px 5px',
                                                    borderRadius: '999px',
                                                    backgroundColor:
                                                        matrixTheme.badge,
                                                    color:
                                                        matrixTheme.text,
                                                    fontSize: '8px',
                                                    fontWeight: 900,
                                                    letterSpacing:
                                                        '0.06em'
                                                }}
                                            >
                                                BASE
                                            </span>
                                        )}
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '10px',
                                            marginTop: '5px',
                                            flexWrap: 'wrap'
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '10px',
                                                color:
                                                    colors.textMuted
                                            }}
                                        >
                                            Cost:{' '}
                                            {formatCurrency(
                                                totals.totalCost,
                                                0
                                            )}
                                        </span>

                                        <span
                                            style={{
                                                fontSize: '10px',
                                                color:
                                                    colors.textMuted
                                            }}
                                        >
                                            Revenue:{' '}
                                            {formatCurrency(
                                                totals.totalRevenue,
                                                0
                                            )}
                                        </span>

                                        <span
                                            style={{
                                                fontSize: '10px',
                                                color:
                                                    matrixTheme.text,
                                                fontWeight: 800
                                            }}
                                        >
                                            Margin:{' '}
                                            {formatCurrency(
                                                totals.marginValue,
                                                0
                                            )}
                                        </span>

                                        {baseTotals && (
                                            <span
                                                style={{
                                                    fontSize: '10px',
                                                    color:
                                                        matrixTheme.text,
                                                    fontWeight: 800
                                                }}
                                            >
                                                {isBase
                                                    ? 'Comparison reference'
                                                    : `${formatSignedCurrency(
                                                        marginValueDelta ??
                                                        0,
                                                        0
                                                    )} · ${marginDelta !==
                                                        null &&
                                                        marginDelta >= 0
                                                        ? '+'
                                                        : ''
                                                    }${marginDelta?.toFixed(
                                                        1
                                                    )} pts`}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        flexShrink: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        gap: '4px'
                                    }}
                                >
                                    <span
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            backgroundColor:
                                                matrixTheme.badge,
                                            color:
                                                matrixTheme.text,
                                            fontSize: '11px',
                                            fontWeight: 800
                                        }}
                                    >
                                        {totals.margin.toFixed(
                                            1
                                        )}
                                        %
                                    </span>

                                    <span
                                        style={{
                                            color:
                                                matrixTheme.text,
                                            fontSize: '9px',
                                            fontWeight: 800,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {formatCurrency(
                                            totals.marginValue,
                                            0
                                        )}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div
                    style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: isDark
                            ? 'rgba(59, 130, 246, 0.08)'
                            : '#eff6ff',
                        border: `1px solid ${isDark
                            ? 'rgba(59, 130, 246, 0.2)'
                            : '#bfdbfe'
                            }`,
                        color: isDark
                            ? '#93c5fd'
                            : '#1e3a8a'
                    }}
                >
                    <h4
                        style={{
                            margin: '0 0 6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}
                    >
                        Workday Math Mechanics
                    </h4>

                    <p
                        style={{
                            margin: 0,
                            fontSize: '11px',
                            lineHeight: 1.5
                        }}
                    >
                        Calculated working days skip
                        Saturdays and Sundays. Each
                        scheduled business day represents
                        8 base hours. Changing project
                        schedules instantly updates
                        assignments, revenue, and scenario
                        margin metrics.
                    </p>
                </div>
            </div>
        </div>
    );
}