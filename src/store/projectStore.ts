import { create } from 'zustand';

import {
  addDays,
  addWeeks,
  compareDateOnly,
  differenceInCalendarDays,
  getMonday,
  parseDateOnlyUtc
} from '../utils/dates';

import {
  getResourceDirectHours,
  synchronizeResourceFromAllocation,
  synchronizeResourceFromHours
} from '../utils/resourceCalculations';

import { validateWorkspace } from '../validation/workspaceValidation';

import type {
  PersistedWorkspace,
  Resource,
  Scenario
} from '../validation/workspaceValidation';

export const DEFAULT_PROJECT_START = '2026-07-13';

export const LOCAL_STORAGE_KEY = 'margin_modeler_local_workspace';

export type ProjectState = {
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

  updateResourceField: (
    resourceId: string,
    field: keyof Resource,
    value: unknown
  ) => void;

  updateResourceAllocation: (
    resourceId: string,
    value: number
  ) => void;

  updateResourceTotalHoursDirect: (
    resourceId: string,
    hours: number
  ) => void;

  updateResourceDates: (
    resourceId: string,
    startDate: string,
    endDate: string
  ) => void;

  setEntireState: (
    scenarios: Scenario[],
    activeScenarioId: string,
    baseScenarioId?: string | null
  ) => void;
};

const defaultResources: Resource[] = [
  {
    id: '1',
    name: 'Ahmed',
    role: 'Consultant',
    region: 'EMEA',
    costRate: 60,
    billRate: 250,
    startDate: '2026-07-13',
    endDate: '2026-09-18',
    utilization: 100
  },
  {
    id: '2',
    name: 'Mohamed',
    costRate: 50,
    billRate: 150,
    startDate: '2026-07-13',
    endDate: '2026-10-02',
    utilization: 100,
    role: '',
    region: 'AMER'
  },
  {
    id: '3',
    name: 'Omar',
    costRate: 40,
    billRate: 200,
    startDate: '2026-07-20',
    endDate: '2026-10-02',
    utilization: 100,
    role: '',
    region: 'EMEA'
  }
];

const createDefaultWorkspace = (): PersistedWorkspace => ({
  activeScenarioId: 'scen-1',
  baseScenarioId: null,
  scenarios: [
    {
      id: 'scen-1',
      name: 'Scenario 1 (Base Plan)',
      projectStartDate: DEFAULT_PROJECT_START,
      resources: defaultResources.map((resource) => ({ ...resource }))
    },
    {
      id: 'scen-2',
      name: 'Scenario 2 (Draft Opt.)',
      projectStartDate: DEFAULT_PROJECT_START,
      resources: [
        {
          id: '1',
          name: 'Ahmed',
          role: 'Consultant',
          region: 'EMEA',
          costRate: 60,
          billRate: 250,
          startDate: '2026-07-13',
          endDate: '2026-09-04',
          utilization: 100
        },
        {
          id: '2',
          name: 'Mohamed',
          costRate: 50,
          billRate: 150,
          startDate: '2026-07-13',
          endDate: '2026-10-02',
          utilization: 50,
          role: '',
          region: 'AMER'
        },
        {
          id: '3',
          name: 'Omar',
          costRate: 40,
          billRate: 200,
          startDate: '2026-07-20',
          endDate: '2026-10-02',
          utilization: 80,
          role: '',
          region: 'EMEA'
        }]
    }
  ]
});

const getInitialState = (): PersistedWorkspace => {
  try {
    const storedWorkspace = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedWorkspace) {
      const result = validateWorkspace(JSON.parse(storedWorkspace));

      if (result.ok) {
        return result.workspace;
      }

      console.warn(
        `Local workspace was rejected: ${result.error}`
      );
    }
  } catch (error) {
    console.warn(
      'Could not load local workspace data. Using fallback defaults:',
      error
    );
  }

  return createDefaultWorkspace();
};

const isActiveScenarioLocked = (
  state: Pick<ProjectState, 'activeScenarioId' | 'baseScenarioId'>
): boolean =>
  state.baseScenarioId !== null &&
  state.activeScenarioId === state.baseScenarioId;

const createScenarioId = (): string =>
  `scen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createResourceId = (): string =>
  `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialState = getInitialState();

