import React, { useState, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';
import {
  addDays,
  addWeeks,
  calculateWorkingDays,
  compareDateOnly,
  dateOnlyToUtcMs,
  differenceInCalendarDays,
  formatDateOnlyUtc,
  getMonday,
  parseDateOnlyUtc
} from './utils/dates';
import {
  clampAllocation,
  getResourceCapacityHours,
  getResourceDirectHours,
  synchronizeResourceFromAllocation,
  synchronizeResourceFromHours
} from './utils/resourceCalculations';
import { validateWorkspace } from './validation/workspaceValidation';
import type {
  PersistedWorkspace,
  Resource,
  Scenario
} from './validation/workspaceValidation';

export type { Resource, Scenario } from './validation/workspaceValidation';

type ProjectState = {
  activeScenarioId: string;
  baseScenarioId: string | null;
  scenarios: Scenario[];
  switchScenario: (id: string) => void;
  createNewScenario: () => void;
  cloneActiveScenario: () => void;
  setBaseScenario: (id: string | null) => void;
  deleteScenario: (id: string) => void;
  updateScenarioName: (name: string) => void;
  updateProjectStartDate: (date: string) => void;
  addResource: () => void;
  cloneResource: (id: string) => void;
  removeResource: (id: string) => void;
  updateResourceField: (resId: string, field: keyof Resource, value: any) => void;
  updateResourceAllocation: (resId: string, value: number) => void;
  updateResourceTotalHoursDirect: (resId: string, hours: number) => void;
  updateResourceDates: (resId: string, startDate: string, endDate: string) => void;
  setEntireState: (
    scenarios: Scenario[],
    activeScenarioId: string,
    baseScenarioId?: string | null
  ) => void;
};

const roundForDisplay = (value: number, fractionDigits = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** fractionDigits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const formatEditableNumber = (value: number, fractionDigits = 2): string =>
  String(roundForDisplay(value, fractionDigits));

const formatDisplayNumber = (value: number, fractionDigits = 2): string =>
  roundForDisplay(value, fractionDigits).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  });

// Default initial date set to the Monday of current context (July 13, 2026)
const DEFAULT_PROJECT_START = "2026-07-13";

// Standard team configurations mapped to realistic calendar timelines
const defaultResources: Resource[] = [
  { 
    id: '1', 
    name: 'Ahmed', 
    costRate: 60, 
    billRate: 250, 
    startDate: '2026-07-13', 
    endDate: '2026-09-18', // 10 weeks
    utilization: 100 
  },
  { 
    id: '2', 
    name: 'Mohamed', 
    costRate: 50, 
    billRate: 150, 
    startDate: '2026-07-13', 
    endDate: '2026-10-02', // 12 weeks
    utilization: 100 
  },
  { 
    id: '3', 
    name: 'Omar', 
    costRate: 40, 
    billRate: 200, 
    startDate: '2026-07-20', // Week 2 start
    endDate: '2026-10-02', // 11 weeks
    utilization: 100 
  }
];

const LOCAL_STORAGE_KEY = 'margin_modeler_local_workspace';
const NATIVE_STORE_FILE = 'margin-modeler-store.json';
const NATIVE_BACKUP_STORE_FILE =
  'margin-modeler-store.backup.json';

const NATIVE_WORKSPACE_KEY = 'workspace';

const normalizeWorkspace = (
  value: unknown
): PersistedWorkspace | null => {
  const result = validateWorkspace(value);
  return result.ok ? result.workspace : null;
};
const cloneWorkspace = (
  workspace: PersistedWorkspace
): PersistedWorkspace => {
  return JSON.parse(
    JSON.stringify(workspace)
  ) as PersistedWorkspace;
};

const saveLocalStorageBackup = (
  workspace: PersistedWorkspace
): void => {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(workspace)
    );
  } catch (error) {
    console.error('Local storage backup failed:', error);
  }
};


