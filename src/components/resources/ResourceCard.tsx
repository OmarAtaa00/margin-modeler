import CustomDatePicker from '../common/CustomDatePicker';
import ResourceAllocationInput from './ResourceAllocationInput';
import ResourceHoursInput from './ResourceHoursInput';

import {
    getResourceCapacityHours,
    getResourceDirectHours
} from '../../utils/resourceCalculations';

import { calculateWorkingDays } from '../../utils/dates';

import {
    formatDisplayNumber,
} from '../../utils/formatting';

import type { Resource } from '../../validation/workspaceValidation';

type ResourceCardColors = {
    card: string;
    border: string;
    inputBg: string;
    primary: string;
    accent: string;
    error: string;
    text: string;
    textMuted: string;
};

type ResourceCardProps = {
    resource: Resource;
    isBaseLocked: boolean;
    isDark: boolean;
    isMobile: boolean;
    isWideLayout: boolean;
    colors: ResourceCardColors;
    onUpdateField: (
        resourceId: string,
        field: keyof Resource,
        value: unknown
    ) => void;
    onUpdateAllocation: (
        resourceId: string,
        allocation: number
    ) => void;
    onUpdateDirectHours: (
        resourceId: string,
        hours: number
    ) => void;
    onClone: (resource: Resource) => void;
    onRequestDelete: (resource: Resource) => void;
};

