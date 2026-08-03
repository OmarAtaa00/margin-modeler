import CustomDatePicker from '../common/CustomDatePicker';

import type { ScenarioTotals } from '../../utils/scenarioCalculations';
import type { MarginTheme } from '../../utils/marginTheme';
import type { Scenario } from '../../validation/workspaceValidation';

type ProjectSummaryColors = {
    card: string;
    border: string;
    inputBg: string;
    primary: string;
    text: string;
    textMuted: string;
};

type ActiveProjectSummaryProps = {
    scenario: Scenario;
    totals: ScenarioTotals;
    baseTotals: ScenarioTotals | null;
    marginDelta: number | null;
    marginTheme: MarginTheme;
    isBase: boolean;
    isDark: boolean;
    isMobile: boolean;
    colors: ProjectSummaryColors;
    onChangeName: (name: string) => void;
    onChangeProjectStartDate: (date: string) => void;
    onToggleBase: () => void;
};

export default function ActiveProjectSummary({
    scenario,
    totals,
    baseTotals,
    marginDelta,
    marginTheme,
    isBase,
    isDark,
    isMobile,
    colors,
    onChangeName,
    onChangeProjectStartDate,
    onToggleBase
}: ActiveProjectSummaryProps) {
    const marginLabel = isBase
        ? 'Base margin'
        : baseTotals
            ? 'Compared margin'
            : 'Scenario margin';

    return (
        <div
            style={{
                backgroundColor: colors.card,
                borderRadius: '14px',
                border: `1px solid ${colors.border}`,
                padding: isMobile ? '16px' : '20px',
                boxShadow: isDark
                    ? 'none'
                    : '0 2px 10px rgba(15, 23, 42, 0.035)',
                position: 'relative'
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                        ? 'minmax(0, 1fr)'
                        : 'minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: isMobile ? '16px' : '24px'
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            marginBottom: '7px',
                            flexWrap: 'wrap'
                        }}
                    >
                        <span
                            style={{
                                color: colors.textMuted,
                                fontSize: '9px',
                                fontWeight: 800,
                                letterSpacing: '0.09em',
                                textTransform: 'uppercase'
                            }}
                        >
                            Active project
                        </span>

                        <button
                            type="button"
                            onClick={onToggleBase}
                            aria-pressed={isBase}
                            title={
                                isBase
                                    ? 'Remove Base status and unlock this project'
                                    : 'Use this project as the margin comparison base'
                            }
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                minHeight: '32px',
                                padding: '5px 10px 5px 6px',
                                borderRadius: '999px',
                                border: `1px solid ${isBase ? marginTheme.border : colors.border
                                    }`,
                                backgroundColor: isBase
                                    ? marginTheme.bg
                                    : colors.inputBg,
                                color: isBase
                                    ? marginTheme.text
                                    : colors.textMuted,
                                fontSize: '10px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: 'none',
                                margin: 0
                            }}
                        >
                            <span
                                aria-hidden="true"
                                style={{
                                    width: '28px',
                                    height: '18px',
                                    padding: '2px',
                                    borderRadius: '999px',
                                    backgroundColor: isBase
                                        ? colors.primary
                                        : colors.border,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: isBase
                                        ? 'flex-end'
                                        : 'flex-start',
                                    boxSizing: 'border-box',
                                    transition: 'all 0.18s ease'
                                }}
                            >
                                <span
                                    style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        backgroundColor: '#ffffff',
                                        boxShadow:
                                            '0 1px 3px rgba(15, 23, 42, 0.28)'
                                    }}
                                />
                            </span>

                            {isBase
                                ? 'Base locked'
                                : baseTotals
                                    ? 'Make new base'
                                    : 'Set as base'}
                        </button>
                    </div>

                    <input
                        className="project-name-input"
                        type="text"
                        value={scenario.name}
                        disabled={isBase}
                        onChange={(event) =>
                            onChangeName(event.target.value)
                        }
                        onFocus={(event) => {
                            if (!isBase) {
                                event.currentTarget.style.borderBottomColor =
                                    colors.primary;
                            }
                        }}
                        onBlur={(event) => {
                            event.currentTarget.style.borderBottomColor =
                                'transparent';

                            onChangeName(
                                event.currentTarget.value.trim() ||
                                'Unnamed Scenario'
                            );
                        }}
                        style={{
                            display: 'block',
                            width: 'min(100%, 560px)',
                            height: 'auto',
                            minHeight: 0,
                            padding: '1px 0 5px',
                            margin: 0,
                            fontSize: isMobile ? '18px' : '20px',
                            fontWeight: 800,
                            lineHeight: 1.25,
                            letterSpacing: '-0.02em',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid transparent',
                            borderRadius: 0,
                            boxShadow: 'none',
                            WebkitAppearance: 'none',
                            appearance: 'none',
                            color: colors.text,
                            cursor: isBase ? 'not-allowed' : 'text',
                            opacity: isBase ? 0.72 : 1,
                            outline: 'none'
                        }}
                    />

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '14px',
                            flexWrap: 'wrap'
                        }}
                    >
                        <span
                            style={{
                                fontSize: '10px',
                                color: colors.textMuted,
                                fontWeight: 700
                            }}
                        >
                            Timeline starts
                        </span>

                        <div
                            style={{
                                width: isMobile ? '100%' : '164px',
                                maxWidth: '100%'
                            }}
                        >
                            <CustomDatePicker
                                value={scenario.projectStartDate}
                                onChange={onChangeProjectStartDate}
                                isDark={isDark}
                                colors={colors}
                                disabled={isBase}
                            />
                        </div>
                    </div>

                    {isBase && (
                        <div
                            style={{
                                marginTop: '12px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: `1px solid ${marginTheme.border}`,
                                backgroundColor: marginTheme.bg,
                                color: marginTheme.text,
                                fontSize: '11px',
                                fontWeight: 700,
                                lineHeight: 1.45
                            }}
                        >
                            🔒 This base project is read-only. Use Clone Active
                            to create an editable comparison.
                        </div>
                    )}
                </div>

                <div
                    style={{
                        width: isMobile ? '100%' : '168px',
                        minHeight: '88px',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        textAlign: isMobile ? 'left' : 'center',
                        backgroundColor: marginTheme.bg,
                        border: `1px solid ${marginTheme.border}`,
                        color: marginTheme.text,
                        display: 'flex',
                        flexDirection: isMobile ? 'row' : 'column',
                        alignItems: 'center',
                        justifyContent: isMobile
                            ? 'space-between'
                            : 'center',
                        gap: isMobile ? '12px' : '2px',
                        boxSizing: 'border-box'
                    }}
                >
                    <span
                        style={{
                            fontSize: '9px',
                            fontWeight: 850,
                            lineHeight: 1.3,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            opacity: 0.82
                        }}
                    >
                        {marginLabel}
                    </span>

                    <div
                        style={{
                            fontSize: '26px',
                            lineHeight: 1,
                            fontWeight: 900,
                            letterSpacing: '-0.03em'
                        }}
                    >
                        {totals.margin.toFixed(1)}%
                    </div>

                    {baseTotals && (
                        <span
                            style={{
                                fontSize: '9px',
                                fontWeight: 800,
                                marginTop: isMobile ? 0 : '5px',
                                opacity: 0.86
                            }}
                        >
                            {isBase
                                ? 'Comparison reference'
                                : `${marginDelta !== null && marginDelta >= 0
                                    ? '+'
                                    : ''}${marginDelta?.toFixed(1)} pts vs ${baseTotals.margin.toFixed(1)}%`}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}