const getInitialState = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const result = validateWorkspace(JSON.parse(saved));
      if (result.ok) {
        return result.workspace;
      }

      console.warn(
        `Local workspace was rejected: ${result.error}`
      );
    }
  } catch (e) {
    console.warn("Could not load local storage data, using fallback defaults:", e);
  }

  // Fallback defaults
  return {
    activeScenarioId: 'scen-1',
    baseScenarioId: null,
    scenarios: [
      {
        id: 'scen-1',
        name: 'Scenario 1 (Base Plan)',
        projectStartDate: DEFAULT_PROJECT_START,
        resources: JSON.parse(JSON.stringify(defaultResources))
      },
      {
        id: 'scen-2',
        name: 'Scenario 2 (Draft Opt.)',
        projectStartDate: DEFAULT_PROJECT_START,
        resources: [
          { id: '1', name: 'Ahmed', costRate: 60, billRate: 250, startDate: '2026-07-13', endDate: '2026-09-04', utilization: 100 },
          { id: '2', name: 'Mohamed', costRate: 50, billRate: 150, startDate: '2026-07-13', endDate: '2026-10-02', utilization: 50 },
          { id: '3', name: 'Omar', costRate: 40, billRate: 200, startDate: '2026-07-20', endDate: '2026-10-02', utilization: 80 }
        ]
      }
    ]
  };
};

const initialState = getInitialState();

const isActiveScenarioLocked = (state: Pick<ProjectState, 'activeScenarioId' | 'baseScenarioId'>): boolean =>
  state.baseScenarioId !== null && state.activeScenarioId === state.baseScenarioId;

