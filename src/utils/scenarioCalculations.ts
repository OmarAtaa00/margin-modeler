import type {
  Resource
} from '../validation/workspaceValidation';

import {
  getResourceDirectHours
} from './resourceCalculations';

export type ScenarioTotals = {
  totalHours: number;
  totalCost: number;
  totalRevenue: number;
  marginValue: number;
  margin: number;
};

export const computeScenarioTotals = (
  resources: Resource[]
): ScenarioTotals => {
  let totalHours = 0;
  let totalCost = 0;
  let totalRevenue = 0;

  if (!Array.isArray(resources)) {
    return {
      totalHours,
      totalCost,
      totalRevenue,
      marginValue: 0,
      margin: 0
    };
  }

  resources.forEach((resource) => {
    try {
      const effectiveHours =
        getResourceDirectHours(resource);

      totalHours += effectiveHours;

      totalCost +=
        effectiveHours *
        (resource.costRate || 0);

      totalRevenue +=
        effectiveHours *
        (resource.billRate || 0);
    } catch (error) {
      console.error(
        'Calculation safeguard triggered:',
        error
      );
    }
  });

  const marginValue =
    totalRevenue - totalCost;

  const margin =
    totalRevenue > 0
      ? (marginValue / totalRevenue) * 100
      : 0;

  return {
    totalHours,
    totalCost,
    totalRevenue,
    marginValue,
    margin
  };
};