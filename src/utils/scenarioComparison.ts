
import {
  differenceInCalendarDays
} from './dates';

import {
  computeScenarioTotals
} from './scenarioCalculations';

import type {
  Resource,
  Scenario
} from '../validation/workspaceValidation';

export type ResourceComparison = {
  added: Resource[];
  removed: Resource[];
  changed: Array<{
    baseResource: Resource;
    currentResource: Resource;
    changes: string[];
  }>;
};

export type ScenarioComparison = {
  baseScenario: Scenario;
  currentScenario: Scenario;

  baseTotals: ReturnType<
    typeof computeScenarioTotals
  >;

  currentTotals: ReturnType<
    typeof computeScenarioTotals
  >;

  hoursDifference: number;
  costDifference: number;
  revenueDifference: number;
  marginValueDifference: number;
  marginPointDifference: number;
  resourceCountDifference: number;
  scheduleDurationDifference: number | null;

  baseScheduleDuration: number | null;
  currentScheduleDuration: number | null;

  resources: ResourceComparison;
};

const getLatestResourceEndDate = (
  scenario: Scenario
): string => {
  if (scenario.resources.length === 0) {
    return scenario.projectStartDate;
  }

  return scenario.resources.reduce(
    (latestDate, resource) =>
      resource.endDate > latestDate
        ? resource.endDate
        : latestDate,
    scenario.projectStartDate
  );
};

const getScheduleDuration = (
  scenario: Scenario
): number | null => {
  const latestEndDate =
    getLatestResourceEndDate(scenario);

  const duration =
    differenceInCalendarDays(
      latestEndDate,
      scenario.projectStartDate
    );

  if (duration === null) {
    return null;
  }

  return duration + 1;
};

const getResourceMatchKey = (
  resource: Resource
): string =>
  resource.name
    .trim()
    .toLocaleLowerCase();

const getResourceChanges = (
  baseResource: Resource,
  currentResource: Resource
): string[] => {
  const changes: string[] = [];

  if (
    baseResource.name !==
    currentResource.name
  ) {
    changes.push('name');
  }

  if (
    baseResource.costRate !==
    currentResource.costRate
  ) {
    changes.push('cost rate');
  }

  if (
    baseResource.billRate !==
    currentResource.billRate
  ) {
    changes.push('bill rate');
  }

  if (
    baseResource.startDate !==
    currentResource.startDate
  ) {
    changes.push('start date');
  }

  if (
    baseResource.endDate !==
    currentResource.endDate
  ) {
    changes.push('end date');
  }

  if (
    baseResource.utilization !==
    currentResource.utilization
  ) {
    changes.push('allocation');
  }

  if (
    baseResource.directHours !==
    currentResource.directHours
  ) {
    changes.push('direct hours');
  }

  return changes;
};

const compareResources = (
  baseScenario: Scenario,
  currentScenario: Scenario
): ResourceComparison => {
 
    

  const currentById = new Map(
    currentScenario.resources.map(
      (resource) => [
        resource.id,
        resource
      ]
    )
  );

  const matchedBaseIds =
    new Set<string>();

  const matchedCurrentIds =
    new Set<string>();

  const changed:
    ResourceComparison['changed'] = [];

  baseScenario.resources.forEach(
    (baseResource) => {
      const currentResource =
        currentById.get(baseResource.id);

      if (!currentResource) {
        return;
      }

      matchedBaseIds.add(baseResource.id);
      matchedCurrentIds.add(
        currentResource.id
      );

      const changes = getResourceChanges(
        baseResource,
        currentResource
      );

      if (changes.length > 0) {
        changed.push({
          baseResource,
          currentResource,
          changes
        });
      }
    }
  );

  baseScenario.resources.forEach(
    (baseResource) => {
      if (
        matchedBaseIds.has(
          baseResource.id
        )
      ) {
        return;
      }

      const baseKey =
        getResourceMatchKey(baseResource);

      const currentResource =
        currentScenario.resources.find(
          (candidate) =>
            !matchedCurrentIds.has(
              candidate.id
            ) &&
            getResourceMatchKey(
              candidate
            ) === baseKey
        );

      if (!currentResource) {
        return;
      }

      matchedBaseIds.add(baseResource.id);
      matchedCurrentIds.add(
        currentResource.id
      );

      const changes = getResourceChanges(
        baseResource,
        currentResource
      );

      if (changes.length > 0) {
        changed.push({
          baseResource,
          currentResource,
          changes
        });
      }
    }
  );

  const removed =
    baseScenario.resources.filter(
      (resource) =>
        !matchedBaseIds.has(resource.id)
    );

  const added =
    currentScenario.resources.filter(
      (resource) =>
        !matchedCurrentIds.has(
          resource.id
        )
    );

  return {
    added,
    removed,
    changed
  };
};

export const compareScenarios = (
  baseScenario: Scenario,
  currentScenario: Scenario
): ScenarioComparison => {
  const baseTotals =
    computeScenarioTotals(
      baseScenario.resources
    );

  const currentTotals =
    computeScenarioTotals(
      currentScenario.resources
    );

  const baseScheduleDuration =
    getScheduleDuration(baseScenario);

  const currentScheduleDuration =
    getScheduleDuration(currentScenario);

  const scheduleDurationDifference =
    baseScheduleDuration !== null &&
    currentScheduleDuration !== null
      ? currentScheduleDuration -
        baseScheduleDuration
      : null;

  return {
    baseScenario,
    currentScenario,
    baseTotals,
    currentTotals,

    hoursDifference:
      currentTotals.totalHours -
      baseTotals.totalHours,

    costDifference:
      currentTotals.totalCost -
      baseTotals.totalCost,

    revenueDifference:
      currentTotals.totalRevenue -
      baseTotals.totalRevenue,

    marginValueDifference:
      currentTotals.marginValue -
      baseTotals.marginValue,

    marginPointDifference:
      currentTotals.margin -
      baseTotals.margin,

    resourceCountDifference:
      currentScenario.resources.length -
      baseScenario.resources.length,

    scheduleDurationDifference,
    baseScheduleDuration,
    currentScheduleDuration,

    resources: compareResources(
      baseScenario,
      currentScenario
    )
  };
};