const createResourceId = (): string =>
  `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useProjectStore = create<ProjectState>((set) => ({
  activeScenarioId: initialState.activeScenarioId,
  baseScenarioId: initialState.baseScenarioId,
  scenarios: initialState.scenarios,

  switchScenario: (id) => set({ activeScenarioId: id }),

  createNewScenario: () => set((state) => {
    const id = `scen-${Date.now()}`;
    const newScenario: Scenario = {
      id,
      name: `Scenario ${state.scenarios.length + 1}`,
      projectStartDate: DEFAULT_PROJECT_START,
      resources: JSON.parse(JSON.stringify(defaultResources))
    };
    return {
      scenarios: [...state.scenarios, newScenario],
      activeScenarioId: id
    };
  }),

  cloneActiveScenario: () => set((state) => {
    const active = state.scenarios.find(s => s.id === state.activeScenarioId) || state.scenarios[0];
    if (!active) return state;
    const id = `scen-${Date.now()}`;
    const clonedScenario: Scenario = {
      id,
      name: `${active.name} (Copy)`,
      projectStartDate: active.projectStartDate,
      resources: active.resources.map((resource) => ({
        ...resource,
        id: createResourceId()
      }))
    };
    return {
      scenarios: [...state.scenarios, clonedScenario],
      activeScenarioId: id
    };
  }),

  setBaseScenario: (id) => set((state) => {
    if (id === null) {
      return { baseScenarioId: null };
    }

    if (!state.scenarios.some((scenario) => scenario.id === id)) {
      return state;
    }

    return { baseScenarioId: id };
  }),

  deleteScenario: (id) => set((state) => {
    if (state.baseScenarioId === id) return state;
    const indexToDelete = state.scenarios.findIndex(s => s.id === id);
    if (indexToDelete === -1) return state;

    const remainingScenarios = state.scenarios.filter(s => s.id !== id);
    let activeScenarioId = state.activeScenarioId;

    if (state.activeScenarioId === id) {
      activeScenarioId = remainingScenarios.length > 0
        ? remainingScenarios[Math.min(indexToDelete, remainingScenarios.length - 1)].id
        : '';
    }

    return {
      scenarios: remainingScenarios,
      activeScenarioId
    };
  }),

  updateScenarioName: (name) => set((state) => {
    if (isActiveScenarioLocked(state)) return state;

    const editableName = String(name).slice(0, 50);
    return {
      scenarios: state.scenarios.map(s => s.id === state.activeScenarioId ? { ...s, name: editableName } : s)
    };
  }),

  updateProjectStartDate: (date) => set((state) => {
    if (isActiveScenarioLocked(state)) return state;

    try {
      if (!parseDateOnlyUtc(date)) return {};

      const adjustedDate = getMonday(date, DEFAULT_PROJECT_START);
      return {
        scenarios: state.scenarios.map(s => {
          if (s.id !== state.activeScenarioId) return s;

          const differenceDays = differenceInCalendarDays(
            adjustedDate,
            s.projectStartDate
          );
          if (differenceDays === null) return s;

          const updatedResources = s.resources.map(r => {
            const currentDirectHours = getResourceDirectHours(r);
            const shiftedResource = {
              ...r,
              startDate: addDays(r.startDate, differenceDays, r.startDate),
              endDate: addDays(r.endDate, differenceDays, r.endDate)
            };
            return synchronizeResourceFromHours(
              shiftedResource,
              currentDirectHours
            );
          });

          return {
            ...s,
            projectStartDate: adjustedDate,
            resources: updatedResources
          };
        })
      };
    } catch (e) {
      console.error("Failed project start date update:", e);
      return {};
    }
  }),

  addResource: () => set((state) => {
    if (isActiveScenarioLocked(state)) return state;

    return {
      scenarios: state.scenarios.map(s => {
        if (s.id !== state.activeScenarioId) return s;
        const newRes = synchronizeResourceFromAllocation<Resource>({
          id: createResourceId(),
          name: `Consultant ${s.resources.length + 1}`,
          costRate: 45,
          billRate: 150,
          startDate: s.projectStartDate,
          endDate: addWeeks(s.projectStartDate, 12, DEFAULT_PROJECT_START),
          utilization: 100
        }, 100);
        return { ...s, resources: [newRes, ...s.resources] };
      })
    };
  }),

  cloneResource: (id) => set((state) => {
    if (isActiveScenarioLocked(state)) return state;

    return {
      scenarios: state.scenarios.map((scenario) => {
        if (scenario.id !== state.activeScenarioId) return scenario;

        const sourceIndex = scenario.resources.findIndex((resource) => resource.id === id);
        if (sourceIndex === -1) return scenario;

        const source = scenario.resources[sourceIndex];
        const clonedResource: Resource = {
          ...source,
          id: createResourceId(),
          name: `${source.name || 'Consultant'} (Copy)`
        };

        const resources = [...scenario.resources];
        resources.splice(sourceIndex, 0, clonedResource);
        return { ...scenario, resources };
      })
    };
  }),

  removeResource: (id) => set((state) => {
    if (isActiveScenarioLocked(state)) return state;

    return {
      scenarios: state.scenarios.map(s => {
        if (s.id !== state.activeScenarioId) return s;
        return { ...s, resources: s.resources.filter(r => r.id !== id) };
      })
    };
  }),

  updateResourceField: (resId, field, value) => set((state) => {
    if (isActiveScenarioLocked(state)) return state;

    return {
      scenarios: state.scenarios.map(s => {
      if (s.id !== state.activeScenarioId) return s;
      return {
        ...s,
        resources: s.resources.map(r => {
          if (r.id !== resId) return r;

          let validatedValue = value;

          if (field === 'name') {
            validatedValue = String(value).slice(0, 50);
          } else if (field === 'costRate' || field === 'billRate') {
            const num = Number(value);
            validatedValue = isNaN(num) ? 0 : Math.min(10000, Math.max(0, num));
          }

          const updated = { ...r, [field]: validatedValue };

          if (field === 'startDate' || field === 'endDate') {
            const currentDirectHours = getResourceDirectHours(r);
            try {
              const dateComparison = compareDateOnly(
                updated.startDate,
                updated.endDate
              );

              if (dateComparison === null) {
                updated.startDate = r.startDate;
                updated.endDate = r.endDate;
              } else if (dateComparison > 0) {
                if (field === 'startDate') updated.endDate = updated.startDate;
                else updated.startDate = updated.endDate;
              }
            } catch (err) {
              updated.startDate = r.startDate;
              updated.endDate = r.endDate;
            }
            return synchronizeResourceFromHours(
              updated,
              currentDirectHours
            );
          }
          return updated;
        })
      };
    })
    };
  }),

  updateResourceAllocation: (resId, value) => set((state) => {
    if (isActiveScenarioLocked(state)) return state;

    return {
      scenarios: state.scenarios.map(s => {
      if (s.id !== state.activeScenarioId) return s;
      return {
        ...s,
        resources: s.resources.map(r =>
          r.id === resId
            ? synchronizeResourceFromAllocation(r, value)
            : r
        )
      };
    })
    };
  }),

  updateResourceTotalHoursDirect: (resId, hours) => set((state) => {
    if (isActiveScenarioLocked(state)) return state;

    return {
      scenarios: state.scenarios.map(s => {
      if (s.id !== state.activeScenarioId) return s;
      return {
        ...s,
        resources: s.resources.map(r =>
          r.id === resId
            ? synchronizeResourceFromHours(r, hours)
            : r
        )
      };
    })
    };
  }),

  updateResourceDates: (resId, startDate, endDate) => set((state) => {
    if (isActiveScenarioLocked(state)) return state;

    return {
      scenarios: state.scenarios.map(s => {
      if (s.id !== state.activeScenarioId) return s;
      return {
        ...s,
        resources: s.resources.map(r => {
          if (r.id !== resId) return r;
          const dateComparison = compareDateOnly(startDate, endDate);
          if (dateComparison === null || dateComparison > 0) return r;

          const currentDirectHours = getResourceDirectHours(r);
          return synchronizeResourceFromHours(
            { ...r, startDate, endDate },
            currentDirectHours
          );
        })
      };
    })
    };
  }),

  setEntireState: (scenarios, activeScenarioId, baseScenarioId = null) =>
    set({ scenarios, activeScenarioId, baseScenarioId })
}));

// // Setup auto-save listener on local memory
// useProjectStore.subscribe((state) => {
//   try {
//     localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
//       scenarios: state.scenarios,
//       activeScenarioId: state.activeScenarioId
//     }));
//   } catch (e) {
//     console.error("Local storage persistent save failed:", e);
//   }
// });
// let persistencePromise: Promise<void> | null = null;
// let stopPersistence: (() => void) | null = null;

// export const initializeProjectPersistence =
//   (): Promise<void> => {
//     if (persistencePromise) {
//       return persistencePromise;
//     }

//     persistencePromise = (async () => {
//       const currentState = useProjectStore.getState();

//       let workspace: PersistedWorkspace = {
//         scenarios: currentState.scenarios,
//         activeScenarioId: currentState.activeScenarioId
//       };

//       try {
//         const store = await load(NATIVE_STORE_FILE, {
//           autoSave: 200,
//           defaults: {}
//         });

//         const savedWorkspace = normalizeWorkspace(
//           await store.get<unknown>(NATIVE_WORKSPACE_KEY)
//         );

//         if (savedWorkspace) {
//           // Native data exists, so it becomes the main data source.
//           workspace = savedWorkspace;

//           useProjectStore.getState().setEntireState(
//             savedWorkspace.scenarios,
//             savedWorkspace.activeScenarioId
//           );
//         } else {
//           // No native data yet. Migrate the current localStorage
//           // data or defaults into the native store.
//           await store.set(
//             NATIVE_WORKSPACE_KEY,
//             workspace
//           );

//           await store.save();
//         }

//         // Keep localStorage temporarily as a recovery copy.
//         saveLocalStorageBackup(workspace);

//         stopPersistence?.();

//         stopPersistence = useProjectStore.subscribe(
//           (state) => {
//             const nextWorkspace: PersistedWorkspace = {
//               scenarios: state.scenarios,
//               activeScenarioId: state.activeScenarioId
//             };

//             saveLocalStorageBackup(nextWorkspace);

//             void store
//               .set(
//                 NATIVE_WORKSPACE_KEY,
//                 nextWorkspace
//               )
//               .catch((error) => {
//                 console.error(
//                   'Native workspace save failed:',
//                   error
//                 );
//               });
//           }
//         );
//       } catch (error) {
//         console.error(
//           'Native store could not be initialized. Falling back to localStorage:',
//           error
//         );

//         // This keeps browser-only development working even when
//         // the application is not running inside Tauri.
//         stopPersistence?.();

//         stopPersistence = useProjectStore.subscribe(
//           (state) => {
//             saveLocalStorageBackup({
//               scenarios: state.scenarios,
//               activeScenarioId: state.activeScenarioId
//             });
//           }
//         );
//       }
//     })();

//     return persistencePromise;
//   };
let persistencePromise: Promise<void> | null = null;
let stopPersistence: (() => void) | null = null;
let saveQueue: Promise<void> = Promise.resolve();

export const initializeProjectPersistence =
  (): Promise<void> => {
    if (persistencePromise) {
      return persistencePromise;
    }

    persistencePromise = (async () => {
      const currentState = useProjectStore.getState();

      let workspace: PersistedWorkspace = {
        scenarios: currentState.scenarios,
        activeScenarioId: currentState.activeScenarioId,
        baseScenarioId: currentState.baseScenarioId
      };

      try {
        const [store, backupStore] = await Promise.all([
          load(NATIVE_STORE_FILE, {
            autoSave: false,
            defaults: {}
          }),

          load(NATIVE_BACKUP_STORE_FILE, {
            autoSave: false,
            defaults: {}
          })
        ]);

        const savedWorkspace = normalizeWorkspace(
          await store.get<unknown>(
            NATIVE_WORKSPACE_KEY
          )
        );

        const backupWorkspace = normalizeWorkspace(
          await backupStore.get<unknown>(
            NATIVE_WORKSPACE_KEY
          )
        );

        if (savedWorkspace) {
          // The primary native store is valid.
          workspace = savedWorkspace;
        } else if (backupWorkspace) {
          // The primary store is missing or invalid.
          // Recover automatically from the backup.
          workspace = backupWorkspace;

          console.warn(
            'Primary workspace was unavailable. ' +
            'The backup workspace was restored.'
          );
        }

        useProjectStore.getState().setEntireState(
          workspace.scenarios,
          workspace.activeScenarioId,
          workspace.baseScenarioId
        );

        // Ensure the primary store contains valid data.
        await store.set(
          NATIVE_WORKSPACE_KEY,
          cloneWorkspace(workspace)
        );

        await store.save();

        // Create the initial backup only when one
        // does not already exist.
        if (!backupWorkspace) {
          await backupStore.set(
            NATIVE_WORKSPACE_KEY,
            cloneWorkspace(workspace)
          );

          await backupStore.save();
        }

        // Keep localStorage temporarily as another
        // migration/recovery copy.
        saveLocalStorageBackup(workspace);

        let lastSavedWorkspace =
          cloneWorkspace(workspace);

        stopPersistence?.();

        stopPersistence = useProjectStore.subscribe(
          (state) => {
            const nextWorkspace = cloneWorkspace({
              scenarios: state.scenarios,
              activeScenarioId: state.activeScenarioId,
              baseScenarioId: state.baseScenarioId
            });

            saveLocalStorageBackup(nextWorkspace);

            /*
             * Queue saves so that rapid edits cannot write
             * the files out of order.
             *
             * First:
             *   previous valid state -> backup
             *
             * Then:
             *   newest state -> primary
             */
            saveQueue = saveQueue
              .then(async () => {
                await backupStore.set(
                  NATIVE_WORKSPACE_KEY,
                  lastSavedWorkspace
                );

                await backupStore.save();

                await store.set(
                  NATIVE_WORKSPACE_KEY,
                  nextWorkspace
                );

                await store.save();

                lastSavedWorkspace =
                  cloneWorkspace(nextWorkspace);
              })
              .catch((error) => {
                console.error(
                  'Native workspace save failed:',
                  error
                );
              });
          }
        );
      } catch (error) {
        console.error(
          'Native stores could not be initialized. ' +
          'Falling back to localStorage:',
          error
        );

        stopPersistence?.();

        stopPersistence = useProjectStore.subscribe(
          (state) => {
            saveLocalStorageBackup({
              scenarios: state.scenarios,
              activeScenarioId: state.activeScenarioId,
              baseScenarioId: state.baseScenarioId
            });
          }
        );
      }
    })();

    return persistencePromise;
  };

export const flushProjectPersistence =
  async (): Promise<void> => {
    await initializeProjectPersistence();
    await saveQueue;
  };

const computeScenarioTotals = (resourcesList: Resource[]) => {
  let totalHours = 0;
  let totalCost = 0;
  let totalRevenue = 0;

  if (!resourcesList || !Array.isArray(resourcesList)) {
    return { totalHours, totalCost, totalRevenue, margin: 0 };
  }

  resourcesList.forEach(r => {
    try {
      const effectiveHours = getResourceDirectHours(r);

      totalHours += effectiveHours;
      totalCost += effectiveHours * (r.costRate || 0);
      totalRevenue += effectiveHours * (r.billRate || 0);
    } catch (e) {
      console.error("Calculation safeguard triggered:", e);
    }
  });

  const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  return {
    totalHours,
    totalCost,
    totalRevenue,
    margin
  };
};

const getMarginTheme = (margin: number, isDark: boolean) => {
  if (margin >= 50) {
    return {
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
      border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
      text: isDark ? '#34d399' : '#047857',
      badge: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5'
    };
  } else if (margin >= 35) {
    return {
      bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
      border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
      text: isDark ? '#fbbf24' : '#b45309',
      badge: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7'
    };
  } else {
    return {
      bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
      text: isDark ? '#f87171' : '#b91c1c',
      badge: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'
    };
  }
};

const getScenarioMarginTheme = (
  margin: number,
  baseMargin: number | null,
  isBaseScenario: boolean,
  isDark: boolean
) => {
  if (baseMargin === null) {
    return getMarginTheme(margin, isDark);
  }

  if (isBaseScenario) {
    return {
      bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      border: isDark ? 'rgba(96, 165, 250, 0.35)' : '#bfdbfe',
      text: isDark ? '#93c5fd' : '#1d4ed8',
      badge: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe'
    };
  }

  if (margin >= baseMargin) {
    return {
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
      border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
      text: isDark ? '#34d399' : '#047857',
      badge: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5'
    };
  }

  return {
    bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
    text: isDark ? '#f87171' : '#b91c1c',
    badge: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'
  };
};

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  isDark: boolean;
  colors: any;
  align?: 'left' | 'right';
  disabled?: boolean;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  isDark,
  colors,
  align = 'left',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverLayout, setPopoverLayout] = useState({ left: 0, width: 280 });
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePicker = () => {
    if (disabled) return;

    if (!isOpen && containerRef.current && typeof window !== 'undefined') {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportPadding = 12;
      const width = Math.min(280, window.innerWidth - viewportPadding * 2);
      let left = align === 'right' ? rect.width - width : 0;
      const absoluteLeft = rect.left + left;

      if (absoluteLeft < viewportPadding) {
        left += viewportPadding - absoluteLeft;
      }
      if (rect.left + left + width > window.innerWidth - viewportPadding) {
        left -= rect.left + left + width - (window.innerWidth - viewportPadding);
      }

      setPopoverLayout({ left, width });
    }
    setIsOpen((open) => !open);
  };

  const dateObj = parseDateOnlyUtc(value);
  const validDateObj = dateObj ?? new Date();

  const [viewYear, setViewYear] = useState(validDateObj.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(validDateObj.getUTCMonth());

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const date = parseDateOnlyUtc(value);
    if (date) {
      setViewYear(date.getUTCFullYear());
      setViewMonth(date.getUTCMonth());
    }
  }, [value]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years: number[] = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 10; y++) {
    years.push(y);
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  };

  const getFirstDayOffset = (year: number, month: number) => {
    return new Date(Date.UTC(year, month, 1)).getUTCDay();
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOffset(viewYear, viewMonth);

  const daysGrid = [];
  for (let i = 0; i < firstDayOffset; i++) {
    daysGrid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysGrid.push(day);
  }

  const handleDaySelect = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const selectedDate = `${viewYear}-${formattedMonth}-${formattedDay}`;
    onChange(selectedDate);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const displayLabel = validDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={togglePicker}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Choose date. Current date: ${displayLabel}`}
        disabled={disabled}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.inputBg,
          color: colors.text,
          fontSize: '13px',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.68 : 1,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease, box-shadow 0.15s',
          WebkitAppearance: 'none',
          appearance: 'none',
          boxShadow: 'none',
          margin: 0,
          minHeight: '38px'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <svg
          style={{ width: '16px', height: '16px', color: colors.textMuted, marginLeft: '6px', flexShrink: 0 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: `${popoverLayout.left}px`,
            zIndex: 10000,
            width: `${popoverLayout.width}px`,
            maxWidth: 'calc(100vw - 24px)',
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
            padding: '12px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '4px' }}>
            <button
              onClick={handlePrevMonth}
              type="button"
              style={{
                border: 'none',
                background: 'transparent',
                color: colors.text,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div style={{ display: 'flex', gap: '4px' }}>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              type="button"
              style={{
                border: 'none',
                background: 'transparent',
                color: colors.text,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '6px' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(dayName => (
              <span key={dayName} style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted }}>
                {dayName}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const formattedMonth = String(viewMonth + 1).padStart(2, '0');
              const formattedDay = String(day).padStart(2, '0');
              const currentDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;
              const isSelected = currentDateStr === value;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => handleDaySelect(day)}
                  type="button"
                  style={{
                    padding: '6px 0',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    color: isSelected ? '#ffffff' : colors.text,
                    fontSize: '11px',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface ResourceAllocationInputProps {
  value: number;
  onCommit: (allocation: number) => void;
  colors: any;
  disabled?: boolean;
}

const ResourceAllocationInput: React.FC<ResourceAllocationInputProps> = ({
  value,
  onCommit,
  colors,
  disabled = false
}) => {
  const formattedValue = formatEditableNumber(value);
  const [draft, setDraft] = useState(formattedValue);

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      onCommit(clampAllocation(parsed));
    } else {
      setDraft(formattedValue);
    }
  };

  return (
    <input
      type="number"
      min="0"
      max="100"
      step="0.01"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(formattedValue);
          event.currentTarget.blur();
        }
      }}
      className="compact-number-input"
      style={{
        width: '64px',
        height: '38px',
        padding: '0 7px',
        margin: 0,
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 700,
        lineHeight: 1,
        borderRadius: '9px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.inputBg,
        color: colors.text,
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.68 : 1,
        outline: 'none',
        boxShadow: 'none'
      }}
      aria-label="Allocation percentage input"
    />
  );
};

interface ResourceHoursInputProps {
  value: number;
  onCommit: (hours: number) => void;
  colors: any;
  max: number;
  disabled?: boolean;
}

const ResourceHoursInput: React.FC<ResourceHoursInputProps> = ({ value, onCommit, colors, max, disabled = false }) => {
  const formattedValue = formatEditableNumber(value);
  const [draft, setDraft] = useState(formattedValue);

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onCommit(parsed);
    } else {
      setDraft(formattedValue);
    }
  };

  return (
    <input
      type="number"
      min="0"
      max={max}
      step="0.01"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(formattedValue);
          e.currentTarget.blur();
        }
      }}
      className="compact-number-input"
      style={{
        width: '86px',
        height: '38px',
        padding: '0 10px',
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: 700,
        lineHeight: 1,
        borderRadius: '9px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.inputBg,
        color: colors.text,
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.68 : 1,
        outline: 'none',
        boxShadow: 'none',
        margin: 0
      }}
      aria-label="Direct hours input"
      placeholder="Hours"
    />
  );
};

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const state = useProjectStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div style={{
          position: 'fixed',
          top: isMobile ? '12px' : '24px',
          right: isMobile ? '12px' : '24px',
          left: isMobile ? '12px' : 'auto',
          zIndex: 9999,
          backgroundColor: toast.type === 'success' ? colors.success : colors.error,
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          fontWeight: 600,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.25s ease-out'
        }}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}

      {confirmation && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmation(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(2, 6, 23, 0.66)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-confirmation-title"
            aria-describedby="delete-confirmation-description"
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: colors.card,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '18px',
              padding: isMobile ? '22px' : '28px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.34)'
            }}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2',
              color: colors.error,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <svg aria-hidden="true" style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86l-7.82 13.55A2 2 0 004.2 20.4h15.6a2 2 0 001.73-2.99L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 id="delete-confirmation-title" style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
              {confirmation.title}
            </h2>
            <p id="delete-confirmation-description" style={{
              margin: '10px 0 0',
              color: colors.textMuted,
              fontSize: '13px',
              lineHeight: 1.65
            }}>
              {confirmation.message}
            </p>
            <div style={{
              marginTop: '24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmation(null)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '9px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.card,
                  color: colors.text,
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmation.onConfirm}
                style={{
                  padding: '10px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: colors.error,
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
                }}
              >
                {confirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Header Bar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: colors.primary,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}>
                <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </span>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.025em' }}>Margin Modeler</h1>
            </div>
            <p style={{ color: colors.textMuted, fontSize: '13px', margin: '4px 0 0' }}>Simulate resource allocations, schedules, and pricing on a local system database.</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
            {/* Real-time local status indicator */}
            <div style={{
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
              border: `1px solid ${colors.border}`,
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#10b981'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Local Storage Saved
            </div>

            {/* Dark Mode toggle */}
            <button 
              onClick={() => setIsDark(!isDark)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.card,
                color: colors.text,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </header>

        {/* Navigation & Import/Export Tabs Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isDesktop ? 'center' : 'stretch',
          borderBottom: `1px solid ${colors.border}`,
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              padding: '2px 2px 10px',
              flex: '1 1 520px',
              minWidth: 0,
              alignItems: 'center'
            }}
            className="custom-scroll"
          >
            {state.scenarios.map(s => {
              const isActive = s.id === state.activeScenarioId;
              const isBase = s.id === state.baseScenarioId;
              return (
                <div
                  key={s.id}
                  className="scenario-tab"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '40px',
                    backgroundColor: isActive
                      ? (isDark ? 'rgba(59, 130, 246, 0.14)' : '#eff6ff')
                      : colors.card,
                    border: `1px solid ${isActive ? colors.primary : colors.border}`,
                    borderRadius: '10px',
                    boxShadow: isActive
                      ? '0 3px 10px rgba(59, 130, 246, 0.12)'
                      : '0 1px 2px rgba(15, 23, 42, 0.04)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => state.switchScenario(s.id)}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      height: '100%',
                      padding: '0 8px 0 13px',
                      fontSize: '12px',
                      fontWeight: isActive ? 750 : 650,
                      lineHeight: 1,
                      backgroundColor: 'transparent',
                      color: isActive ? colors.primary : colors.textMuted,
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
                      <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.primary, flexShrink: 0 }} />
                    )}
                    <span style={{ maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                    {isBase && (
                      <span style={{
                        padding: '3px 6px',
                        borderRadius: '999px',
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.22)' : '#dbeafe',
                        color: isDark ? '#93c5fd' : '#1d4ed8',
                        fontSize: '8px',
                        fontWeight: 900,
                        letterSpacing: '0.06em'
                      }}>
                        BASE
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="scenario-tab-delete"
                    onClick={() => requestScenarioDeletion(s)}
                    disabled={isBase}
                    aria-label={isBase ? `${s.name} is the base project` : `Delete ${s.name}`}
                    title={isBase ? 'Remove Base status before deleting this project' : `Delete ${s.name}`}
                    style={{
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      margin: '0 5px 0 1px',
                      backgroundColor: 'transparent',
                      color: isActive ? colors.primary : colors.textMuted,
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
                      transition: 'background-color 0.15s ease, color 0.15s ease'
                    }}
                  >
                    <svg aria-hidden="true" style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => {
                state.createNewScenario();
                triggerToast("New project created!");
              }}
              style={{
                height: '40px',
                padding: '0 13px',
                fontSize: '12px',
                fontWeight: 750,
                color: colors.primary,
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#f8fbff',
                border: `1px dashed ${isDark ? 'rgba(96, 165, 250, 0.55)' : '#93c5fd'}`,
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
              <span aria-hidden="true" style={{ fontSize: '17px', fontWeight: 800, lineHeight: 1 }}>+</span>
              New Project
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end', flex: '0 1 auto' }}>
            {/* JSON Tools */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".json" 
              onChange={handleJSONImport} 
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flex: isMobile ? '1 1 140px' : '0 0 auto',
                justifyContent: 'center'
              }}
              title="Upload your workspace JSON backup"
            >
              📥 Import JSON
            </button>

            <button
              onClick={exportScenariosToJSON}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flex: isMobile ? '1 1 140px' : '0 0 auto',
                justifyContent: 'center'
              }}
              title="Download backup of scenarios"
            >
              📤 Export JSON
            </button>

            <button
              disabled={!activeScenario}
              onClick={() => {
                if (!activeScenario) return;
                state.cloneActiveScenario();
                triggerToast("Active project successfully cloned!");
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: '12px',
                fontWeight: 600,
                cursor: activeScenario ? 'pointer' : 'not-allowed',
                opacity: activeScenario ? 1 : 0.55,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flex: isMobile ? '1 1 140px' : '0 0 auto',
                justifyContent: 'center'
              }}
            >
              👯 Clone Active
            </button>
          </div>
        </div>

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
                    const resourceTotalCost =
                      calculatedTotalHrs * (r.costRate || 0);
                    const resourceTotalBillable =
                      calculatedTotalHrs * (r.billRate || 0);

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
                            gridTemplateColumns: isMobile
                              ? '1fr'
                              : 'repeat(2, minmax(0, 1fr))',
                            gap: '12px',
                            minWidth: 0
                          }}>
                            {[
                              {
                                label: 'Total Cost',
                                value: resourceTotalCost
                              },
                              {
                                label: 'Total Billable',
                                value: resourceTotalBillable
                              }
                            ].map((total) => (
                              <div
                                key={total.label}
                                style={{
                                  minHeight: '58px',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  border: `1px solid ${colors.border}`,
                                  backgroundColor: isDark
                                    ? 'rgba(99, 102, 241, 0.06)'
                                    : '#f8fafc',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  gap: '4px',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: colors.textMuted,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.07em'
                                }}>
                                  {total.label}
                                </span>
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: 800,
                                  color: colors.text,
                                  overflowWrap: 'anywhere'
                                }}>
                                  ${total.value.toLocaleString(undefined, {
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
                                  onCommit={(allocation) =>
                                    state.updateResourceAllocation(r.id, allocation)
                                  }
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