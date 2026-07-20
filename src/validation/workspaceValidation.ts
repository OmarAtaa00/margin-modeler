import { compareDateOnly, parseDateOnlyUtc } from '../utils/dates';
import {
  getResourceCapacityHours,
  synchronizeResourceFromAllocation,
  synchronizeResourceFromHours
} from '../utils/resourceCalculations';

export type Resource = {
  id: string;
  name: string;
  costRate: number;
  billRate: number;
  startDate: string;
  endDate: string;
  utilization: number;
  directHours?: number;
};

export type Scenario = {
  id: string;
  name: string;
  projectStartDate: string;
  resources: Resource[];
};

export type PersistedWorkspace = {
  activeScenarioId: string;
  baseScenarioId: string | null;
  scenarios: Scenario[];
};

export type WorkspaceValidationResult =
  | { ok: true; workspace: PersistedWorkspace }
  | { ok: false; error: string };

const MAX_SCENARIOS = 100;
const MAX_RESOURCES_PER_SCENARIO = 1_000;
const MAX_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 50;
const MAX_HOURLY_RATE = 10_000;
const CAPACITY_TOLERANCE = 0.01;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readId = (value: unknown): string | null => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_ID_LENGTH ||
    value.trim() !== value
  ) {
    return null;
  }

  return value;
};

const readName = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > MAX_NAME_LENGTH) {
    return null;
  }

  return value;
};

const readFiniteNumber = (
  value: unknown,
  minimum: number,
  maximum: number
): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  if (value < minimum || value > maximum) {
    return null;
  }

  return value;
};

const validateResource = (
  value: unknown,
  scenarioIndex: number,
  resourceIndex: number
): { ok: true; resource: Resource } | { ok: false; error: string } => {
  const location = `Scenario ${scenarioIndex + 1}, resource ${resourceIndex + 1}`;

  if (!isRecord(value)) {
    return { ok: false, error: `${location} must be an object.` };
  }

  const id = readId(value.id);
  if (!id) {
    return {
      ok: false,
      error: `${location} has an invalid ID.`
    };
  }

  const name = readName(value.name);
  if (name === null) {
    return {
      ok: false,
      error: `${location} has an invalid name. Names may contain at most ${MAX_NAME_LENGTH} characters.`
    };
  }

  const costRate = readFiniteNumber(value.costRate, 0, MAX_HOURLY_RATE);
  if (costRate === null) {
    return {
      ok: false,
      error: `${location} has an invalid cost rate.`
    };
  }

  const billRate = readFiniteNumber(value.billRate, 0, MAX_HOURLY_RATE);
  if (billRate === null) {
    return {
      ok: false,
      error: `${location} has an invalid bill rate.`
    };
  }

  if (typeof value.startDate !== 'string' || !parseDateOnlyUtc(value.startDate)) {
    return {
      ok: false,
      error: `${location} has an invalid start date. Use YYYY-MM-DD.`
    };
  }

  if (typeof value.endDate !== 'string' || !parseDateOnlyUtc(value.endDate)) {
    return {
      ok: false,
      error: `${location} has an invalid end date. Use YYYY-MM-DD.`
    };
  }

  const dateComparison = compareDateOnly(value.startDate, value.endDate);
  if (dateComparison === null || dateComparison > 0) {
    return {
      ok: false,
      error: `${location} starts after its end date.`
    };
  }

  const utilization = readFiniteNumber(value.utilization, 0, 100);
  if (utilization === null) {
    return {
      ok: false,
      error: `${location} has an invalid allocation. It must be between 0 and 100.`
    };
  }

  const baseResource: Resource = {
    id,
    name,
    costRate,
    billRate,
    startDate: value.startDate,
    endDate: value.endDate,
    utilization
  };

  if (value.directHours === undefined) {
    return {
      ok: true,
      resource: synchronizeResourceFromAllocation(baseResource, utilization)
    };
  }

  const capacityHours = getResourceCapacityHours(baseResource);
  const directHours = readFiniteNumber(
    value.directHours,
    0,
    capacityHours + CAPACITY_TOLERANCE
  );

  if (directHours === null) {
    return {
      ok: false,
      error: `${location} has invalid direct hours. They must be between 0 and ${capacityHours}.`
    };
  }

  return {
    ok: true,
    resource: synchronizeResourceFromHours(baseResource, directHours)
  };
};

