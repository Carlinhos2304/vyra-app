/**
 * useDaySummary — Smart Planner spec item 1 (Day Summary on open). A pure
 * selector over data the screen already fetched (usePlannerCalendarData's
 * selectedDayEvents/weekPlans and useWeather's current snapshot) — it does
 * NOT issue its own query, so opening the Planner never costs an extra
 * round trip just to render this card. Kept as a hook (rather than a plain
 * util) for parity with the rest of the Planner's hooks/ layer and so a
 * future version can add its own local state (e.g. a "dismissed today"
 * flag) without changing callers.
 *
 * Outfit source resolution (added after user feedback on the first Smart
 * Planner delivery): a "day look" (outfit_plans, assigned independently of
 * any event) and an "event look" (events.outfit_id, assigned to one
 * specific event) are different underlying records, but showing them as
 * two totally disconnected concepts confused the actual UX — a user who
 * assigns an outfit to their one event that day expects the Day Summary to
 * reflect that, not say "no outfit planned" until they tap into the event.
 * So: an explicit day-level plan always wins when one exists; otherwise, the
 * chronologically-soonest event that day with its own outfit assigned
 * becomes the day's effective look (tagged with
 * sourceEventId/sourceEventName so the UI can say "Outfit for <event>"
 * instead of implying a separate plan exists). If other events that day
 * ALSO have their own outfit, that's surfaced too (additionalOutfitCount)
 * rather than hidden — after the first version shipped, going from one
 * event with an outfit to two made the card revert to "nothing planned",
 * which read as a regression even though both events genuinely had looks
 * assigned. The Day Timeline still shows each event's own outfit
 * individually; this card just never goes back to looking empty once real
 * outfits exist.
 */

import { useMemo } from 'react';
import type { PlannerDayPlan, PlannerEvent } from '../../lib/services/plannerTypes';
import type { WeatherSnapshot } from '../../lib/services/weatherService';

export interface DaySummary {
  eventCount: number;
  nextEvent: PlannerEvent | null;
  plan: PlannerDayPlan | null;
  temperatureCelsius: number | null;
  conditionLabel: string | null;
}

function deriveEffectivePlan(dayLevelPlan: PlannerDayPlan | null, dayEvents: PlannerEvent[]): PlannerDayPlan | null {
  if (dayLevelPlan) return dayLevelPlan;

  const eventsWithOutfits = dayEvents
    .filter((ev) => ev.outfit_id && ev.outfits)
    // Chronologically soonest first — ties (both untimed, or same time)
    // broken by id so the pick is stable across re-renders instead of
    // depending on whatever order the DB happened to return.
    .slice()
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '') || a.id.localeCompare(b.id));

  if (eventsWithOutfits.length === 0) return null;

  const [event, ...rest] = eventsWithOutfits;
  const items = event.outfits?.outfit_items || [];
  const garmentImages = items
    .map((item) => item.clothing_items?.image_url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

  return {
    id: `event-${event.id}`,
    outfitId: event.outfit_id as string,
    outfitName: event.outfits?.name || '',
    garmentImages,
    occasion: event.outfits?.occasion ?? null,
    sourceEventId: event.id,
    sourceEventName: event.name,
    additionalOutfitCount: rest.length > 0 ? rest.length : undefined,
  };
}

export function useDaySummary(
  dayEvents: PlannerEvent[],
  plan: PlannerDayPlan | null,
  isSelectedDayToday: boolean,
  currentWeather: WeatherSnapshot | null
): DaySummary {
  return useMemo(() => {
    // Untimed events sort after timed ones (empty string is always
    // lexicographically first, so give untimed a value that sorts last
    // instead) — numeric-safe and id-tiebroken, same approach as
    // useDayTimeline, so "next event" here always agrees with what the
    // timeline shows as first.
    const sortKey = (ev: PlannerEvent) => (ev.start_time ? ev.start_time : '99:99');
    const sorted = dayEvents.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.id.localeCompare(b.id));

    return {
      eventCount: dayEvents.length,
      nextEvent: sorted[0] ?? null,
      plan: deriveEffectivePlan(plan, dayEvents),
      // Current weather is only meaningful for "today" — a future day's
      // temperature comes from the forecast (see useEventWeather), not the
      // "current conditions right now" snapshot.
      temperatureCelsius: isSelectedDayToday ? currentWeather?.temperatureCelsius ?? null : null,
      conditionLabel: isSelectedDayToday ? currentWeather?.conditionLabel ?? null : null,
    };
  }, [dayEvents, plan, isSelectedDayToday, currentWeather]);
}