export const useProjectStore = create<ProjectState>((set) => ({
  activeScenarioId: initialState.activeScenarioId,
  baseScenarioId: initialState.baseScenarioId,
  scenarios: initialState.scenarios,

  switchScenario: (id) =>
    set((state) => {
      if (!state.scenarios.some((scenario) => scenario.id === id)) {
        return state;
      }

      return { activeScenarioId: id };
    }),

  createNewScenario: () =>
    set((state) => {
      const id = createScenarioId();

      const newScenario: Scenario = {
        id,
        name: `Scenario ${state.scenarios.length + 1}`,
        projectStartDate: DEFAULT_PROJECT_START,
        resources: structuredClone(defaultResources)
      };

      return {
        scenarios: [...state.scenarios, newScenario],
        activeScenarioId: id
      };
    }),

  cloneActiveScenario: () =>
    set((state) => {
      const activeScenario =
        state.scenarios.find(
          (scenario) => scenario.id === state.activeScenarioId
        ) ?? state.scenarios[0];

      if (!activeScenario) {
        return state;
      }

      const id = createScenarioId();

      const clonedScenario: Scenario = {
        id,
        name: `${activeScenario.name} (Copy)`,
        projectStartDate: activeScenario.projectStartDate,
        resources: activeScenario.resources.map((resource) => ({
          ...resource,
          id: createResourceId()
        }))
      };

      return {
        scenarios: [...state.scenarios, clonedScenario],
        activeScenarioId: id
      };
    }),

  setBaseScenario: (id) =>
    set((state) => {
      if (id === null) {
        return { baseScenarioId: null };
      }

      if (!state.scenarios.some((scenario) => scenario.id === id)) {
        return state;
      }

      return { baseScenarioId: id };
    }),

  deleteScenario: (id) =>
    set((state) => {
      if (state.baseScenarioId === id) {
        return state;
      }

      const indexToDelete = state.scenarios.findIndex(
        (scenario) => scenario.id === id
      );

      if (indexToDelete === -1) {
        return state;
      }

      const remainingScenarios = state.scenarios.filter(
        (scenario) => scenario.id !== id
      );

      let activeScenarioId = state.activeScenarioId;

      if (state.activeScenarioId === id) {
        activeScenarioId =
          remainingScenarios.length > 0
            ? remainingScenarios[
                Math.min(indexToDelete, remainingScenarios.length - 1)
              ].id
            : '';
      }

      return {
        scenarios: remainingScenarios,
        activeScenarioId
      };
    }),

  updateScenarioName: (name) =>
    set((state) => {
      if (isActiveScenarioLocked(state)) {
        return state;
      }

      const editableName = String(name).slice(0, 50);

      return {
        scenarios: state.scenarios.map((scenario) =>
          scenario.id === state.activeScenarioId
            ? { ...scenario, name: editableName }
            : scenario
        )
      };
    }),

  updateProjectStartDate: (date) =>
    set((state) => {
      if (isActiveScenarioLocked(state)) {
        return state;
      }

      try {
        if (!parseDateOnlyUtc(date)) {
          return {};
        }

        const adjustedDate = getMonday(
          date,
          DEFAULT_PROJECT_START
        );

        return {
          scenarios: state.scenarios.map((scenario) => {
            if (scenario.id !== state.activeScenarioId) {
              return scenario;
            }

            const differenceDays = differenceInCalendarDays(
              adjustedDate,
              scenario.projectStartDate
            );

            if (differenceDays === null) {
              return scenario;
            }

            const resources = scenario.resources.map((resource) => {
              const currentDirectHours =
                getResourceDirectHours(resource);

              const shiftedResource = {
                ...resource,
                startDate: addDays(
                  resource.startDate,
                  differenceDays,
                  resource.startDate
                ),
                endDate: addDays(
                  resource.endDate,
                  differenceDays,
                  resource.endDate
                )
              };

              return synchronizeResourceFromHours(
                shiftedResource,
                currentDirectHours
              );
            });

            return {
              ...scenario,
              projectStartDate: adjustedDate,
              resources
            };
          })
        };
      } catch (error) {
        console.error(
          'Failed to update the project start date:',
          error
        );

        return {};
      }
    }),

  addResource: () =>
    set((state) => {
      if (isActiveScenarioLocked(state)) {
        return state;
      }

      return {
        scenarios: state.scenarios.map((scenario) => {
          if (scenario.id !== state.activeScenarioId) {
            return scenario;
          }

          const resource = synchronizeResourceFromAllocation<Resource>(
            {
              id: createResourceId(),
              name: `Consultant ${scenario.resources.length + 1}`,
              costRate: 45,
              billRate: 150,
              startDate: scenario.projectStartDate,
              endDate: addWeeks(
                scenario.projectStartDate,
                12,
                DEFAULT_PROJECT_START
              ),
              utilization: 100,
              role: '',
              region: 'AMER'
            },
            100
          );

          return {
            ...scenario,
            resources: [resource, ...scenario.resources]
          };
        })
      };
    }),

  cloneResource: (id) =>
    set((state) => {
      if (isActiveScenarioLocked(state)) {
        return state;
      }

      return {
        scenarios: state.scenarios.map((scenario) => {
          if (scenario.id !== state.activeScenarioId) {
            return scenario;
          }

          const sourceIndex = scenario.resources.findIndex(
            (resource) => resource.id === id
          );

          if (sourceIndex === -1) {
            return scenario;
          }

          const source = scenario.resources[sourceIndex];

          const clonedResource: Resource = {
            ...source,
            id: createResourceId(),
            name: `${source.name || 'Consultant'} (Copy)`
          };

          const resources = [...scenario.resources];
          resources.splice(sourceIndex, 0, clonedResource);

          return {
            ...scenario,
            resources
          };
        })
      };
    }),

  removeResource: (id) =>
    set((state) => {
      if (isActiveScenarioLocked(state)) {
        return state;
      }

      return {
        scenarios: state.scenarios.map((scenario) => {
          if (scenario.id !== state.activeScenarioId) {
            return scenario;
          }

          return {
            ...scenario,
            resources: scenario.resources.filter(
              (resource) => resource.id !== id
            )
          };
        })
      };
    }),

  updateResourceField: (resourceId, field, value) =>
    set((state) => {
      if (isActiveScenarioLocked(state)) {
        return state;
      }

      return {
        scenarios: state.scenarios.map((scenario) => {
          if (scenario.id !== state.activeScenarioId) {
            return scenario;
          }

          return {
            ...scenario,
            resources: scenario.resources.map((resource) => {
              if (resource.id !== resourceId) {
                return resource;
              }

              let validatedValue: unknown = value;

              if (field === 'name') {
                validatedValue = String(value).slice(0, 50);
              } else if (
                field === 'costRate' ||
                field === 'billRate'
              ) {
                const numberValue = Number(value);

                validatedValue = Number.isFinite(numberValue)
                  ? Math.min(10_000, Math.max(0, numberValue))
                  : 0;
              }

              const updatedResource = {
                ...resource,
                validatedValue
              } as Resource;

              if (field !== 'startDate' && field !== 'endDate') {
                return updatedResource;
              }

              const currentDirectHours =
                getResourceDirectHours(resource);

              const comparison = compareDateOnly(
                updatedResource.startDate,
                updatedResource.endDate
              );

              if (comparison === null) {
                return resource;
              }

              if (comparison > 0) {
                if (field === 'startDate') {
                  updatedResource.endDate =
                    updatedResource.startDate;
                } else {
                  updatedResource.startDate =
                    updatedResource.endDate;
                }
              }

              return synchronizeResourceFromHours(
                updatedResource,
                currentDirectHours
              );
            })
          };
        })
      };
    }),

  updateResourceAllocation: (resourceId, value) =>
    set((state) => {
      if (isActiveScenarioLocked(state)) {
        return state;
      }

      return {
        scenarios: state.scenarios.map((scenario) => {
          if (scenario.id !== state.activeScenarioId) {
            return scenario;
          }

          return {
            ...scenario,
            resources: scenario.resources.map((resource) =>
              resource.id === resourceId
                ? synchronizeResourceFromAllocation(resource, value)
                : resource
            )
          };
        })
      };
    }),

  updateResourceTotalHoursDirect: (resourceId, hours) =>
    set((state) => {
      if (isActiveScenarioLocked(state)) {
        return state;
      }

      return {
        scenarios: state.scenarios.map((scenario) => {
          if (scenario.id !== state.activeScenarioId) {
            return scenario;
          }

          return {
            ...scenario,
            resources: scenario.resources.map((resource) =>
              resource.id === resourceId
                ? synchronizeResourceFromHours(resource, hours)
                : resource
            )
          };
        })
      };
    }),

  updateResourceDates: (
    resourceId,
    startDate,
    endDate
  ) =>
    set((state) => {
      if (isActiveScenarioLocked(state)) {
        return state;
      }

      return {
        scenarios: state.scenarios.map((scenario) => {
          if (scenario.id !== state.activeScenarioId) {
            return scenario;
          }

          return {
            ...scenario,
            resources: scenario.resources.map((resource) => {
              if (resource.id !== resourceId) {
                return resource;
              }

              const comparison = compareDateOnly(
                startDate,
                endDate
              );

              if (comparison === null || comparison > 0) {
                return resource;
              }

              const currentDirectHours =
                getResourceDirectHours(resource);

              return synchronizeResourceFromHours(
                {
                  ...resource,
                  startDate,
                  endDate
                },
                currentDirectHours
              );
            })
          };
        })
      };
    }),

  setEntireState: (
    scenarios,
    activeScenarioId,
    baseScenarioId = null
  ) =>
    set({
      scenarios,
      activeScenarioId,
      baseScenarioId
    })
}));