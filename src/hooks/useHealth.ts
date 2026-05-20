import { useQuery } from '@tanstack/react-query';
import {
  getTodayDistance,
  getTodayFlightsClimbed,
  getTodayStepCount,
  initHealthKit,
} from '../lib/health';

export interface HealthSnapshot {
  steps: number;
  flights: number;
  distanceMeters: number;
}

export function useHealthSnapshot(enabled = true) {
  return useQuery<HealthSnapshot>({
    queryKey: ['health', 'today'],
    enabled,
    queryFn: async () => {
      await initHealthKit();
      const [steps, flights, distanceMeters] = await Promise.all([
        getTodayStepCount(),
        getTodayFlightsClimbed(),
        getTodayDistance(),
      ]);
      return { steps, flights, distanceMeters };
    },
    staleTime: 60_000,
  });
}
