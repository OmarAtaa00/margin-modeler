
import ConfirmationDialog from './components/common/ConfirmationDialog';
import Toast from './components/common/Toast';
import ProjectNavigation from './components/projects/ProjectNavigation';
import AppHeader from './components/layout/AppHeader';
import type {
  ConfirmationRequest
} from './components/common/ConfirmationDialog';

import type {
  ToastMessage
} from './components/common/Toast';
import React, { useState, useEffect, useRef } from 'react';
import {
  addDays,

  calculateWorkingDays,
  compareDateOnly,
  dateOnlyToUtcMs,

  formatDateOnlyUtc,

  parseDateOnlyUtc
} from './utils/dates';
import {

  getResourceCapacityHours,
  getResourceDirectHours,
} from './utils/resourceCalculations';
import { computeScenarioTotals } from './utils/scenarioCalculations';
import { validateWorkspace } from './validation/workspaceValidation';
import type {
  Resource,
  Scenario
} from './validation/workspaceValidation';

import {
  formatDisplayNumber,
  roundForDisplay
} from './utils/formatting';

import {
  getScenarioMarginTheme
} from './utils/marginTheme';
import ResourceAllocationInput from './components/resources/ResourceAllocationInput';
import ResourceHoursInput from './components/resources/ResourceHoursInput';
import CustomDatePicker from './components/common/CustomDatePicker';
import {
  DEFAULT_PROJECT_START,
  useProjectStore
} from './store/projectStore';
import {
  initializeProjectPersistence
} from './services/projectPersistence';

export type { Resource, Scenario } from './validation/workspaceValidation';

const getInitialDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const savedTheme = localStorage.getItem('margin_modeler_theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
  } catch (e) {
    console.warn('Could not read theme preference:', e);
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(getInitialDarkMode);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    void initializeProjectPersistence();
  }, []);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const state = useProjectStore();

  const timelineRef = useRef<HTMLDivElement>(null);

  const [dragState, setDragState] = useState<{
    resId: string;
    type: 'shift' | 'resize-start' | 'resize-end';
    startX: number;
    initialStart: string;
    initialEnd: string;
  } | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!confirmation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmation(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmation]);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const requestScenarioDeletion = (scenario: Scenario) => {
    if (state.baseScenarioId === scenario.id) {
      triggerToast('The base project is locked. Remove its Base status before deleting it.', 'error');
      return;
    }

    setConfirmation({
      title: 'Are you sure you want to delete this project tab?',
      message: `“${scenario.name}” and all of its resource, schedule, rate, and margin data will be permanently deleted. This action cannot be undone.`,
      confirmLabel: 'Delete project',
      onConfirm: () => {
        state.deleteScenario(scenario.id);
        setConfirmation(null);
        triggerToast(`Deleted ${scenario.name}.`, 'success');
      }
    });
  };

  const requestResourceDeletion = (resource: Resource) => {
    if (state.baseScenarioId === state.activeScenarioId) {
      triggerToast('The base project is locked. Clone it to edit assignments.', 'error');
      return;
    }

    setConfirmation({
      title: 'Are you sure you want to delete this resource?',
      message: `“${resource.name}” and all of its assignment data will be permanently removed from this project. This action cannot be undone.`,
      confirmLabel: 'Delete resource',
      onConfirm: () => {
        state.removeResource(resource.id);
        setConfirmation(null);
        triggerToast(`Deleted ${resource.name}.`, 'success');
      }
    });
  };

  // Modern Premium System Colors Configuration (Independent of tailwind builds)
  const colors = {
    bg: isDark ? '#0b0f19' : '#f8fafc',
    card: isDark ? '#151c2c' : '#ffffff',
    text: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#243049' : '#e2e8f0',
    borderLight: isDark ? '#1e293b' : '#f1f5f9',
    inputBg: isDark ? '#0f1422' : '#ffffff',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    accent: '#6366f1',
    success: '#10b981',
    error: '#ef4444'
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.backgroundColor = colors.bg;

    try {
      localStorage.setItem('margin_modeler_theme', isDark ? 'dark' : 'light');
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }

    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [isDark, colors.bg]);

  const exportScenariosToJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        scenarios: state.scenarios,
        activeScenarioId: state.activeScenarioId,
        baseScenarioId: state.baseScenarioId,
        exportedAt: new Date().toISOString()
      }, null, 2));

      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `margin_modeler_scenarios_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast("Scenarios exported successfully!", "success");
    } catch (e) {
      triggerToast("Failed to export scenarios", "error");
    }
  };

  const handleJSONImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        try {
          const result = validateWorkspace(
            JSON.parse(e.target?.result as string)
          );

          if (!result.ok) {
            triggerToast(`Invalid workspace: ${result.error}`, "error");
            return;
          }

          state.setEntireState(
            result.workspace.scenarios,
            result.workspace.activeScenarioId,
            result.workspace.baseScenarioId
          );
          triggerToast("Workspace loaded successfully!", "success");
        } catch (err) {
          triggerToast("Failed to parse JSON file.", "error");
        }
      };
    }
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      if (state.baseScenarioId === state.activeScenarioId) return;
      const timelineWidth = timelineRef.current.getBoundingClientRect().width;
      const pxPerDay = (timelineWidth / 12) / 7;
      const deltaX = e.clientX - dragState.startX;
      const deltaDays = Math.round(deltaX / pxPerDay);

      if (deltaDays === 0) return;

      let newStart = dragState.initialStart;
      let newEnd = dragState.initialEnd;

      if (dragState.type === 'shift') {
        newStart = addDays(dragState.initialStart, deltaDays, dragState.initialStart);
        newEnd = addDays(dragState.initialEnd, deltaDays, dragState.initialEnd);
      } else if (dragState.type === 'resize-start') {
        const proposedStart = addDays(
          dragState.initialStart,
          deltaDays,
          dragState.initialStart
        );
        const comparison = compareDateOnly(proposedStart, newEnd);
        if (comparison !== null && comparison <= 0) {
          newStart = proposedStart;
        }
      } else if (dragState.type === 'resize-end') {
        const proposedEnd = addDays(
          dragState.initialEnd,
          deltaDays,
          dragState.initialEnd
        );
        const comparison = compareDateOnly(proposedEnd, newStart);
        if (comparison !== null && comparison >= 0) {
          newEnd = proposedEnd;
        }
      }

      state.updateResourceDates(
        dragState.resId,
        newStart,
        newEnd
      );
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  const activeScenario = state.scenarios.find(s => s.id === state.activeScenarioId) || state.scenarios[0];
  const baseScenario = state.scenarios.find(s => s.id === state.baseScenarioId) ?? null;
  const activeTotals = computeScenarioTotals(activeScenario ? activeScenario.resources : []);
  const baseTotals = baseScenario ? computeScenarioTotals(baseScenario.resources) : null;
  const activeIsBase = activeScenario?.id === state.baseScenarioId;
  const activeMarginDelta = baseTotals ? activeTotals.margin - baseTotals.margin : null;
  const activeMarginTheme = getScenarioMarginTheme(
    activeTotals.margin,
    baseTotals?.margin ?? null,
    activeIsBase,
    isDark
  );

  const isDesktop = windowWidth >= 1180;
  const isMobile = windowWidth < 640;

  const generateWeeksArray = (baseDateStr: string) => {
    const weeks: Array<{ label: string; fullDate: string }> = [];
    const validBase = parseDateOnlyUtc(baseDateStr) ??
      parseDateOnlyUtc(DEFAULT_PROJECT_START);
    if (!validBase) return weeks;

    for (let i = 0; i < 12; i++) {
      const nextWeek = new Date(validBase.getTime());
      nextWeek.setUTCDate(validBase.getUTCDate() + i * 7);
      const label = nextWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      });
      weeks.push({ label, fullDate: formatDateOnlyUtc(nextWeek) });
    }
    return weeks;
  };

  const projectWeeks = generateWeeksArray(activeScenario ? activeScenario.projectStartDate : DEFAULT_PROJECT_START);

  return (
    <div style={{
      backgroundColor: colors.bg,
      color: colors.text,
      minHeight: '100vh',
      padding: isMobile ? '14px' : windowWidth < 1024 ? '24px' : '32px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      transition: 'background-color 0.2s, color 0.2s',
      boxSizing: 'border-box',
      position: 'relative'
    }}>

      {/* Injected CSS Variables and Hover Effects */}
      <style>{`
        html, body, #root {
          width: 100%;
          min-width: 0;
          min-height: 100%;
          margin: 0 !important;
          padding: 0 !important;
        }
        body {
          display: block !important;
          place-items: initial !important;
          overflow-x: hidden;
        }
        #root {
          max-width: none !important;
          text-align: left !important;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
        button, input, select {
          font: inherit;
          margin: 0;
        }
        button {
          -webkit-appearance: none;
          appearance: none;
          box-shadow: none;
          text-transform: none;
        }
        input, select {
          box-shadow: none;
        }
        .scenario-tab {
          isolation: isolate;
        }
        .scenario-tab:hover {
          transform: translateY(-1px);
        }
        .scenario-tab-delete:hover {
          background: rgba(239, 68, 68, 0.12) !important;
          color: ${colors.error} !important;
        }
        .resource-delete-button:hover {
          background: rgba(239, 68, 68, 0.14) !important;
          border-color: rgba(239, 68, 68, 0.36) !important;
        }
        .project-name-input::placeholder {
          color: ${colors.textMuted};
        }
        button:focus-visible, input:focus-visible, select:focus-visible {
          outline: 2px solid ${colors.primary};
          outline-offset: 2px;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .hover-elevate {
          position: relative;
          z-index: 0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-elevate:hover,
        .hover-elevate:focus-within {
          z-index: 50;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
        }
        .gantt-bar:hover {
          filter: brightness(0.96);
        }
        input[type=range] {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
        }
        input[type=range]:focus {
          outline: none;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: ${colors.border};
          border-radius: 3px;
        }
        input[type=range]::-webkit-slider-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: ${colors.primary};
          cursor: pointer;
          -webkit-appearance: none;
          margin-top: -5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          transition: transform 0.1s;
        }
        input[type=range]:active::-webkit-slider-thumb {
          transform: scale(1.2);
        }
        .custom-scroll::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: ${colors.inputBg};
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: ${colors.border};
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: ${colors.textMuted};
        }
      `}</style>

      {/* State Notification Toast */}
      {toast && (
        <Toast
          toast={toast}
          isMobile={isMobile}
          successColor={colors.success}
          errorColor={colors.error}
        />
      )}

      {confirmation && (
        <ConfirmationDialog
          confirmation={confirmation}
          colors={colors}
          isDark={isDark}
          isMobile={isMobile}
          onCancel={() => setConfirmation(null)}
        />
      )}

      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        <AppHeader
          isDark={isDark}
          isMobile={isMobile}
          colors={colors}
          onToggleTheme={() => setIsDark((current) => !current)}
        />

        <ProjectNavigation
          scenarios={state.scenarios}
          activeScenarioId={state.activeScenarioId}
          baseScenarioId={state.baseScenarioId}
          hasActiveScenario={Boolean(activeScenario)}
          isDark={isDark}
          isDesktop={isDesktop}
          isMobile={isMobile}
          colors={colors}
          onSwitchScenario={state.switchScenario}
          onRequestScenarioDeletion={requestScenarioDeletion}
          onCreateScenario={() => {
            state.createNewScenario();
            triggerToast('New project created!');
          }}
          onCloneActiveScenario={() => {
            if (!activeScenario) return;

            state.cloneActiveScenario();
            triggerToast('Active project successfully cloned!');
          }}
          onImportJSON={handleJSONImport}
          onExportJSON={exportScenariosToJSON}
        />

        {/* Main Grid Body */}

        {/* Main Grid Body */}
        {activeScenario ? (
          <main style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'minmax(0, 2fr) minmax(300px, 1fr)' : 'minmax(0, 1fr)',
            gap: isMobile ? '20px' : '32px',
            alignItems: 'start'
          }}>

            {/* Left Panel: Resource Cards and Gantt Visualizer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>

              {/* Active scenario metadata base */}
              <div style={{
                backgroundColor: colors.card,
                borderRadius: '14px',
                border: `1px solid ${colors.border}`,
                padding: isMobile ? '16px' : '20px',
                boxShadow: isDark ? 'none' : '0 2px 10px rgba(15, 23, 42, 0.035)',
                position: 'relative'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: isMobile ? '16px' : '24px'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '7px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        color: colors.textMuted,
                        fontSize: '9px',
                        fontWeight: 800,
                        letterSpacing: '0.09em',
                        textTransform: 'uppercase'
                      }}>
                        Active project
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          state.setBaseScenario(activeIsBase ? null : activeScenario.id);
                          triggerToast(
                            activeIsBase
                              ? 'Base comparison removed. The project is editable again.'
                              : `${activeScenario.name} is now the locked base project.`
                          );
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          minHeight: '32px',
                          padding: '5px 10px 5px 6px',
                          borderRadius: '999px',
                          border: `1px solid ${activeIsBase ? activeMarginTheme.border : colors.border}`,
                          backgroundColor: activeIsBase ? activeMarginTheme.bg : colors.inputBg,
                          color: activeIsBase ? activeMarginTheme.text : colors.textMuted,
                          fontSize: '10px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: 'none',
                          margin: 0
                        }}
                        aria-pressed={activeIsBase}
                        title={activeIsBase ? 'Remove Base status and unlock this project' : 'Use this project as the margin comparison base'}
                      >
                        <span style={{
                          width: '28px',
                          height: '18px',
                          padding: '2px',
                          borderRadius: '999px',
                          backgroundColor: activeIsBase ? colors.primary : colors.border,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: activeIsBase ? 'flex-end' : 'flex-start',
                          boxSizing: 'border-box',
                          transition: 'all 0.18s ease'
                        }}>
                          <span style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.28)'
                          }} />
                        </span>
                        {activeIsBase ? 'Base locked' : state.baseScenarioId ? 'Make new base' : 'Set as base'}
                      </button>
                    </div>
                    <input
                      className="project-name-input"
                      type="text"
                      value={activeScenario ? activeScenario.name : ''}
                      disabled={activeIsBase}
                      onChange={(e) => state.updateScenarioName(e.target.value)}
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
                        cursor: activeIsBase ? 'not-allowed' : 'text',
                        opacity: activeIsBase ? 0.72 : 1,
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        if (!activeIsBase) e.currentTarget.style.borderBottomColor = colors.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderBottomColor = 'transparent';
                        state.updateScenarioName(e.currentTarget.value.trim() || 'Unnamed Scenario');
                      }}
                    />

                    {/* Calendar Integration */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '14px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 700 }}>Timeline starts</span>
                      <div style={{ width: isMobile ? '100%' : '164px', maxWidth: '100%' }}>
                        <CustomDatePicker
                          value={activeScenario ? activeScenario.projectStartDate : DEFAULT_PROJECT_START}
                          onChange={(date) => {
                            state.updateProjectStartDate(date);
                            triggerToast("Timeline base shifted successfully!");
                          }}
                          isDark={isDark}
                          colors={colors}
                          disabled={activeIsBase}
                        />
                      </div>
                    </div>

                    {activeIsBase && (
                      <div style={{
                        marginTop: '12px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `1px solid ${activeMarginTheme.border}`,
                        backgroundColor: activeMarginTheme.bg,
                        color: activeMarginTheme.text,
                        fontSize: '11px',
                        fontWeight: 700,
                        lineHeight: 1.45
                      }}>
                        🔒 This base project is read-only. Use Clone Active to create an editable comparison.
                      </div>
                    )}
                  </div>

                  <div style={{
                    width: isMobile ? '100%' : '168px',
                    minHeight: '88px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    textAlign: isMobile ? 'left' : 'center',
                    backgroundColor: activeMarginTheme.bg,
                    border: `1px solid ${activeMarginTheme.border}`,
                    color: activeMarginTheme.text,
                    display: 'flex',
                    flexDirection: isMobile ? 'row' : 'column',
                    alignItems: 'center',
                    justifyContent: isMobile ? 'space-between' : 'center',
                    gap: isMobile ? '12px' : '2px'
                  }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 850,
                      lineHeight: 1.3,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      opacity: 0.82
                    }}>
                      {activeIsBase ? 'Base margin' : baseTotals ? 'Compared margin' : 'Scenario margin'}
                    </span>
                    <div style={{ fontSize: '26px', lineHeight: 1, fontWeight: 900, letterSpacing: '-0.03em' }}>
                      {activeTotals.margin.toFixed(1)}%
                    </div>
                    {baseTotals && (
                      <span style={{ fontSize: '9px', fontWeight: 800, marginTop: '5px', opacity: 0.86 }}>
                        {activeIsBase
                          ? 'Comparison reference'
                          : `${activeMarginDelta !== null && activeMarginDelta >= 0 ? '+' : ''}${activeMarginDelta?.toFixed(1)} pts vs ${baseTotals.margin.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metric Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: '16px'
              }}>
                {[
                  { label: 'Effective Work Hours', value: `${formatDisplayNumber(activeTotals.totalHours)} hrs` },
                  { label: 'Calculated Cost', value: `$${activeTotals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                  { label: 'Expected Revenue', value: `$${activeTotals.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
                ].map((stat, i) => (
                  <div key={i} style={{
                    backgroundColor: colors.card,
                    borderRadius: '16px',
                    border: `1px solid ${colors.border}`,
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: colors.textMuted, letterSpacing: '0.05em' }}>{stat.label}</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Resources list container */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Resources & Assignments</h2>
                  <button
                    disabled={activeIsBase}
                    onClick={() => {
                      state.addResource();
                      triggerToast("New resource assignment added!");
                    }}
                    style={{
                      backgroundColor: colors.primary,
                      color: '#fff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: activeIsBase ? 'not-allowed' : 'pointer',
                      opacity: activeIsBase ? 0.55 : 1,
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span> Add Resource
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {!activeScenario || activeScenario.resources.length === 0 ? (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      border: `2px dashed ${colors.border}`,
                      borderRadius: '16px',
                      color: colors.textMuted
                    }}>
                      No active assignments in this scenario. Click Add Resource to begin planning.
                    </div>
                  ) : (
                    activeScenario.resources.map(r => {
                      const workingDays = calculateWorkingDays(r.startDate, r.endDate);
                      const calculatedTotalHrs = getResourceDirectHours(r);
                      const capacityHours = getResourceCapacityHours(r);
                      const resourceTotalCost = calculatedTotalHrs * r.costRate;
                      const resourceTotalBillable = calculatedTotalHrs * r.billRate;

                      return (
                        <div key={r.id} className="hover-elevate" style={{
                          backgroundColor: colors.card,
                          borderRadius: '16px',
                          border: `1px solid ${colors.border}`,
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '20px'
                        }}>

                          {/* Assignment Details */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '12px',
                            alignItems: 'end'
                          }}>
                            <div style={{ gridColumn: windowWidth >= 720 ? 'span 2' : 'auto', minWidth: 0 }}>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resource Name / Role</label>
                              <input
                                type="text"
                                value={r.name}
                                disabled={activeIsBase}
                                onChange={(e) => state.updateResourceField(r.id, 'name', e.target.value)}
                                onBlur={(e) => state.updateResourceField(r.id, 'name', e.currentTarget.value.trim() || 'Consultant')}
                                placeholder="e.g. Senior Architect"
                                style={{
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
                                  cursor: activeIsBase ? 'not-allowed' : 'text',
                                  opacity: activeIsBase ? 0.68 : 1
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Rate ($/hr)</label>
                              <input
                                type="number"
                                min="0"
                                max="10000"
                                value={r.costRate === 0 ? '' : r.costRate}
                                disabled={activeIsBase}
                                onChange={(e) => state.updateResourceField(r.id, 'costRate', e.target.value)}
                                style={{
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
                                  cursor: activeIsBase ? 'not-allowed' : 'text',
                                  opacity: activeIsBase ? 0.68 : 1
                                }}
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill Rate ($/hr)</label>
                              <input
                                type="number"
                                min="0"
                                max="10000"
                                value={r.billRate === 0 ? '' : r.billRate}
                                disabled={activeIsBase}
                                onChange={(e) => state.updateResourceField(r.id, 'billRate', e.target.value)}
                                style={{
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
                                  cursor: activeIsBase ? 'not-allowed' : 'text',
                                  opacity: activeIsBase ? 0.68 : 1
                                }}
                                placeholder="0"
                              />
                            </div>

                            {/* Upgraded DatePickers */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Start Date</label>
                              <CustomDatePicker
                                value={r.startDate}
                                onChange={(date) => state.updateResourceField(r.id, 'startDate', date)}
                                isDark={isDark}
                                colors={colors}
                                disabled={activeIsBase}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>End Date</label>
                              <CustomDatePicker
                                value={r.endDate}
                                onChange={(date) => state.updateResourceField(r.id, 'endDate', date)}
                                isDark={isDark}
                                colors={colors}
                                align="right"
                                disabled={activeIsBase}
                              />
                            </div>

                            <div style={{
                              gridColumn: windowWidth >= 720 ? 'span 2' : 'auto',
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                              gap: '12px',
                              minWidth: 0
                            }}>
                              {[
                                { label: 'Total Cost', value: resourceTotalCost },
                                { label: 'Total Billable', value: resourceTotalBillable }
                              ].map((summary) => (
                                <div key={summary.label} style={{
                                  minWidth: 0,
                                  padding: '12px 14px',
                                  borderRadius: '10px',
                                  border: `1px solid ${colors.border}`,
                                  backgroundColor: colors.inputBg,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    color: colors.textMuted,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                  }}>
                                    {summary.label}
                                  </span>
                                  <span style={{
                                    fontSize: '18px',
                                    lineHeight: 1.2,
                                    fontWeight: 850,
                                    color: colors.text,
                                    overflowWrap: 'anywhere'
                                  }}>
                                    ${summary.value.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Interactive Allocation Slider and reverse math feedback */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            flexWrap: 'wrap',
                            gap: '16px'
                          }}>
                            <div style={{ flex: 1, minWidth: '240px' }}>
                              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allocation Rate</span>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: colors.accent, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff', padding: '2px 6px', borderRadius: '4px' }}>
                                    {workingDays} weekdays · {formatDisplayNumber(capacityHours, 0)} available hrs
                                  </span>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: colors.primary }}>{formatDisplayNumber(calculatedTotalHrs)} hrs</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={roundForDisplay(r.utilization)}
                                  disabled={activeIsBase}
                                  onChange={(e) => state.updateResourceAllocation(r.id, Number(e.target.value))}
                                  style={{
                                    flex: 1,
                                    cursor: activeIsBase ? 'not-allowed' : 'pointer',
                                    opacity: activeIsBase ? 0.62 : 1
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <ResourceAllocationInput
                                    value={r.utilization}
                                    onCommit={(allocation) => state.updateResourceAllocation(r.id, allocation)}
                                    colors={colors}
                                    disabled={activeIsBase}
                                  />
                                  <span style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 700 }}>%</span>
                                </div>
                              </div>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-end',
                              gap: '8px',
                              justifyContent: isMobile ? 'space-between' : 'flex-end',
                              minWidth: isMobile ? 0 : '168px',
                              width: isMobile ? '100%' : 'auto'
                            }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '5px'
                              }}>
                                <span style={{
                                  fontSize: '9px',
                                  lineHeight: 1,
                                  fontWeight: 800,
                                  color: colors.textMuted,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.07em'
                                }}>
                                  Direct hours
                                </span>
                                <ResourceHoursInput
                                  value={calculatedTotalHrs}
                                  onCommit={(hours) => state.updateResourceTotalHoursDirect(r.id, hours)}
                                  colors={colors}
                                  max={capacityHours}
                                  disabled={activeIsBase}
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  state.cloneResource(r.id);
                                  triggerToast(`${r.name || 'Resource'} cloned above the original.`);
                                }}
                                disabled={activeIsBase}
                                aria-label={`Clone ${r.name}`}
                                title={activeIsBase ? 'The base project is locked' : `Clone ${r.name} above this assignment`}
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  padding: 0,
                                  margin: 0,
                                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.09)' : '#eff6ff',
                                  color: colors.primary,
                                  border: `1px solid ${isDark ? 'rgba(96, 165, 250, 0.28)' : '#bfdbfe'}`,
                                  borderRadius: '9px',
                                  boxShadow: 'none',
                                  cursor: activeIsBase ? 'not-allowed' : 'pointer',
                                  opacity: activeIsBase ? 0.46 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <svg style={{ width: '17px', height: '17px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 8h10a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2zm-2 8H5a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                className="resource-delete-button"
                                onClick={() => requestResourceDeletion(r)}
                                disabled={activeIsBase}
                                aria-label={activeIsBase ? `${r.name} is locked` : `Delete ${r.name}`}
                                title={activeIsBase ? 'The base project is locked' : `Delete ${r.name}`}
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  padding: 0,
                                  margin: 0,
                                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fff7f7',
                                  color: colors.error,
                                  border: `1px solid ${isDark ? 'rgba(248, 113, 113, 0.24)' : '#fecaca'}`,
                                  borderRadius: '9px',
                                  boxShadow: 'none',
                                  WebkitAppearance: 'none',
                                  appearance: 'none',
                                  cursor: activeIsBase ? 'not-allowed' : 'pointer',
                                  opacity: activeIsBase ? 0.46 : 1,
                                  transition: 'background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <svg style={{ width: '17px', height: '17px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Dynamic Gantt Timeline visualization */}
              <section style={{
                backgroundColor: colors.card,
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <svg style={{ width: '20px', height: '20px', color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {activeIsBase
                    ? 'Gantt Timeline Schedule (Base project locked)'
                    : 'Gantt Timeline Schedule (Drag to shift, drag edges to resize)'}
                </h3>

                <div style={{ overflowX: 'auto' }} className="custom-scroll">
                  <div style={{ minWidth: '600px' }} ref={timelineRef}>
                    {/* Calendar Weeks Header Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(12, 1fr)',
                      gap: '4px',
                      textAlign: 'center',
                      borderBottom: `1px solid ${colors.border}`,
                      paddingBottom: '10px',
                      marginBottom: '10px'
                    }}>
                      {projectWeeks.map((week, i) => (
                        <span key={i} style={{ fontSize: '11px', fontWeight: 800, color: colors.textMuted }}>
                          {week.label}
                        </span>
                      ))}
                    </div>

                    {/* Dynamic Timeline Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>

                      {/* Vertical Grid Lines */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(12, 1fr)',
                        gap: '4px',
                        pointerEvents: 'none'
                      }}>
                        {Array.from({ length: 12 }, (_, i) => (
                          <div key={i} style={{
                            borderRight: `1px dashed ${colors.borderLight}`,
                            height: '100%'
                          }} />
                        ))}
                      </div>

                      {!activeScenario || activeScenario.resources.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: colors.textMuted, zIndex: 1 }}>
                          No assignments present.
                        </div>
                      ) : (
                        activeScenario.resources.map(r => {
                          const projStartMs = dateOnlyToUtcMs(
                            activeScenario.projectStartDate
                          );
                          const rStartMs = dateOnlyToUtcMs(r.startDate);
                          const rEndMs = dateOnlyToUtcMs(r.endDate);
                          const totalDurationMs = 12 * 7 * 24 * 60 * 60 * 1000;

                          if (
                            projStartMs === null ||
                            rStartMs === null ||
                            rEndMs === null
                          ) {
                            return null;
                          }

                          const inclusiveEndMs = rEndMs + 24 * 60 * 60 * 1000;
                          const startPct = Math.max(0, ((rStartMs - projStartMs) / totalDurationMs) * 100);
                          const endPct = Math.min(100, ((inclusiveEndMs - projStartMs) / totalDurationMs) * 100);
                          const widthPct = Math.max(2, endPct - startPct);

                          const isVisible = startPct < 100 && endPct > 0;

                          return (
                            <div key={r.id} style={{
                              height: '34px',
                              position: 'relative',
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              zIndex: 1
                            }}>
                              {isVisible ? (
                                <div
                                  className="gantt-bar"
                                  style={{
                                    position: 'absolute',
                                    left: `${startPct}%`,
                                    width: `${widthPct}%`,
                                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff',
                                    border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : '#c7d2fe'}`,
                                    borderRadius: '6px',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0 4px',
                                    boxSizing: 'border-box',
                                    transition: dragState?.resId === r.id ? 'none' : 'all 0.2s ease',
                                    cursor: activeIsBase ? 'default' : (dragState?.resId === r.id ? 'grabbing' : 'grab'),
                                    opacity: activeIsBase ? 0.78 : 1,
                                    userSelect: 'none'
                                  }}
                                  onMouseDown={(e) => {
                                    if (activeIsBase) return;

                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const edgeThreshold = 10;

                                    let dragType: 'shift' | 'resize-start' | 'resize-end' = 'shift';
                                    if (clickX < edgeThreshold) {
                                      dragType = 'resize-start';
                                    } else if (rect.width - clickX < edgeThreshold) {
                                      dragType = 'resize-end';
                                    }

                                    setDragState({
                                      resId: r.id,
                                      type: dragType,
                                      startX: e.clientX,
                                      initialStart: r.startDate,
                                      initialEnd: r.endDate
                                    });
                                    e.preventDefault();
                                  }}
                                >
                                  {/* Left resize handle */}
                                  <div style={{
                                    width: '4px',
                                    height: '50%',
                                    borderRadius: '2px',
                                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.4)' : '#818cf8',
                                    cursor: activeIsBase ? 'default' : 'ew-resize'
                                  }} />

                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: isDark ? '#a5b4fc' : '#4338ca',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    margin: '0 4px',
                                    flex: 1,
                                    textAlign: 'center',
                                    pointerEvents: 'none'
                                  }}>
                                    {r.name || 'Consultant'} ({formatDisplayNumber(r.utilization)}%)
                                  </span>

                                  {/* Right resize handle */}
                                  <div style={{
                                    width: '4px',
                                    height: '50%',
                                    borderRadius: '2px',
                                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.4)' : '#818cf8',
                                    cursor: activeIsBase ? 'default' : 'ew-resize'
                                  }} />
                                </div>
                              ) : (
                                <div style={{ fontSize: '10px', color: colors.textMuted, fontStyle: 'italic', paddingLeft: '8px' }}>
                                  Timeline out of 12-week boundaries
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Panel: Comparative Matrix Board */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
              <div style={{
                backgroundColor: colors.card,
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                padding: '24px',
                boxShadow: '0 4px 18px -4px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Scenario Matrix Comparison
                  </h3>
                  <p style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px', margin: 0 }}>
                    {baseTotals
                      ? 'Green margins meet or beat the base. Red margins are below the base.'
                      : 'Set one project as Base to enable green/red margin comparison.'}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {state.scenarios.map(s => {
                    const totals = computeScenarioTotals(s.resources);
                    const isCurrent = s.id === state.activeScenarioId;
                    const isBase = s.id === state.baseScenarioId;
                    const marginDelta = baseTotals ? totals.margin - baseTotals.margin : null;
                    const matrixTheme = getScenarioMarginTheme(
                      totals.margin,
                      baseTotals?.margin ?? null,
                      isBase,
                      isDark
                    );

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          state.switchScenario(s.id);
                          triggerToast(`Switched to ${s.name}`);
                        }}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: `1px solid ${isCurrent ? colors.primary : baseTotals ? matrixTheme.border : colors.border}`,
                          backgroundColor: isCurrent ? (isDark ? 'rgba(59, 130, 246, 0.08)' : '#eff6ff') : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ overflow: 'hidden', marginRight: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                            {isCurrent && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.primary }} />}
                            {isBase && (
                              <span style={{
                                padding: '2px 5px',
                                borderRadius: '999px',
                                backgroundColor: matrixTheme.badge,
                                color: matrixTheme.text,
                                fontSize: '8px',
                                fontWeight: 900,
                                letterSpacing: '0.06em'
                              }}>BASE</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10px', color: colors.textMuted }}>Cost: ${Math.round(totals.totalCost).toLocaleString()}</span>
                            <span style={{ fontSize: '10px', color: colors.textMuted }}>Rev: ${Math.round(totals.totalRevenue).toLocaleString()}</span>
                            {baseTotals && (
                              <span style={{ fontSize: '10px', color: matrixTheme.text, fontWeight: 800 }}>
                                {isBase
                                  ? 'Reference'
                                  : `${marginDelta !== null && marginDelta >= 0 ? '+' : ''}${marginDelta?.toFixed(1)} pts`}
                              </span>
                            )}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: matrixTheme.badge,
                          color: matrixTheme.text
                        }}>
                          {totals.margin.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#eff6ff',
                  border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : '#bfdbfe'}`,
                  color: isDark ? '#93c5fd' : '#1e3a8a'
                }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>Workday Math Mechanics</h4>
                  <p style={{ fontSize: '11px', lineHeight: 1.5, margin: 0 }}>
                    Calculated working days skip Saturdays and Sundays. Each scheduled business day represents 8 base hours. Changing project schedules instantly updates assignments, revenues, and scenario profit metrics.
                  </p>
                </div>
              </div>
            </div>

          </main>
        ) : (
          <section style={{
            minHeight: '420px',
            borderRadius: '18px',
            border: `1px dashed ${colors.border}`,
            backgroundColor: colors.card,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '28px 20px' : '48px',
            textAlign: 'center'
          }}>
            <div style={{ maxWidth: '480px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 18px',
                borderRadius: '16px',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.14)' : '#dbeafe',
                color: colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg aria-hidden="true" style={{ width: '28px', height: '28px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>No project tabs yet</h2>
              <p style={{
                margin: '10px 0 22px',
                color: colors.textMuted,
                fontSize: '13px',
                lineHeight: 1.65
              }}>
                Your workspace is empty. Create a new project to start planning resources, schedules, pricing, and margins.
              </p>
              <button
                type="button"
                onClick={() => {
                  state.createNewScenario();
                  triggerToast('New project created!');
                }}
                style={{
                  padding: '11px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: colors.primary,
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                }}
              >
                + Create project
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}