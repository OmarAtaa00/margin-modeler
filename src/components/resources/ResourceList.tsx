import ResourceCard from './ResourceCard';

import type { Resource } from '../../validation/workspaceValidation';

type ResourceListColors = {
    card: string;
    border: string;
    inputBg: string;
    primary: string;
    accent: string;
    error: string;
    text: string;
    textMuted: string;
};

type ResourceListProps = {
    resources: Resource[];
    isBaseLocked: boolean;
    isDark: boolean;
    isMobile: boolean;
    isWideLayout: boolean;
    colors: ResourceListColors;
    onAddResource: () => void;
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
    onCloneResource: (resource: Resource) => void;
    onRequestDelete: (resource: Resource) => void;
};

export default function ResourceList({
    resources,
    isBaseLocked,
    isDark,
    isMobile,
    isWideLayout,
    colors,
    onAddResource,
    onUpdateField,
    onUpdateAllocation,
    onUpdateDirectHours,
    onCloneResource,
    onRequestDelete
}: ResourceListProps) {
    return (
        <section
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                }}
            >
                <h2
                    style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        margin: 0
                    }}
                >
                    Resources &amp; Assignments
                </h2>

                <button
                    type="button"
                    disabled={isBaseLocked}
                    onClick={onAddResource}
                    style={{
                        backgroundColor: colors.primary,
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: isBaseLocked
                            ? 'not-allowed'
                            : 'pointer',
                        opacity: isBaseLocked ? 0.55 : 1,
                        boxShadow:
                            '0 2px 4px rgba(59, 130, 246, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        +
                    </span>

                    Add Resource
                </button>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}
            >
                {resources.length === 0 ? (
                    <div
                        style={{
                            padding: '40px',
                            textAlign: 'center',
                            border: `2px dashed ${colors.border}`,
                            borderRadius: '16px',
                            color: colors.textMuted
                        }}
                    >
                        No active assignments in this scenario. Click Add
                        Resource to begin planning.
                    </div>
                ) : (
                    resources.map((resource) => (
                        <ResourceCard
                            key={resource.id}
                            resource={resource}
                            isBaseLocked={isBaseLocked}
                            isDark={isDark}
                            isMobile={isMobile}
                            isWideLayout={isWideLayout}
                            colors={colors}
                            onUpdateField={onUpdateField}
                            onUpdateAllocation={onUpdateAllocation}
                            onUpdateDirectHours={onUpdateDirectHours}
                            onClone={onCloneResource}
                            onRequestDelete={onRequestDelete}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
``