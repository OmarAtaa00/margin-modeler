import { useRef } from 'react';

import type { ChangeEvent } from 'react';
import type { Scenario } from '../../validation/workspaceValidation';

type NavigationColors = {
  card: string;
  border: string;
  primary: string;
  text: string;
  textMuted: string;
};

type ProjectNavigationProps = {
  scenarios: Scenario[];
  activeScenarioId: string;
  baseScenarioId: string | null;
  hasActiveScenario: boolean;
  isDark: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  colors: NavigationColors;
  onSwitchScenario: (scenarioId: string) => void;
  onRequestScenarioDeletion: (scenario: Scenario) => void;
  onCreateScenario: () => void;
  onCloneActiveScenario: () => void;
  onImportJSON: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportJSON: () => void;
};

export default function ProjectNavigation({
  scenarios,
  activeScenarioId,
  baseScenarioId,
  hasActiveScenario,
  isDark,
  isDesktop,
  isMobile,
  colors,
  onSwitchScenario,
  onRequestScenarioDeletion,
  onCreateScenario,
  onCloneActiveScenario,
  onImportJSON,
  onExportJSON
}: ProjectNavigationProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actionButtonStyle = {
    padding: '8px 14px',
    borderRadius: '8px',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: isMobile ? '1 1 140px' : '0 0 auto',
    justifyContent: 'center',
    margin: 0
  } as const;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isDesktop ? 'center' : 'stretch',
        borderBottom: `1px solid ${colors.border}`,
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}
    >
      <div
        className="custom-scroll"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '2px 2px 10px',
          flex: '1 1 520px',
          minWidth: 0,
          alignItems: 'center'
        }}
      >
        {scenarios.map((scenario) => {
          const isActive = scenario.id === activeScenarioId;
          const isBase = scenario.id === baseScenarioId;

          return (
            <div
              key={scenario.id}
              className="scenario-tab"
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '40px',
                backgroundColor: isActive
                  ? isDark
                    ? 'rgba(59, 130, 246, 0.14)'
                    : '#eff6ff'
                  : colors.card,
                border: `1px solid ${
                  isActive ? colors.primary : colors.border
                }`,
                borderRadius: '10px',
                boxShadow: isActive
                  ? '0 3px 10px rgba(59, 130, 246, 0.12)'
                  : '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition:
                  'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              <button
                type="button"
                onClick={() => onSwitchScenario(scenario.id)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  height: '100%',
                  padding: '0 8px 0 13px',
                  fontSize: '12px',
                  fontWeight: isActive ? 750 : 650,
                  lineHeight: 1,
                  backgroundColor: 'transparent',
                  color: isActive
                    ? colors.primary
                    : colors.textMuted,
                  border: 'none',
                  borderRadius: 0,
                  boxShadow: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  cursor: isActive ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  margin: 0
                }}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: colors.primary,
                      flexShrink: 0
                    }}
                  />
                )}

                <span
                  style={{
                    maxWidth: '190px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {scenario.name}
                </span>

                {isBase && (
                  <span
                    style={{
                      padding: '3px 6px',
                      borderRadius: '999px',
                      backgroundColor: isDark
                        ? 'rgba(59, 130, 246, 0.22)'
                        : '#dbeafe',
                      color: isDark ? '#93c5fd' : '#1d4ed8',
                      fontSize: '8px',
                      fontWeight: 900,
                      letterSpacing: '0.06em'
                    }}
                  >
                    BASE
                  </span>
                )}
              </button>

              <button
                type="button"
                className="scenario-tab-delete"
                onClick={() =>
                  onRequestScenarioDeletion(scenario)
                }
                disabled={isBase}
                aria-label={
                  isBase
                    ? `${scenario.name} is the base project`
                    : `Delete ${scenario.name}`
                }
                title={
                  isBase
                    ? 'Remove Base status before deleting this project'
                    : `Delete ${scenario.name}`
                }
                style={{
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  margin: '0 5px 0 1px',
                  backgroundColor: 'transparent',
                  color: isActive
                    ? colors.primary
                    : colors.textMuted,
                  border: 'none',
                  borderRadius: '7px',
                  boxShadow: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  cursor: isBase ? 'not-allowed' : 'pointer',
                  opacity: isBase ? 0.42 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition:
                    'background-color 0.15s ease, color 0.15s ease'
                }}
              >
                <svg
                  aria-hidden="true"
                  style={{
                    width: '14px',
                    height: '14px'
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={onCreateScenario}
          style={{
            height: '40px',
            padding: '0 13px',
            fontSize: '12px',
            fontWeight: 750,
            color: colors.primary,
            backgroundColor: isDark
              ? 'rgba(59, 130, 246, 0.08)'
              : '#f8fbff',
            border: `1px dashed ${
              isDark
                ? 'rgba(96, 165, 250, 0.55)'
                : '#93c5fd'
            }`,
            borderRadius: '10px',
            boxShadow: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
            margin: 0
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontSize: '17px',
              fontWeight: 800,
              lineHeight: 1
            }}
          >
            +
          </span>

          New Project
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          flexWrap: 'wrap',
          justifyContent: isMobile
            ? 'flex-start'
            : 'flex-end',
          flex: '0 1 auto'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json,application/json"
          onChange={(event) => {
            onImportJSON(event);

            // Allow the same file to be selected again later.
            event.currentTarget.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            ...actionButtonStyle,
            cursor: 'pointer'
          }}
          title="Upload your workspace JSON backup"
        >
          📥 Import JSON
        </button>

        <button
          type="button"
          onClick={onExportJSON}
          style={{
            ...actionButtonStyle,
            cursor: 'pointer'
          }}
          title="Download a backup of the workspace"
        >
          📤 Export JSON
        </button>

        <button
          type="button"
          disabled={!hasActiveScenario}
          onClick={onCloneActiveScenario}
          style={{
            ...actionButtonStyle,
            cursor: hasActiveScenario
              ? 'pointer'
              : 'not-allowed',
            opacity: hasActiveScenario ? 1 : 0.55
          }}
        >
          👯 Clone Active
        </button>
      </div>
    </div>
  );
}