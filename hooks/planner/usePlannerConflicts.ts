/**
 * usePlannerConflicts — Smart Planner spec item 8. Thin memoized wrapper
 * around plannerConflictService.detectAllConflicts, fed by data the screen
 * already has (usePlannerCalendarData's upcomingEvents + useWeather's
 * forecast) — no additional Supabase or WeatherService calls happen here.
 */

import { useMemo } from 'react';
import { detectAllConflicts, PlannerConflict } from '../../lib/services/plannerConflictService';
import type { PlannerEvent } from '../../lib/services/plannerTypes';
import type { ForecastDay } from '../../lib/services/weatherService';

export function usePlannerConflicts(
  upcomingEvents: PlannerEvent[],
  forecast: ForecastDay[],
  todayLocalISO: string
): PlannerConflict[] {
  return useMemo(
    () => detectAllConflicts(upcomingEvents, forecast, todayLocalISO),
    [upcomingEvents, forecast, todayLocalISO]
  );
}
