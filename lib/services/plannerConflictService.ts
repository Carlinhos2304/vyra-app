/**
 * plannerConflictService.ts
 *
 * Smart Planner spec item 8: Conflict detection. Pure functions only — every
 * detector here takes already-fetched data (events + their assigned
 * outfits' items + a weather forecast) and returns Conflict[]; nothing in
 * this file queries Supabase or calls WeatherService itself. That's
 * deliberate: usePlannerConflicts (the hook that calls these) reuses the
 * same day/week data usePlannerCalendarData and useWeather already fetched,
 * so conflict detection never adds its own extra queries — the audit
 * flagged calendar.tsx for exactly that kind of redundant fetching.
 *
 * Conflicts are informational, never blocking — the spec is explicit that
 * these render as "elegant cards, never invasive alerts."
 */

import type { PlannerEvent } from './plannerTypes';
import type { ForecastDay } from './weatherService';
import { IMPORTANT_EVENT_CATEGORIES, type EventCategory } from '../../constants/eventCategories';

export type ConflictType = 'duplicate-garment' | 'weather-mismatch' | 'missing-outfit' | 'unprepared-important';
export type ConflictSeverity = 'low' | 'medium' | 'high';

export interface PlannerConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  eventId: string;
  eventName: string;
  /** i18n key under planner.smartPlanner.conflicts.* — component resolves it, this service stays copy-agnostic. */
  messageKey: string;
  messageParams?: Record<string, string | number>;
}

const MISSING_OUTFIT_WINDOW_DAYS = 7;
const UNPREPARED_WINDOW_HOURS = 24;
const COLD_THRESHOLD_C = 10;
const HOT_THRESHOLD_C = 26;

function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/** Same garment worn twice the same day — a garment appearing in two
 * different events' assigned outfits on the same event_date. */
export function detectDuplicateGarmentConflicts(events: PlannerEvent[]): PlannerConflict[] {
  const byDate = new Map<string, PlannerEvent[]>();
  for (const ev of events) {
    if (!ev.outfit_id || !ev.outfits) continue;
    const list = byDate.get(ev.event_date) || [];
    list.push(ev);
    byDate.set(ev.event_date, list);
  }

  const conflicts: PlannerConflict[] = [];
  for (const [, dayEvents] of byDate) {
    if (dayEvents.length < 2) continue;

    const garmentToEvents = new Map<string, PlannerEvent[]>();
    for (const ev of dayEvents) {
      const itemIds = (ev.outfits?.outfit_items || [])
        .map((oi) => oi.clothing_items?.id)
        .filter((id): id is string => !!id);
      for (const itemId of itemIds) {
        const list = garmentToEvents.get(itemId) || [];
        list.push(ev);
        garmentToEvents.set(itemId, list);
      }
    }

    for (const [itemId, sharingEvents] of garmentToEvents) {
      if (sharingEvents.length < 2) continue;
      const [first, second] = sharingEvents;
      conflicts.push({
        // Fixed: the id used to omit the garment's own id, so two
        // DIFFERENT garments shared between the same pair of events (e.g.
        // both a sweater AND a scarf added to fix a "too light" weather
        // conflict) produced two conflicts with the exact same id —
        // "Encountered two children with the same key" when calendar.tsx
        // rendered them in a list. Each garment now gets its own id.
        id: `duplicate-garment-${itemId}-${first.id}-${second.id}`,
        type: 'duplicate-garment',
        severity: 'medium',
        eventId: first.id,
        eventName: first.name,
        messageKey: 'duplicateGarment',
        messageParams: { eventA: first.name, eventB: second.name },
      });
    }
  }

  return conflicts;
}

/** Conservative heuristic: only flags when EVERY item in the assigned
 * outfit shares the opposite-season tag from the forecast — a mixed
 * wardrobe (e.g. a jacket over a summer tee) never triggers a false
 * positive. `clothing_items.season` uses SEASON_OPTIONS from
 * garmentTaxonomy.ts; items with no season set are ignored rather than
 * assumed. */
