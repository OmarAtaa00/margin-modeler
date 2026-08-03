import {
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import {
    addDays,
    compareDateOnly,
    differenceInCalendarDays
} from '../../utils/dates';

import { formatDisplayNumber } from '../../utils/formatting';

import {
    convertPixelsToCalendarDays,
    getRecommendedTimelineWidth,
    getTimelineBarPosition,
    getTimelineMonthSegments,
    getTimelineRange,
    getTimelineWeekMarkers
} from '../../utils/timelineCalculations';

import type {
    TimelineRange,
    TimelineZoom
} from '../../utils/timelineCalculations';

import type {
    Resource
} from '../../validation/workspaceValidation';

type TimelineColors = {
    card: string;
    border: string;
    borderLight: string;
    accent: string;
    primary: string;
    text: string;
    textMuted: string;
};

type DragType =
    | 'shift'
    | 'resize-start'
    | 'resize-end';

type DragState = {
    resourceId: string;
    type: DragType;
    pointerStartX: number;
    initialStartDate: string;
    initialEndDate: string;
    totalDays: number;
};

type GanttTimelineProps = {
    projectStartDate: string;
    resources: Resource[];
    isBaseLocked: boolean;
    isDark: boolean;
    colors: TimelineColors;
    onUpdateResourceDates: (
        resourceId: string,
        startDate: string,
        endDate: string
    ) => void;
};

const zoomOptions: Array<{
    value: TimelineZoom;
    label: string;
}> = [
        {
            value: 'fit',
            label: 'Fit'
        },
        {
            value: '3m',
            label: '3 months'
        },
        {
            value: '6m',
            label: '6 months'
        },
        {
            value: '1y',
            label: '1 year'
        }
    ];

const getProjectMarkerPosition = (
    projectStartDate: string,
    range: TimelineRange
): number | null => {
    const offset = differenceInCalendarDays(
        projectStartDate,
        range.startDate
    );

    if (
        offset === null ||
        offset < 0 ||
        offset >= range.totalDays
    ) {
        return null;
    }

    return (offset / range.totalDays) * 100;
};

export default function GanttTimeline({
    projectStartDate,
    resources,
    isBaseLocked,
    isDark,
    colors,
    onUpdateResourceDates
}: GanttTimelineProps) {
    const [zoom, setZoom] =
        useState<TimelineZoom>('fit');

    const [dragState, setDragState] =
        useState<DragState | null>(null);

    const [viewportWidth, setViewportWidth] =
        useState(800);

    const viewportRef =
        useRef<HTMLDivElement>(null);

    const timelineRef =
        useRef<HTMLDivElement>(null);

    const range = useMemo(
        () =>
            getTimelineRange(
                projectStartDate,
                resources,
                zoom
            ),
        [projectStartDate, resources, zoom]
    );

    const monthSegments = useMemo(
        () =>
            range
                ? getTimelineMonthSegments(range)
                : [],
        [range]
    );

    const weekMarkers = useMemo(
        () =>
            range
                ? getTimelineWeekMarkers(range)
                : [],
        [range]
    );

    const timelineWidth = range
        ? getRecommendedTimelineWidth(
            range,
            viewportWidth
        )
        : viewportWidth;

    const projectMarkerPosition = range
        ? getProjectMarkerPosition(
            projectStartDate,
            range
        )
        : null;

    useEffect(() => {
        const viewport = viewportRef.current;

        if (!viewport) return;

        const updateViewportWidth = () => {
            setViewportWidth(
                Math.max(600, viewport.clientWidth)
            );
        };

        updateViewportWidth();

        const observer = new ResizeObserver(
            updateViewportWidth
        );

        observer.observe(viewport);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!dragState || isBaseLocked) {
            return;
        }

        const handlePointerMove = (
            event: PointerEvent
        ) => {
            const timeline = timelineRef.current;

            if (!timeline) return;

            const width =
                timeline.getBoundingClientRect().width;

            const deltaPixels =
                event.clientX -
                dragState.pointerStartX;

            const deltaDays =
                convertPixelsToCalendarDays(
                    deltaPixels,
                    width,
                    dragState.totalDays
                );

            if (deltaDays === 0) return;

            let nextStartDate =
                dragState.initialStartDate;

            let nextEndDate =
                dragState.initialEndDate;

            if (dragState.type === 'shift') {
                nextStartDate = addDays(
                    dragState.initialStartDate,
                    deltaDays,
                    dragState.initialStartDate
                );

                nextEndDate = addDays(
                    dragState.initialEndDate,
                    deltaDays,
                    dragState.initialEndDate
                );
            }

            if (
                dragState.type === 'resize-start'
            ) {
                const proposedStartDate = addDays(
                    dragState.initialStartDate,
                    deltaDays,
                    dragState.initialStartDate
                );

                const comparison = compareDateOnly(
                    proposedStartDate,
                    dragState.initialEndDate
                );

                if (
                    comparison !== null &&
                    comparison <= 0
                ) {
                    nextStartDate =
                        proposedStartDate;
                }
            }

            if (
                dragState.type === 'resize-end'
            ) {
                const proposedEndDate = addDays(
                    dragState.initialEndDate,
                    deltaDays,
                    dragState.initialEndDate
                );

                const comparison = compareDateOnly(
                    proposedEndDate,
                    dragState.initialStartDate
                );

                if (
                    comparison !== null &&
                    comparison >= 0
                ) {
                    nextEndDate = proposedEndDate;
                }
            }

            onUpdateResourceDates(
                dragState.resourceId,
                nextStartDate,
                nextEndDate
            );
        };

        const stopDragging = () => {
            setDragState(null);
        };

        window.addEventListener(
            'pointermove',
            handlePointerMove
        );

        window.addEventListener(
            'pointerup',
            stopDragging
        );

        window.addEventListener(
            'pointercancel',
            stopDragging
        );

        return () => {
            window.removeEventListener(
                'pointermove',
                handlePointerMove
            );

            window.removeEventListener(
                'pointerup',
                stopDragging
            );

            window.removeEventListener(
                'pointercancel',
                stopDragging
            );
        };
    }, [
        dragState,
        isBaseLocked,
        onUpdateResourceDates
    ]);

    if (!range) {
        return (
            <section
                style={{
                    padding: '24px',
                    borderRadius: '16px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.card,
                    color: colors.textMuted
                }}
            >
                The timeline could not be generated because
                the project start date is invalid.
            </section>
        );
    }

    return (
        <section
            style={{
                backgroundColor: colors.card,
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                padding: '24px',
                boxShadow:
                    '0 2px 8px rgba(0, 0, 0, 0.01)'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    marginBottom: '18px'
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <h3
                        style={{
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            fontSize: '16px',
                            fontWeight: 800
                        }}
                    >
                        <svg
                            aria-hidden="true"
                            style={{
                                width: '20px',
                                height: '20px',
                                color: colors.accent
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>

                        Calendar Timeline
                    </h3>

                    <p
                        style={{
                            margin: '5px 0 0',
                            color: colors.textMuted,
                            fontSize: '11px',
                            lineHeight: 1.5
                        }}
                    >
                        {isBaseLocked
                            ? 'The base project timeline is read-only.'
                            : 'Drag an assignment to shift its dates, or drag either edge to resize it.'}
                    </p>

                    <p
                        style={{
                            margin: '4px 0 0',
                            color: colors.textMuted,
                            fontSize: '10px'
                        }}
                    >
                        Visible range: {range.startDate} to{' '}
                        {range.endDate}
                    </p>
                </div>

                <div
                    role="group"
                    aria-label="Timeline range"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap'
                    }}
                >
                    {zoomOptions.map((option) => {
                        const isSelected =
                            option.value === zoom;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                    setZoom(option.value)
                                }
                                aria-pressed={isSelected}
                                style={{
                                    minHeight: '32px',
                                    padding: '6px 10px',
                                    margin: 0,
                                    borderRadius: '8px',
                                    border: `1px solid ${isSelected
                                        ? colors.primary
                                        : colors.border
                                        }`,
                                    backgroundColor: isSelected
                                        ? isDark
                                            ? 'rgba(59, 130, 246, 0.16)'
                                            : '#eff6ff'
                                        : colors.card,
                                    color: isSelected
                                        ? colors.primary
                                        : colors.textMuted,
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: 'none'
                                }}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div
                ref={viewportRef}
                className="custom-scroll"
                style={{
                    width: '100%',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    paddingBottom: '8px'
                }}
            >
                <div
                    ref={timelineRef}
                    style={{
                        position: 'relative',
                        width: `${timelineWidth}px`,
                        minWidth: '600px'
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            height: '34px',
                            borderBottom: `1px solid ${colors.border}`,
                            backgroundColor: isDark
                                ? 'rgba(15, 23, 42, 0.32)'
                                : '#f8fafc',
                            overflow: 'hidden'
                        }}
                    >
                        {monthSegments.map((month) => (
                            <div
                                key={month.key}
                                title={`${month.startDate} to ${month.endDate}`}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: `${month.leftPercent}%`,
                                    width: `${month.widthPercent}%`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRight: `1px solid ${colors.border}`,
                                    color: colors.text,
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden'
                                }}
                            >
                                {month.label}
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            height: '32px',
                            borderBottom: `1px solid ${colors.border}`,
                            overflow: 'hidden'
                        }}
                    >
                        {weekMarkers.map((week) => (
                            <div
                                key={week.key}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: `${week.leftPercent}%`,
                                    width: '1px',
                                    borderLeft: `1px solid ${colors.borderLight}`
                                }}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '8px',
                                        left: '5px',
                                        color: colors.textMuted,
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {week.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            padding: '12px 0'
                        }}
                    >
                        <div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                overflow: 'hidden'
                            }}
                        >
                            {monthSegments.map((month) => (
                                <div
                                    key={`month-grid-${month.key}`}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        bottom: 0,
                                        left: `${month.leftPercent}%`,
                                        width: `${month.widthPercent}%`,
                                        borderRight: `1px solid ${colors.border}`
                                    }}
                                />
                            ))}

                            {weekMarkers.map((week) => (
                                <div
                                    key={`week-grid-${week.key}`}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        bottom: 0,
                                        left: `${week.leftPercent}%`,
                                        borderLeft: `1px dashed ${colors.borderLight}`
                                    }}
                                />
                            ))}

                            {projectMarkerPosition !== null && (
                                <div
                                    title={`Project start: ${projectStartDate}`}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        bottom: 0,
                                        left: `${projectMarkerPosition}%`,
                                        borderLeft: `2px solid ${colors.primary}`,
                                        opacity: 0.7
                                    }}
                                />
                            )}
                        </div>

                        {resources.length === 0 ? (
                            <div
                                style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    padding: '24px',
                                    textAlign: 'center',
                                    color: colors.textMuted,
                                    fontSize: '12px'
                                }}
                            >
                                No assignments are available for the
                                selected project.
                            </div>
                        ) : (
                            resources.map((resource) => {
                                const position =
                                    getTimelineBarPosition(
                                        resource.startDate,
                                        resource.endDate,
                                        range
                                    );

                                if (!position) return null;

                                return (
                                    <div
                                        key={resource.id}
                                        style={{
                                            position: 'relative',
                                            zIndex: 1,
                                            width: '100%',
                                            height: '42px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {position.isVisible ? (
                                            <div
                                                className="gantt-bar"
                                                title={`${resource.name ||
                                                    'Consultant'
                                                    }: ${resource.startDate
                                                    } to ${resource.endDate}`}
                                                onPointerDown={(event) => {
                                                    if (isBaseLocked) return;

                                                    const rect =
                                                        event.currentTarget.getBoundingClientRect();

                                                    const pointerOffset =
                                                        event.clientX -
                                                        rect.left;

                                                    const edgeThreshold =
                                                        Math.min(
                                                            12,
                                                            Math.max(
                                                                6,
                                                                rect.width / 4
                                                            )
                                                        );

                                                    let dragType: DragType =
                                                        'shift';

                                                    if (
                                                        pointerOffset <=
                                                        edgeThreshold
                                                    ) {
                                                        dragType =
                                                            'resize-start';
                                                    } else if (
                                                        rect.width -
                                                        pointerOffset <=
                                                        edgeThreshold
                                                    ) {
                                                        dragType =
                                                            'resize-end';
                                                    }

                                                    setDragState({
                                                        resourceId:
                                                            resource.id,
                                                        type: dragType,
                                                        pointerStartX:
                                                            event.clientX,
                                                        initialStartDate:
                                                            resource.startDate,
                                                        initialEndDate:
                                                            resource.endDate,
                                                        totalDays:
                                                            range.totalDays
                                                    });

                                                    event.preventDefault();
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${position.leftPercent}%`,
                                                    width: `${Math.max(
                                                        position.widthPercent,
                                                        0.35
                                                    )}%`,
                                                    minWidth: '8px',
                                                    height: '34px',
                                                    padding: '0 4px',
                                                    boxSizing: 'border-box',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent:
                                                        'space-between',
                                                    borderRadius: '7px',
                                                    border: `1px solid ${isDark
                                                        ? 'rgba(99, 102, 241, 0.38)'
                                                        : '#c7d2fe'
                                                        }`,
                                                    backgroundColor: isDark
                                                        ? 'rgba(99, 102, 241, 0.18)'
                                                        : '#e0e7ff',
                                                    cursor: isBaseLocked
                                                        ? 'default'
                                                        : dragState
                                                            ?.resourceId ===
                                                            resource.id
                                                            ? 'grabbing'
                                                            : 'grab',
                                                    opacity: isBaseLocked
                                                        ? 0.78
                                                        : 1,
                                                    userSelect: 'none',
                                                    touchAction: 'none',
                                                    transition:
                                                        dragState?.resourceId ===
                                                            resource.id
                                                            ? 'none'
                                                            : 'left 0.15s ease, width 0.15s ease'
                                                }}
                                            >
                                                <div
                                                    aria-hidden="true"
                                                    style={{
                                                        width: '4px',
                                                        height: '55%',
                                                        flexShrink: 0,
                                                        borderRadius: '2px',
                                                        backgroundColor: isDark
                                                            ? 'rgba(129, 140, 248, 0.75)'
                                                            : '#818cf8',
                                                        cursor: isBaseLocked
                                                            ? 'default'
                                                            : 'ew-resize'
                                                    }}
                                                />

                                                <span
                                                    style={{
                                                        minWidth: 0,
                                                        flex: 1,
                                                        margin: '0 5px',
                                                        overflow: 'hidden',
                                                        textOverflow:
                                                            'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        textAlign: 'center',
                                                        color: isDark
                                                            ? '#c7d2fe'
                                                            : '#4338ca',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    {resource.name ||
                                                        'Consultant'}{' '}
                                                    (
                                                    {formatDisplayNumber(
                                                        resource.utilization
                                                    )}
                                                    %)
                                                </span>

                                                <div
                                                    aria-hidden="true"
                                                    style={{
                                                        width: '4px',
                                                        height: '55%',
                                                        flexShrink: 0,
                                                        borderRadius: '2px',
                                                        backgroundColor: isDark
                                                            ? 'rgba(129, 140, 248, 0.75)'
                                                            : '#818cf8',
                                                        cursor: isBaseLocked
                                                            ? 'default'
                                                            : 'ew-resize'
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    paddingLeft: '8px',
                                                    color: colors.textMuted,
                                                    fontSize: '10px',
                                                    fontStyle: 'italic'
                                                }}
                                            >
                                                {resource.name ||
                                                    'Consultant'}{' '}
                                                is outside the selected timeline
                                                range.
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div
                style={{
                    marginTop: '10px',
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    color: colors.textMuted,
                    fontSize: '9px',
                    fontWeight: 700
                }}
            >
                <span>
                    Blue line: project start date
                </span>

                <span>
                    Fit: shows all assignment months
                </span>

                {!isBaseLocked && (
                    <span>
                        Drag center: move · Drag edge: resize
                    </span>
                )}
            </div>
        </section>
    );
}