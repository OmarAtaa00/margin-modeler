import { calculateWorkingDays } from './dates';

export type ResourceHoursModel = {
  startDate: string;
  endDate: string;
  utilization: number;
  directHours?: number;
};

export const HOURS_PER_WORKDAY = 8;

export const clampAllocation = (value: number): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(100, Math.max(0, numericValue));
};

export const getResourceCapacityHours = (
  resource: Pick<ResourceHoursModel, 'startDate' | 'endDate'>
): number => calculateWorkingDays(resource.startDate, resource.endDate) * HOURS_PER_WORKDAY;

export const getResourceDirectHours = (resource: ResourceHoursModel): number => {
  const capacityHours = getResourceCapacityHours(resource);
  const savedDirectHours = Number(resource.directHours);

  if (resource.directHours !== undefined && Number.isFinite(savedDirectHours)) {
    return Math.min(capacityHours, Math.max(0, savedDirectHours));
  }

  return capacityHours * (clampAllocation(resource.utilization) / 100);
};

export const synchronizeResourceFromHours = <T extends ResourceHoursModel>(
  resource: T,
  requestedHours: number
): T => {
  const capacityHours = getResourceCapacityHours(resource);
  const numericHours = Number(requestedHours);
  const directHours = Number.isFinite(numericHours)
    ? Math.min(capacityHours, Math.max(0, numericHours))
    : 0;
  const utilization = capacityHours > 0
    ? (directHours / capacityHours) * 100
    : 0;

  return { ...resource, directHours, utilization };
};

export const synchronizeResourceFromAllocation = <T extends ResourceHoursModel>(
  resource: T,
  requestedAllocation: number
): T => {
  const utilization = clampAllocation(requestedAllocation);
  const directHours = getResourceCapacityHours(resource) * (utilization / 100);
  return { ...resource, utilization, directHours };
};
