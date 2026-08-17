/**
 * usePlannerCalendarData — replaces calendar.tsx's old inline
 * syncPlanningSystemGraph(). Fixes the two issues the Planner audit found
 * there:
 *
 *  1. Unbounded query: the old code fetched EVERY outfit_plans row the user
 *     has ever created, with no date filter, on every fetch. This version
 *     bounds that query to the currently displayed 7-day week — the only
 *     days that actually need a "has a planned outfit" dot indicator.
 *  2. No mount-cancellation guard: the old fetch had no `isActive`-style
 *     check, so a slow request completing after the screen lost focus (or
 *     unmounted) could still call setState. This version guards every
 *     setState with an `isActive` flag cleared by the effect's cleanup,
 *     matching the pattern already established in app/(tabs)/create.tsx.
 *
 * Also widens the "upcoming events" query from a flat 5-row limit to a
 * bounded 14-day window with the fuller field set (start_time, outfit
 * items' clothing_items id/name/season) — still bounded, just wide enough
 * for usePlannerConflicts / useUpcomingPreparations to reason over without
 * issuing their own separate queries.
 */

import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import type { PlannerDayPlan, PlannerEvent } from '../../lib/services/plannerTypes';

const UPCOMING_WINDOW_DAYS = 14;

const EVENT_SELECT =
  'id, name, event_date, start_time, end_time, category, location, description, outfit_id, recurrence_type, recurrence_parent_id, outfits(id, name, occasion, ai_confidence, outfit_items(clothing_items(id, name, image_url, season)))';

function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export interface UsePlannerCalendarDataResult {
  isLoading: boolean;
  error: string | null;
  weekPlans: Record<string, PlannerDayPlan>;
  /** Dates (within the displayed week) that have at least one event —
   * powers CalendarDayCell's "has event" dot for every visible day,
   * including past days in the week that upcomingEvents (forward-only)
   * doesn't cover. */
  weekEventDates: Set<string>;
  selectedDayEvents: PlannerEvent[];
  upcomingEvents: PlannerEvent[];
  refetch: () => void;
}

export function usePlannerCalendarData(weekDates: string[], selectedDateISO: string): UsePlannerCalendarDataResult {
  const [weekPlans, setWeekPlans] = useState<Record<string, PlannerDayPlan>>({});
  const [weekEventDates, setWeekEventDates] = useState<Set<string>>(new Set());
  const [selectedDayEvents, setSelectedDayEvents] = useState<PlannerEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<PlannerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable-ish key so the effect below doesn't re-run just because a new
  // array instance of the same 7 dates was passed in.
  const weekKey = weekDates.join(',');

  const load = useCallback(
    async (isActiveRef: { current: boolean }) => {
      try {
        setIsLoading(true);
        setError(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Authentication session tracking expired.');

        const weekStart = weekDates[0];
        const weekEnd = weekDates[weekDates.length - 1];

        // 1. Outfit plans — bounded to the visible week only (was: every
        //    outfit_plans row the user has ever had, unbounded).
        const { data: plansData, error: plansErr } = await supabase
          .from('outfit_plans')
          .select('id, planned_date, outfit_id, outfits ( name, occasion, outfit_items ( clothing_items ( image_url ) ) )')
          .eq('user_id', user.id)
          .gte('planned_date', weekStart)
          .lte('planned_date', weekEnd);
        if (plansErr) throw plansErr;

        const reducedPlansMap: Record<string, PlannerDayPlan> = {};
        (plansData || []).forEach((row: any) => {
          if (!row.planned_date || !row.outfits) return;
          const items = row.outfits.outfit_items || [];
          const garmentImages = items
            .map((item: any) => item.clothing_items?.image_url)
            .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0);
          reducedPlansMap[row.planned_date] = {
            id: row.id,
            outfitId: row.outfit_id,
            outfitName: row.outfits.name,
            garmentImages,
            occasion: row.outfits.occasion,
          };
        });

        // 1b. Which dates in the visible week have at least one event — a
        //     lightweight, bounded query (just id/event_date) purely to
        //     power CalendarDayCell's "has event" dot for every visible
        //     day, including past days in the week that the forward-only
        //     "upcoming events" query below doesn't cover.
        const { data: weekEventsData, error: weekEventsErr } = await supabase
          .from('events')
          .select('id, event_date')
          .eq('user_id', user.id)
          .gte('event_date', weekStart)
          .lte('event_date', weekEnd);
        if (weekEventsErr) throw weekEventsErr;

        // 2. Selected day's events (full field set for the Day Timeline).
        //    Explicit .order() here — without one, Postgres doesn't
        //    guarantee row order is stable across requests, which is
        //    exactly what made the Day Timeline look like it wasn't sorted
        //    "top to bottom by hour": useDayTimeline re-sorts client-side
        //    too, but ties (two untimed events, or a re-fetch racing a
        //    render) could still visibly reorder without a stable DB order
        //    to fall back on.
        const { data: selectedEventsData, error: dayEventsErr } = await supabase
          .from('events')
          .select(EVENT_SELECT)
          .eq('user_id', user.id)
          .eq('event_date', selectedDateISO)
          .order('start_time', { ascending: true, nullsFirst: false })
          .order('id', { ascending: true });
        if (dayEventsErr) throw dayEventsErr;

        // 3. Upcoming events — bounded to the next UPCOMING_WINDOW_DAYS days
        //    (was: limit(5) with a thinner field set that couldn't power
        //    conflict/preparation detection).
        const localTodayISO = toLocalISODate(new Date());
        const windowEnd = toLocalISODate(new Date(Date.now() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000));
        const { data: upcomingData, error: upcomingErr } = await supabase
          .from('events')
          .select(EVENT_SELECT)
          .eq('user_id', user.id)
          .gte('event_date', localTodayISO)
          .lte('event_date', windowEnd)
          .order('event_date', { ascending: true });
        if (upcomingErr) throw upcomingErr;

        if (!isActiveRef.current) return;
        setWeekPlans(reducedPlansMap);
        setWeekEventDates(new Set((weekEventsData || []).map((row: any) => row.event_date)));
        setSelectedDayEvents((selectedEventsData || []) as unknown as PlannerEvent[]);
        setUpcomingEvents((upcomingData || []) as unknown as PlannerEvent[]);
      } catch (err: any) {
        if (!isActiveRef.current) return;
        console.error('[usePlannerCalendarData] failed:', err);
        setError(err.message || 'Error occurred updating the planner data.');
      } finally {
        if (isActiveRef.current) setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekKey, selectedDateISO]
  );

  const refetchRequestedRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const isActiveRef = { current: true };
      load(isActiveRef);
      return () => {
        isActiveRef.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, refetchRequestedRef.current])
  );

  const refetch = useCallback(() => {
    refetchRequestedRef.current += 1;
    const isActiveRef = { current: true };
    load(isActiveRef);
  }, [load]);

  return { isLoading, error, weekPlans, weekEventDates, selectedDayEvents, upcomingEvents, refetch };
}
