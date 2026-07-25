import { format, parse } from "date-fns";

type Data =
  | Record<string, { started: number; completed: number; completionRate: number }>
  | object
  | undefined;

/**
 * Backend keys are "yyyy-MM" (see statistics.service.ts#formatStats) so they
 * stay unique across years — turn each key into a display month name here
 * rather than in the backend, which previously collapsed the key to a bare
 * month name and silently collided two different years' data.
 */
const monthKeyToLabel = (key: string) => format(parse(key, "yyyy-MM", new Date()), "MMMM");

export const parseRatesChartData = (data: Data) => {
  if (!data) return [];

  return Object.entries(data).map(([month, values]) => ({
    month: monthKeyToLabel(month),
    started: values.started,
    completed: values.completed,
  }));
};
