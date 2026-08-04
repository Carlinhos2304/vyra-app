/**
 * useDayTimeline — Smart Planner spec item 3 (Day Timeline). Splits a day's
 * events into a chronologically-sorted `timed` list (events with a real
 * start_time, added by the 2026-08-04 migration) and an `untimed` list
 * (events created before the migration, or created without a time) instead
 * of guessing a time for them. This is the honest fallback the Planner
 * audit called for: useNextEvent.ts already established the precedent of
 * never fabricating a clock time when the schema doesn't have one.
 *
 * Sort is numeric (parsed minutes-since-midnight), not string comparison —
 * defends against "HH:MM" vs "HH:MM:SS" formatting differences sorting
 * unexpectedly — with a stable `id` tiebreaker so two events that are
 * otherwise equal (both untimed, or the exact same start_time) always
 * render in the same order across re-renders instead of shuffling.
 */

import { useMemo } from 'react';
import type { PlannerEvent } from '../../lib/services/plannerTypes';

export interface UseDayTimelineResult {
  timed: PlannerEvent[];
  untimed: PlannerEvent[];
  hasAnyEvents: boolean;
}

function minutesSinceMidnight(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function useDayTimeline(dayEvents: PlannerEvent[]): UseDayTimelineResult {
  return useMemo(() => {
    const timed = dayEvents
      .filter((ev) => !!ev.start_time)
      .slice()
      .sort((a, b) => minutesSinceMidnight(a.start_time as string) - minutesSinceMidnight(b.start_time as string) || a.id.localeCompare(b.id));
    const untimed = dayEvents
      .filter((ev) => !ev.start_time)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));

    return { timed, untimed, hasAnyEvents: dayEvents.length > 0 };
  }, [dayEvents]);
}
