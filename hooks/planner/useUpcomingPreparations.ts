/**
 * useUpcomingPreparations — Smart Planner spec item 7. Thin memoized
 * wrapper around eventPreparationService.generatePreparationTips, fed by
 * usePlannerCalendarData's upcomingEvents — no extra queries.
 */

import { useMemo } from 'react';
import { generatePreparationTips, PreparationTip } from '../../lib/services/eventPreparationService';
import type { PlannerEvent } from '../../lib/services/plannerTypes';

export function useUpcomingPreparations(upcomingEvents: PlannerEvent[], todayLocalISO: string): PreparationTip[] {
  return useMemo(() => generatePreparationTips(upcomingEvents, todayLocalISO), [upcomingEvents, todayLocalISO]);
}
