import {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    formatCurrency,
    formatDisplayNumber,
    formatSignedCurrency
} from '../../utils/formatting';

import {
    compareScenarios
} from '../../utils/scenarioComparison';

import type {
    Scenario
} from '../../validation/workspaceValidation';

type ComparisonSummaryColors = {
    card: string;
    border: string;
    inputBg: string;
    primary: string;
    text: string;
    textMuted: string;
    success: string;
    error: string;
};

type ComparisonSummaryDialogProps = {
    baseScenario: Scenario;
    currentScenario: Scenario;
    colors: ComparisonSummaryColors;
    isDark: boolean;
    isMobile: boolean;
    onClose: () => void;
};

const formatSignedNumber = (
    value: number,
    fractionDigits = 2
): string => {
    const safeValue =
        Number.isFinite(value) ? value : 0;

    const formattedValue =
        Math.abs(safeValue).toLocaleString(
            undefined,
            {
                minimumFractionDigits: 0,
                maximumFractionDigits:
                    fractionDigits
            }
        );

    if (safeValue > 0) {
        return `+${formattedValue}`;
    }

    if (safeValue < 0) {
        return `-${formattedValue}`;
    }

    return formattedValue;
};

const formatDayDifference = (
    value: number | null
): string => {
    if (value === null) {
        return 'Not available';
    }

    if (value === 0) {
        return 'No change';
    }

    const absoluteValue =
        Math.abs(value);

    return `${value > 0 ? '+' : '-'}${absoluteValue} ${absoluteValue === 1
        ? 'day'
        : 'days'
        }`;
};

const getDifferenceColor = (
    value: number,
    positiveIsBetter: boolean,
    colors: ComparisonSummaryColors
): string => {
    if (value === 0) {
        return colors.textMuted;
    }

    const isPositiveResult =
        positiveIsBetter
            ? value > 0
            : value < 0;

    return isPositiveResult
        ? colors.success
        : colors.error;
};