export function detectWeatherMismatchConflicts(events: PlannerEvent[], forecast: ForecastDay[]): PlannerConflict[] {
  const forecastByDate = new Map(forecast.map((f) => [f.date, f]));
  const conflicts: PlannerConflict[] = [];

  for (const ev of events) {
    if (!ev.outfit_id || !ev.outfits) continue;
    const day = forecastByDate.get(ev.event_date);
    if (!day) continue;

    const seasons = (ev.outfits.outfit_items || [])
      .map((oi) => oi.clothing_items?.season)
      .filter((s): s is string => !!s);
    if (seasons.length === 0) continue;

    const allSummerOnly = seasons.every((s) => s === 'Summer');
    const allWinterOnly = seasons.every((s) => s === 'Winter');

    if (day.lowCelsius <= COLD_THRESHOLD_C && allSummerOnly) {
      conflicts.push({
        id: `weather-cold-${ev.id}`,
        type: 'weather-mismatch',
        severity: 'high',
        eventId: ev.id,
        eventName: ev.name,
        messageKey: 'weatherTooCold',
        messageParams: { eventName: ev.name, low: Math.round(day.lowCelsius) },
      });
    } else if (day.highCelsius >= HOT_THRESHOLD_C && allWinterOnly) {
      conflicts.push({
        id: `weather-hot-${ev.id}`,
        type: 'weather-mismatch',
        severity: 'medium',
        eventId: ev.id,
        eventName: ev.name,
        messageKey: 'weatherTooHot',
        messageParams: { eventName: ev.name, high: Math.round(day.highCelsius) },
      });
    }
  }

  return conflicts;
}

/** Any event within the next MISSING_OUTFIT_WINDOW_DAYS days with no
 * outfit assigned yet — scoped to "soon" so this doesn't flood the list
 * with every far-future event that just hasn't been planned yet. */
export function detectMissingOutfitConflicts(events: PlannerEvent[], todayLocalISO: string): PlannerConflict[] {
  return events
    .filter((ev) => !ev.outfit_id)
    .filter((ev) => {
      const diff = daysBetween(todayLocalISO, ev.event_date);
      return diff >= 0 && diff <= MISSING_OUTFIT_WINDOW_DAYS;
    })
    .map((ev) => ({
      id: `missing-outfit-${ev.id}`,
      type: 'missing-outfit' as const,
      severity: 'low' as const,
      eventId: ev.id,
      eventName: ev.name,
      messageKey: 'missingOutfit',
      messageParams: { eventName: ev.name },
    }));
}

/** Important events (see IMPORTANT_EVENT_CATEGORIES) starting within
 * UNPREPARED_WINDOW_HOURS with no outfit assigned — higher severity than a
 * generic missing-outfit conflict, since there's much less time left to
 * react. Uses start_time when present for a tighter window; falls back to
 * "today" when it isn't (respects the audit's date-only schema finding —
 * never invents a time). */
export function detectUnpreparedImportantEventConflicts(
  events: PlannerEvent[],
  todayLocalISO: string
): PlannerConflict[] {
  return events
    .filter((ev) => !ev.outfit_id)
    .filter((ev) => IMPORTANT_EVENT_CATEGORIES.includes(ev.category as EventCategory))
    .filter((ev) => {
      const diffDays = daysBetween(todayLocalISO, ev.event_date);
      if (diffDays < 0) return false;
      if (diffDays === 0) return true; // today, regardless of start_time granularity
      if (diffDays === 1 && ev.start_time) {
        // Tomorrow with a known start time — only flag if within the 24h window.
        const [h] = ev.start_time.split(':').map(Number);
        return h <= new Date().getHours();
      }
      return false;
    })
    .map((ev) => ({
      id: `unprepared-${ev.id}`,
      type: 'unprepared-important' as const,
      severity: 'high' as const,
      eventId: ev.id,
      eventName: ev.name,
      messageKey: 'unpreparedImportant',
      messageParams: { eventName: ev.name },
    }));
}

export function detectAllConflicts(
  events: PlannerEvent[],
  forecast: ForecastDay[],
  todayLocalISO: string
): PlannerConflict[] {
  const unprepared = detectUnpreparedImportantEventConflicts(events, todayLocalISO);
  const unpreparedEventIds = new Set(unprepared.map((c) => c.eventId));

  return [
    ...unprepared,
    ...detectDuplicateGarmentConflicts(events),
    ...detectWeatherMismatchConflicts(events, forecast),
    // Skip the generic "missing outfit" conflict for events already covered
    // by the higher-severity "unprepared important event" conflict above —
    // avoids showing two cards about the same underlying gap.
    ...detectMissingOutfitConflicts(events, todayLocalISO).filter((c) => !unpreparedEventIds.has(c.eventId)),
  ];
}