const validateScenario = (
  value: unknown,
  scenarioIndex: number
): { ok: true; scenario: Scenario } | { ok: false; error: string } => {
  const location = `Scenario ${scenarioIndex + 1}`;

  if (!isRecord(value)) {
    return { ok: false, error: `${location} must be an object.` };
  }

  const id = readId(value.id);
  if (!id) {
    return { ok: false, error: `${location} has an invalid ID.` };
  }

  const name = readName(value.name);
  if (name === null) {
    return {
      ok: false,
      error: `${location} has an invalid name. Names may contain at most ${MAX_NAME_LENGTH} characters.`
    };
  }

  if (
    typeof value.projectStartDate !== 'string' ||
    !parseDateOnlyUtc(value.projectStartDate)
  ) {
    return {
      ok: false,
      error: `${location} has an invalid project start date. Use YYYY-MM-DD.`
    };
  }

  if (!Array.isArray(value.resources)) {
    return { ok: false, error: `${location} is missing its resources array.` };
  }

  if (value.resources.length > MAX_RESOURCES_PER_SCENARIO) {
    return {
      ok: false,
      error: `${location} contains more than ${MAX_RESOURCES_PER_SCENARIO} resources.`
    };
  }

  const resources: Resource[] = [];
  const resourceIds = new Set<string>();

  for (let index = 0; index < value.resources.length; index += 1) {
    const result = validateResource(value.resources[index], scenarioIndex, index);
    if (!result.ok) return result;

    if (resourceIds.has(result.resource.id)) {
      return {
        ok: false,
        error: `${location} contains duplicate resource ID “${result.resource.id}”.`
      };
    }

    resourceIds.add(result.resource.id);
    resources.push(result.resource);
  }

  return {
    ok: true,
    scenario: {
      id,
      name,
      projectStartDate: value.projectStartDate,
      resources
    }
  };
};

export const validateWorkspace = (value: unknown): WorkspaceValidationResult => {
  if (!isRecord(value)) {
    return { ok: false, error: 'The workspace must be a JSON object.' };
  }

  if (!Array.isArray(value.scenarios)) {
    return { ok: false, error: 'The workspace is missing its scenarios array.' };
  }

  if (value.scenarios.length > MAX_SCENARIOS) {
    return {
      ok: false,
      error: `The workspace contains more than ${MAX_SCENARIOS} scenarios.`
    };
  }

  if (typeof value.activeScenarioId !== 'string') {
    return {
      ok: false,
      error: 'The workspace has an invalid active scenario ID.'
    };
  }

  if (
    value.baseScenarioId !== undefined &&
    value.baseScenarioId !== null &&
    typeof value.baseScenarioId !== 'string'
  ) {
    return {
      ok: false,
      error: 'The workspace has an invalid base scenario ID.'
    };
  }

  const scenarios: Scenario[] = [];
  const scenarioIds = new Set<string>();

  for (let index = 0; index < value.scenarios.length; index += 1) {
    const result = validateScenario(value.scenarios[index], index);
    if (!result.ok) return result;

    if (scenarioIds.has(result.scenario.id)) {
      return {
        ok: false,
        error: `The workspace contains duplicate scenario ID “${result.scenario.id}”.`
      };
    }

    scenarioIds.add(result.scenario.id);
    scenarios.push(result.scenario);
  }

  const activeScenarioId = scenarioIds.has(value.activeScenarioId)
    ? value.activeScenarioId
    : scenarios[0]?.id ?? '';

  const baseScenarioId =
    typeof value.baseScenarioId === 'string' &&
    scenarioIds.has(value.baseScenarioId)
      ? value.baseScenarioId
      : null;

  return {
    ok: true,
    workspace: {
      scenarios,
      activeScenarioId,
      baseScenarioId
    }
  };
};