export default function ComparisonSummaryDialog({
    baseScenario,
    currentScenario,
    colors,
    isDark,
    isMobile,
    onClose
}: ComparisonSummaryDialogProps) {
    const [copyState, setCopyState] =
        useState<
            'idle' | 'copied' | 'error'
        >('idle');

    const comparison = useMemo(
        () =>
            compareScenarios(
                baseScenario,
                currentScenario
            ),
        [baseScenario, currentScenario]
    );

    useEffect(() => {
        const handleKeyDown = (
            event: KeyboardEvent
        ) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown
        );

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown
            );
        };
    }, [onClose]);

    const marginDirection =
        comparison.marginValueDifference > 0
            ? 'more'
            : comparison.marginValueDifference < 0
                ? 'less'
                : 'the same';

    const marginPointDirection =
        comparison.marginPointDifference > 0
            ? 'higher'
            : comparison.marginPointDifference < 0
                ? 'lower'
                : 'unchanged';

    const executiveSummary =
        comparison.marginValueDifference === 0
            ? `${currentScenario.name} produces the same margin value as ${baseScenario.name}.`
            : `${currentScenario.name} produces ${formatCurrency(
                Math.abs(
                    comparison.marginValueDifference
                )
            )} ${marginDirection} margin value than ${baseScenario.name}.`;

    const pointSummary =
        comparison.marginPointDifference === 0
            ? 'The margin percentage is unchanged.'
            : `The margin percentage is ${Math.abs(
                comparison.marginPointDifference
            ).toFixed(1)} points ${marginPointDirection}.`;

    const resourceSummary =
        comparison.resourceCountDifference === 0
            ? 'The resource count is unchanged.'
            : `The current project has ${Math.abs(
                comparison.resourceCountDifference
            )} ${comparison.resourceCountDifference > 0
                ? 'more'
                : 'fewer'
            } ${Math.abs(
                comparison.resourceCountDifference
            ) === 1
                ? 'resource'
                : 'resources'
            }.`;

    const summaryText = [
        'Margin Modeler Comparison Summary',
        '',
        `Base project: ${baseScenario.name}`,
        `Current project: ${currentScenario.name}`,
        '',
        executiveSummary,
        pointSummary,
        resourceSummary,
        '',
        'Financial comparison',
        `Revenue difference: ${formatSignedCurrency(
            comparison.revenueDifference
        )}`,
        `Cost difference: ${formatSignedCurrency(
            comparison.costDifference
        )}`,
        `Margin value difference: ${formatSignedCurrency(
            comparison.marginValueDifference
        )}`,
        `Margin percentage difference: ${formatSignedNumber(
            comparison.marginPointDifference,
            1
        )} pts`,
        '',
        'Delivery comparison',
        `Direct-hours difference: ${formatSignedNumber(
            comparison.hoursDifference
        )} hrs`,
        `Resource-count difference: ${formatSignedNumber(
            comparison.resourceCountDifference,
            0
        )}`,
        `Schedule-duration difference: ${formatDayDifference(
            comparison.scheduleDurationDifference
        )}`,
        '',
        `Added resources: ${comparison.resources.added.length
        }`,
        `Removed resources: ${comparison.resources.removed.length
        }`,
        `Changed assignments: ${comparison.resources.changed.length
        }`
    ].join('\n');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(
                summaryText
            );

            setCopyState('copied');

            window.setTimeout(() => {
                setCopyState('idle');
            }, 2400);
        } catch (error) {
            console.error(
                'Could not copy the comparison summary:',
                error
            );

            setCopyState('error');

            window.setTimeout(() => {
                setCopyState('idle');
            }, 3000);
        }
    };

    const metricCards = [
        {
            label: 'Revenue difference',
            value: formatSignedCurrency(
                comparison.revenueDifference
            ),
            color: getDifferenceColor(
                comparison.revenueDifference,
                true,
                colors
            )
        },
        {
            label: 'Cost difference',
            value: formatSignedCurrency(
                comparison.costDifference
            ),
            color: getDifferenceColor(
                comparison.costDifference,
                false,
                colors
            )
        },
        {
            label: 'Margin value difference',
            value: formatSignedCurrency(
                comparison.marginValueDifference
            ),
            color: getDifferenceColor(
                comparison.marginValueDifference,
                true,
                colors
            )
        },
        {
            label: 'Margin-point difference',
            value:
                `${formatSignedNumber(
                    comparison.marginPointDifference,
                    1
                )} pts`,
            color: getDifferenceColor(
                comparison.marginPointDifference,
                true,
                colors
            )
        },
        {
            label: 'Direct-hours difference',
            value:
                `${formatSignedNumber(
                    comparison.hoursDifference
                )} hrs`,
            color: colors.text
        },
        {
            label: 'Resource-count difference',
            value: formatSignedNumber(
                comparison.resourceCountDifference,
                0
            ),
            color: colors.text
        },
        {
            label: 'Schedule difference',
            value: formatDayDifference(
                comparison.scheduleDurationDifference
            ),
            color: colors.text
        },
        {
            label: 'Changed assignments',
            value:
                comparison.resources.changed.length.toLocaleString(),
            color: colors.text
        }
    ];

    return (
        <div
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 12000,
                padding: isMobile
                    ? '12px'
                    : '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                    'rgba(2, 6, 23, 0.72)',
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="comparison-summary-title"
                aria-describedby="comparison-summary-description"
                style={{
                    width: '100%',
                    maxWidth: '960px',
                    maxHeight:
                        'calc(100vh - 32px)',
                    overflowY: 'auto',
                    padding: isMobile
                        ? '20px'
                        : '28px',
                    borderRadius: isMobile
                        ? '16px'
                        : '20px',
                    border:
                        `1px solid ${colors.border}`,
                    backgroundColor: colors.card,
                    color: colors.text,
                    boxShadow:
                        '0 28px 80px rgba(0, 0, 0, 0.38)'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '20px'
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <span
                            style={{
                                display: 'block',
                                color: colors.primary,
                                fontSize: '10px',
                                fontWeight: 850,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase'
                            }}
                        >
                            Base comparison
                        </span>

                        <h2
                            id="comparison-summary-title"
                            style={{
                                margin: '7px 0 0',
                                fontSize: isMobile
                                    ? '22px'
                                    : '27px',
                                lineHeight: 1.15,
                                letterSpacing: '-0.035em'
                            }}
                        >
                            Comparison summary
                        </h2>

                        <p
                            id="comparison-summary-description"
                            style={{
                                margin: '9px 0 0',
                                color: colors.textMuted,
                                fontSize: '12px',
                                lineHeight: 1.6
                            }}
                        >
                            Comparing{' '}
                            <strong>
                                {currentScenario.name}
                            </strong>{' '}
                            against{' '}
                            <strong>
                                {baseScenario.name}
                            </strong>
                            .
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close comparison summary"
                        style={{
                            width: '36px',
                            height: '36px',
                            flexShrink: 0,
                            padding: 0,
                            margin: 0,
                            borderRadius: '10px',
                            border:
                                `1px solid ${colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor:
                                colors.inputBg,
                            color: colors.textMuted,
                            cursor: 'pointer',
                            boxShadow: 'none'
                        }}
                    >
                        <svg
                            aria-hidden="true"
                            style={{
                                width: '17px',
                                height: '17px'
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div
                    style={{
                        marginTop: '23px',
                        padding: isMobile
                            ? '16px'
                            : '20px',
                        borderRadius: '14px',
                        border:
                            `1px solid ${comparison.marginValueDifference >=
                                0
                                ? isDark
                                    ? 'rgba(52, 211, 153, 0.30)'
                                    : '#a7f3d0'
                                : isDark
                                    ? 'rgba(248, 113, 113, 0.30)'
                                    : '#fecaca'
                            }`,
                        backgroundColor:
                            comparison.marginValueDifference >=
                                0
                                ? isDark
                                    ? 'rgba(16, 185, 129, 0.09)'
                                    : '#ecfdf5'
                                : isDark
                                    ? 'rgba(239, 68, 68, 0.09)'
                                    : '#fef2f2'
                    }}
                >
                    <span
                        style={{
                            display: 'block',
                            color:
                                comparison.marginValueDifference >=
                                    0
                                    ? colors.success
                                    : colors.error,
                            fontSize: '10px',
                            fontWeight: 850,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase'
                        }}
                    >
                        Executive result
                    </span>

                    <p
                        style={{
                            margin: '8px 0 0',
                            color: colors.text,
                            fontSize: isMobile
                                ? '14px'
                                : '16px',
                            fontWeight: 750,
                            lineHeight: 1.65
                        }}
                    >
                        {executiveSummary}{' '}
                        {pointSummary}{' '}
                        {resourceSummary}
                    </p>
                </div>

                <div
                    style={{
                        marginTop: '20px',
                        display: 'grid',
                        gridTemplateColumns: isMobile
                            ? '1fr'
                            : 'repeat(2, minmax(0, 1fr))',
                        gap: '12px'
                    }}
                >
                    <div
                        style={{
                            padding: '15px',
                            borderRadius: '12px',
                            border:
                                `1px solid ${colors.border}`,
                            backgroundColor:
                                colors.inputBg
                        }}
                    >
                        <span
                            style={{
                                color: colors.textMuted,
                                fontSize: '9px',
                                fontWeight: 850,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase'
                            }}
                        >
                            Base project
                        </span>

                        <strong
                            style={{
                                display: 'block',
                                marginTop: '6px',
                                fontSize: '13px'
                            }}
                        >
                            {baseScenario.name}
                        </strong>

                        <span
                            style={{
                                display: 'block',
                                marginTop: '5px',
                                color: colors.textMuted,
                                fontSize: '10px',
                                lineHeight: 1.5
                            }}
                        >
                            {formatCurrency(
                                comparison.baseTotals.marginValue
                            )}{' '}
                            margin ·{' '}
                            {comparison.baseTotals.margin.toFixed(
                                1
                            )}
                            %
                        </span>
                    </div>

                    <div
                        style={{
                            padding: '15px',
                            borderRadius: '12px',
                            border:
                                `1px solid ${colors.border}`,
                            backgroundColor:
                                colors.inputBg
                        }}
                    >
                        <span
                            style={{
                                color: colors.textMuted,
                                fontSize: '9px',
                                fontWeight: 850,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase'
                            }}
                        >
                            Current project
                        </span>

                        <strong
                            style={{
                                display: 'block',
                                marginTop: '6px',
                                fontSize: '13px'
                            }}
                        >
                            {currentScenario.name}
                        </strong>

                        <span
                            style={{
                                display: 'block',
                                marginTop: '5px',
                                color: colors.textMuted,
                                fontSize: '10px',
                                lineHeight: 1.5
                            }}
                        >
                            {formatCurrency(
                                comparison.currentTotals.marginValue
                            )}{' '}
                            margin ·{' '}
                            {comparison.currentTotals.margin.toFixed(
                                1
                            )}
                            %
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        marginTop: '20px',
                        display: 'grid',
                        gridTemplateColumns: isMobile
                            ? '1fr'
                            : 'repeat(2, minmax(0, 1fr))',
                        gap: '12px'
                    }}
                >
                    {metricCards.map((metric) => (
                        <div
                            key={metric.label}
                            style={{
                                padding: '14px',
                                borderRadius: '11px',
                                border:
                                    `1px solid ${colors.border}`,
                                backgroundColor:
                                    colors.inputBg
                            }}
                        >
                            <span
                                style={{
                                    display: 'block',
                                    color: colors.textMuted,
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {metric.label}
                            </span>

                            <strong
                                style={{
                                    display: 'block',
                                    marginTop: '5px',
                                    color: metric.color,
                                    fontSize: '16px',
                                    overflowWrap: 'anywhere'
                                }}
                            >
                                {metric.value}
                            </strong>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        marginTop: '22px',
                        display: 'grid',
                        gridTemplateColumns: isMobile
                            ? '1fr'
                            : 'repeat(3, minmax(0, 1fr))',
                        gap: '12px'
                    }}
                >
                    <ResourceChangeSection
                        title="Added resources"
                        emptyMessage="No resources were added."
                        resources={comparison.resources.added.map(
                            (resource) =>
                                resource.name ||
                                'Unnamed resource'
                        )}
                        colors={colors}
                    />

                    <ResourceChangeSection
                        title="Removed resources"
                        emptyMessage="No resources were removed."
                        resources={comparison.resources.removed.map(
                            (resource) =>
                                resource.name ||
                                'Unnamed resource'
                        )}
                        colors={colors}
                    />

                    <ResourceChangeSection
                        title="Changed assignments"
                        emptyMessage="No assignment fields changed."
                        resources={comparison.resources.changed.map(
                            ({
                                currentResource,
                                changes
                            }) =>
                                `${currentResource.name ||
                                'Unnamed resource'
                                }: ${changes.join(', ')}`
                        )}
                        colors={colors}
                    />
                </div>

                <div
                    style={{
                        marginTop: '24px',
                        paddingTop: '18px',
                        borderTop:
                            `1px solid ${colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                    }}
                >
                    <span
                        role="status"
                        aria-live="polite"
                        style={{
                            color:
                                copyState === 'error'
                                    ? colors.error
                                    : copyState === 'copied'
                                        ? colors.success
                                        : colors.textMuted,
                            fontSize: '10px',
                            fontWeight: 700
                        }}
                    >
                        {copyState === 'copied'
                            ? 'Summary copied to clipboard.'
                            : copyState === 'error'
                                ? 'The summary could not be copied.'
                                : 'Copy the summary for email, Teams, or project notes.'}
                    </span>

                    <div
                        style={{
                            display: 'flex',
                            gap: '9px',
                            flexWrap: 'wrap'
                        }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                minHeight: '39px',
                                padding: '8px 14px',
                                margin: 0,
                                borderRadius: '9px',
                                border: `1px solid ${colors.border}`,
                                backgroundColor: colors.card,
                                color: colors.text,
                                fontSize: '11px',
                                fontWeight: 750,
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                void handleCopy();
                            }}
                            style={{
                                minHeight: '39px',
                                padding: '8px 14px',
                                margin: 0,
                                borderRadius: '9px',
                                border: 'none',
                                backgroundColor: colors.primary,
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow:
                                    '0 4px 12px rgba(59, 130, 246, 0.24)'
                            }}
                        >
                            Copy summary
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

type ResourceChangeSectionProps = {
    title: string;
    emptyMessage: string;
    resources: string[];
    colors: ComparisonSummaryColors;
};

function ResourceChangeSection({
    title,
    emptyMessage,
    resources,
    colors
}: ResourceChangeSectionProps) {
    return (
        <section
            style={{
                minWidth: 0,
                padding: '14px',
                borderRadius: '11px',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.inputBg
            }}
        >
            <h3
                style={{
                    margin: 0,
                    color: colors.text,
                    fontSize: '11px',
                    fontWeight: 850
                }}
            >
                {title}
            </h3>

            {resources.length === 0 ? (
                <p
                    style={{
                        margin: '8px 0 0',
                        color: colors.textMuted,
                        fontSize: '10px',
                        lineHeight: 1.5
                    }}
                >
                    {emptyMessage}
                </p>
            ) : (
                <ul
                    style={{
                        margin: '9px 0 0',
                        paddingLeft: '17px',
                        color: colors.textMuted,
                        fontSize: '10px',
                        lineHeight: 1.6
                    }}
                >
                    {resources.map(
                        (resource, index) => (
                            <li
                                key={`${resource}-${index}`}
                            >
                                {resource}
                            </li>
                        )
                    )}
                </ul>
            )}
        </section>
    );
}        