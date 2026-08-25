
import ScenarioMatrix from './components/projects/ScenarioMatrix';
import ComparisonSummaryDialog from './components/projects/ComparisonSummaryDialog';
import { useUser } from './contexts/UserContext';
import ConfirmationDialog from './components/common/ConfirmationDialog';
import Toast from './components/common/Toast';
import ProjectNavigation from './components/projects/ProjectNavigation';
import AppHeader from './components/layout/AppHeader';
import EmptyWorkspace from './components/projects/EmptyWorkspace';
import ActiveProjectSummary from './components/projects/ActiveProjectSummary';
import ProjectMetrics from './components/projects/ProjectMetrics';
import ResourceList from './components/resources/ResourceList';
import GanttTimeline from './components/timeline/GanttTimeline';
import type {
  ConfirmationRequest
} from './components/common/ConfirmationDialog';

import type {
  ToastMessage
} from './components/common/Toast';
import React, { useState, useEffect, } from 'react';

import { computeScenarioTotals } from './utils/scenarioCalculations';
import { validateWorkspace } from './validation/workspaceValidation';
import type {
  Resource,
  Scenario
} from './validation/workspaceValidation';

import {
  getScenarioMarginTheme
} from './utils/marginTheme';
import {
  useProjectStore
} from './store/projectStore';
import {
  flushProjectPersistence,
  initializeProjectPersistence,
  resetProjectPersistence
} from './services/projectPersistence';
import { supabase } from './supabaseClient';


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
  const { user } = useUser();

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [signOutError, setSignOutError] =
    useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(getInitialDarkMode);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await flushProjectPersistence();
      await resetProjectPersistence();

      const { error } =
        await supabase.auth.signOut({
          scope: 'local'
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Sign out failed. Please try again.';

      setSignOutError(message);
      setIsSigningOut(false);
    }
  };
  useEffect(() => {
    void initializeProjectPersistence();
  }, []);


  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [
    comparisonSummaryOpen,
    setComparisonSummaryOpen
  ] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const state = useProjectStore();



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
  useEffect(() => {
    if (!comparisonSummaryOpen) {
      return;
    }

    if (
      !baseScenario ||
      !activeScenario ||
      activeScenario.id ===
      baseScenario.id
    ) {
      setComparisonSummaryOpen(false);
    }
  }, [
    activeScenario,
    baseScenario,
    comparisonSummaryOpen
  ]);

  const isDesktop = windowWidth >= 1180;
  const isMobile = windowWidth < 640;



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
      {comparisonSummaryOpen &&
        baseScenario &&
        activeScenario &&
        activeScenario.id !==
        baseScenario.id && (
          <ComparisonSummaryDialog
            baseScenario={baseScenario}
            currentScenario={
              activeScenario
            }
            colors={colors}
            isDark={isDark}
            isMobile={isMobile}
            onClose={() => {
              setComparisonSummaryOpen(
                false
              );
            }}
          />
        )}

      <div
        style={{
          width: '100%',
          maxWidth: '1800px',
          margin: '0 auto'
        }}
      >

        <AppHeader
          userEmail={
            user?.email ?? 'Signed-in user'
          }
          isDark={isDark}
          isMobile={isMobile}
          isSigningOut={isSigningOut}
          signOutError={signOutError}
          colors={colors}
          onToggleTheme={() =>
            setIsDark((current) => !current)
          }
          onSignOut={() => {
            void handleSignOut();
          }}
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
        {activeScenario ? (
          <main
            style={{
              display: 'grid',
              gridTemplateColumns: isDesktop
                ? 'minmax(0, 1fr) 340px'
                : 'minmax(0, 1fr)',
              gap: isMobile
                ? '20px'
                : isDesktop
                  ? '24px'
                  : '28px',
              alignItems: 'start'
            }}
          >

            {/* Left Panel: Resource Cards and Gantt Visualizer */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '20px' : '24px',
                minWidth: 0
              }}
            >
              <ActiveProjectSummary
                scenario={activeScenario}
                totals={activeTotals}
                baseTotals={baseTotals ?? null}
                marginDelta={activeMarginDelta ?? null}
                marginTheme={activeMarginTheme}
                isBase={activeIsBase}
                isDark={isDark}
                isMobile={isMobile}
                colors={colors}
                onChangeName={state.updateScenarioName}
                onChangeProjectStartDate={(date) => {
                  state.updateProjectStartDate(date);
                  triggerToast('Timeline base shifted successfully!');
                }}
                onToggleBase={() => {
                  state.setBaseScenario(
                    activeIsBase ? null : activeScenario.id
                  );

                  triggerToast(
                    activeIsBase
                      ? 'Base comparison removed. The project is editable again.'
                      : `${activeScenario.name} is now the locked base project.`
                  );
                }}
              />

              <ProjectMetrics
                totals={activeTotals}
                isMobile={isMobile}
                colors={colors}
              />
              <ResourceList
                resources={activeScenario.resources}
                isBaseLocked={activeIsBase}
                isDark={isDark}
                isMobile={isMobile}
                isWideLayout={windowWidth >= 1024}
                colors={colors}
                onAddResource={() => {
                  state.addResource();
                  triggerToast('New resource assignment added!');
                }}
                onUpdateField={state.updateResourceField}
                onUpdateAllocation={state.updateResourceAllocation}
                onUpdateDirectHours={state.updateResourceTotalHoursDirect}
                onCloneResource={(resource) => {
                  state.cloneResource(resource.id);
                  triggerToast(
                    `${resource.name || 'Resource'} cloned above the original.`
                  );
                }}
                onRequestDelete={requestResourceDeletion}
              />

              {/* Dynamic Gantt Timeline visualization */}

              <GanttTimeline projectStartDate={activeScenario.projectStartDate}
                resources={activeScenario.resources}
                isBaseLocked={activeIsBase}
                isDark={isDark}
                colors={colors}
                onUpdateResourceDates={state.updateResourceDates}
              />


            </div>


            <ScenarioMatrix
              scenarios={state.scenarios}
              activeScenarioId={
                state.activeScenarioId
              }
              baseScenarioId={
                state.baseScenarioId
              }
              isDark={isDark}
              colors={colors}
              onSwitchScenario={(scenario) => {
                state.switchScenario(
                  scenario.id
                );

                setComparisonSummaryOpen(false);

                triggerToast(
                  `Switched to ${scenario.name}`
                );
              }}
              onGenerateSummary={() => {
                if (
                  !baseScenario ||
                  !activeScenario ||
                  activeScenario.id ===
                  baseScenario.id
                ) {
                  triggerToast(
                    'Select a project other than the base before generating a comparison summary.',
                    'error'
                  );

                  return;
                }

                setComparisonSummaryOpen(true);
              }}
            />
          </main>
        ) : (
          <EmptyWorkspace
            isDark={isDark}
            isMobile={isMobile}
            colors={colors}
            onCreateProject={() => {
              state.createNewScenario();
              triggerToast('New project created!');
            }}
          />
        )}
      </div>
    </div>
  );
}