export default function ResourceCard({
    resource,
    isBaseLocked,
    isDark,
    isMobile,
    isWideLayout,
    colors,
    onUpdateField,
    onUpdateAllocation,
    onUpdateDirectHours,
    onClone,
    onRequestDelete
}: ResourceCardProps) {
    const workingDays = calculateWorkingDays(
        resource.startDate,
        resource.endDate
    );

    const directHours = getResourceDirectHours(resource);
    const capacityHours = getResourceCapacityHours(resource);
    const totalCost = directHours * resource.costRate;
    const totalBillable = directHours * resource.billRate;

    const fieldLabelStyle = {
        fontSize: '10px',
        fontWeight: 800,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    } as const;

    const textInputStyle = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.inputBg,
        color: colors.text,
        fontSize: '13px',
        outline: 'none',
        boxSizing: 'border-box',
        marginTop: '4px',
        cursor: isBaseLocked ? 'not-allowed' : 'text',
        opacity: isBaseLocked ? 0.68 : 1
    } as const;

    return (
        <div
            className="hover-elevate"
            style={{
                backgroundColor: colors.card,
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px',
                    alignItems: 'end'
                }}
            >
                <div
                    style={{
                        gridColumn: isWideLayout ? 'span 2' : 'auto',
                        minWidth: 0
                    }}
                >
                    <label style={fieldLabelStyle}>
                        Resource Name / Role
                    </label>

                    <input
                        type="text"
                        value={resource.name}
                        disabled={isBaseLocked}
                        onChange={(event) =>
                            onUpdateField(
                                resource.id,
                                'name',
                                event.target.value
                            )
                        }
                        onBlur={(event) =>
                            onUpdateField(
                                resource.id,
                                'name',
                                event.currentTarget.value.trim() || 'Consultant'
                            )
                        }
                        placeholder="e.g. Senior Architect"
                        style={textInputStyle}
                    />
                </div>

                <div>
                    <label style={fieldLabelStyle}>
                        Cost Rate ($/hr)
                    </label>

                    <input
                        type="number"
                        min="0"
                        max="10000"
                        value={
                            resource.costRate === 0
                                ? ''
                                : resource.costRate
                        }
                        disabled={isBaseLocked}
                        onChange={(event) =>
                            onUpdateField(
                                resource.id,
                                'costRate',
                                event.target.value
                            )
                        }
                        placeholder="0"
                        style={textInputStyle}
                    />
                </div>

                <div>
                    <label style={fieldLabelStyle}>
                        Bill Rate ($/hr)
                    </label>

                    <input
                        type="number"
                        min="0"
                        max="10000"
                        value={
                            resource.billRate === 0
                                ? ''
                                : resource.billRate
                        }
                        disabled={isBaseLocked}
                        onChange={(event) =>
                            onUpdateField(
                                resource.id,
                                'billRate',
                                event.target.value
                            )
                        }
                        placeholder="0"
                        style={textInputStyle}
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <label
                        style={{
                            ...fieldLabelStyle,
                            marginBottom: '4px'
                        }}
                    >
                        Start Date
                    </label>

                    <CustomDatePicker
                        value={resource.startDate}
                        onChange={(date) =>
                            onUpdateField(resource.id, 'startDate', date)
                        }
                        isDark={isDark}
                        colors={colors}
                        disabled={isBaseLocked}
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <label
                        style={{
                            ...fieldLabelStyle,
                            marginBottom: '4px'
                        }}
                    >
                        End Date
                    </label>

                    <CustomDatePicker
                        value={resource.endDate}
                        onChange={(date) =>
                            onUpdateField(resource.id, 'endDate', date)
                        }
                        isDark={isDark}
                        colors={colors}
                        align="right"
                        disabled={isBaseLocked}
                    />
                </div>

                <div
                    style={{
                        gridColumn: isWideLayout ? 'span 2' : 'auto',
                        display: 'grid',
                        gridTemplateColumns: isMobile
                            ? '1fr'
                            : 'repeat(2, minmax(0, 1fr))',
                        gap: '12px',
                        minWidth: 0
                    }}
                >
                    {[
                        {
                            label: 'Total Cost',
                            value: totalCost
                        },
                        {
                            label: 'Total Billable',
                            value: totalBillable
                        }
                    ].map((summary) => (
                        <div
                            key={summary.label}
                            style={{
                                minWidth: 0,
                                padding: '12px 14px',
                                borderRadius: '10px',
                                border: `1px solid ${colors.border}`,
                                backgroundColor: colors.inputBg,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                        >
                            <span style={fieldLabelStyle}>
                                {summary.label}
                            </span>

                            <span
                                style={{
                                    fontSize: '18px',
                                    lineHeight: 1.2,
                                    fontWeight: 850,
                                    color: colors.text,
                                    overflowWrap: 'anywhere'
                                }}
                            >
                                $
                                {summary.value.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}
            >
                <div
                    style={{
                        flex: 1,
                        minWidth: isMobile
                            ? '100%'
                            : '280px',
                        display: 'grid',
                        gridTemplateColumns: isMobile
                            ? '1fr'
                            : 'minmax(120px, auto) minmax(0, 1fr)',
                        alignItems: 'end',
                        gap: '14px'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '5px'
                        }}
                    >
                        <span
                            style={{
                                fontSize: '9px',
                                lineHeight: 1,
                                fontWeight: 800,
                                color: colors.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em'
                            }}
                        >
                            Allocation
                        </span>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <ResourceAllocationInput
                                value={resource.utilization}
                                onCommit={(allocation) =>
                                    onUpdateAllocation(
                                        resource.id,
                                        allocation
                                    )
                                }
                                colors={colors}
                                disabled={isBaseLocked}
                            />

                            <span
                                style={{
                                    color: colors.textMuted,
                                    fontSize: '11px',
                                    fontWeight: 800
                                }}
                            >
                                %
                            </span>
                        </div>
                    </div>

                    <div
                        style={{
                            minWidth: 0,
                            minHeight: '51px',
                            padding: '9px 12px',
                            borderRadius: '9px',
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.inputBg,
                            display: 'flex',
                            alignItems: isMobile
                                ? 'flex-start'
                                : 'center',
                            justifyContent: 'space-between',
                            flexDirection: isMobile
                                ? 'column'
                                : 'row',
                            gap: '7px 14px',
                            flexWrap: 'wrap'
                        }}
                    >
                        <div>
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
                                Available capacity
                            </span>

                            <span
                                style={{
                                    display: 'block',
                                    marginTop: '3px',
                                    color: colors.text,
                                    fontSize: '11px',
                                    fontWeight: 750
                                }}
                            >
                                {workingDays} weekdays ·{' '}
                                {formatDisplayNumber(
                                    capacityHours,
                                    0
                                )}{' '}
                                hrs
                            </span>
                        </div>

                        <div
                            style={{
                                textAlign: isMobile
                                    ? 'left'
                                    : 'right'
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
                                Allocated hours
                            </span>

                            <span
                                style={{
                                    display: 'block',
                                    marginTop: '3px',
                                    color: colors.primary,
                                    fontSize: '12px',
                                    fontWeight: 850
                                }}
                            >
                                {formatDisplayNumber(
                                    directHours
                                )}{' '}
                                hrs
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '8px',
                        justifyContent: isMobile
                            ? 'space-between'
                            : 'flex-end',
                        minWidth: isMobile ? 0 : '168px',
                        width: isMobile ? '100%' : 'auto'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '5px'
                        }}
                    >
                        <span
                            style={{
                                fontSize: '9px',
                                lineHeight: 1,
                                fontWeight: 800,
                                color: colors.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em'
                            }}
                        >
                            Direct hours
                        </span>

                        <ResourceHoursInput
                            value={directHours}
                            onCommit={(hours) =>
                                onUpdateDirectHours(resource.id, hours)
                            }
                            colors={colors}
                            max={capacityHours}
                            disabled={isBaseLocked}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => onClone(resource)}
                        disabled={isBaseLocked}
                        aria-label={`Clone ${resource.name}`}
                        title={
                            isBaseLocked
                                ? 'The base project is locked'
                                : `Clone ${resource.name} above this assignment`
                        }
                        style={{
                            width: '38px',
                            height: '38px',
                            padding: 0,
                            margin: 0,
                            backgroundColor: isDark
                                ? 'rgba(59, 130, 246, 0.09)'
                                : '#eff6ff',
                            color: colors.primary,
                            border: `1px solid ${isDark
                                ? 'rgba(96, 165, 250, 0.28)'
                                : '#bfdbfe'
                                }`,
                            borderRadius: '9px',
                            boxShadow: 'none',
                            cursor: isBaseLocked
                                ? 'not-allowed'
                                : 'pointer',
                            opacity: isBaseLocked ? 0.46 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
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
                                d="M8 8h10a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2zm-2 8H5a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1"
                            />
                        </svg>
                    </button>

                    <button
                        type="button"
                        className="resource-delete-button"
                        onClick={() => onRequestDelete(resource)}
                        disabled={isBaseLocked}
                        aria-label={
                            isBaseLocked
                                ? `${resource.name} is locked`
                                : `Delete ${resource.name}`
                        }
                        title={
                            isBaseLocked
                                ? 'The base project is locked'
                                : `Delete ${resource.name}`
                        }
                        style={{
                            width: '38px',
                            height: '38px',
                            padding: 0,
                            margin: 0,
                            backgroundColor: isDark
                                ? 'rgba(239, 68, 68, 0.08)'
                                : '#fff7f7',
                            color: colors.error,
                            border: `1px solid ${isDark
                                ? 'rgba(248, 113, 113, 0.24)'
                                : '#fecaca'
                                }`,
                            borderRadius: '9px',
                            boxShadow: 'none',
                            WebkitAppearance: 'none',
                            appearance: 'none',
                            cursor: isBaseLocked
                                ? 'not-allowed'
                                : 'pointer',
                            opacity: isBaseLocked ? 0.46 : 1,
                            transition:
                                'background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}