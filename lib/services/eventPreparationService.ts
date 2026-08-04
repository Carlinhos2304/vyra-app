/**
 * eventPreparationService.ts
 *
 * Smart Planner spec item 7: Upcoming Preparations. Deliberately rule-based
 * and deterministic rather than an AI call — the spec's own examples
 * ("Tomorrow: Business Meeting -> Recommended: Iron your white shirt
 * tonight.", "Laundry recommended before Friday.") are the kind of
 * calendar-math + wardrobe-lookup logic that doesn't need a model, and
 * keeping it rule-based means Upcoming Preparations renders instantly with
 * zero AI latency/cost, unlike the outfit suggestions themselves (which DO
 * reuse the real AI infra — see useEventOutfitAssignment.ts). Like
 * plannerConflictService, every function here is pure — no Supabase or
 * WeatherService calls — so the hook that uses this reuses already-fetched
 * data instead of issuing its own queries.
 */

import type { PlannerEvent } from './plannerTypes';

export type PreparationTipType = 'review-outfit' | 'assign-outfit' | 'laundry';

export interface PreparationTip {
  id: string;
  type: PreparationTipType;
  eventId?: string;
  /** i18n key under planner.smartPlanner.preparations.* */
  messageKey: string;
  messageParams?: Record<string, string | number>;
}

const LAUNDRY_LOOKAHEAD_DAYS = 7;

function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function weekdayLabel(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' });
}

/** "Tonight, review your outfit for tomorrow's <important event>" — only for
 * events happening tomorrow that already HAVE an outfit assigned (nothing
 * to prepare if there's no outfit yet — that's assign-outfit's job below). */
function buildReviewOutfitTips(events: PlannerEvent[], todayLocalISO: string): PreparationTip[] {
  return events
    .filter((ev) => ev.outfit_id && daysBetween(todayLocalISO, ev.event_date) === 1)
    .map((ev) => ({
      id: `review-${ev.id}`,
      type: 'review-outfit' as const,
      eventId: ev.id,
      messageKey: 'reviewOutfitTonight',
      messageParams: { eventName: ev.name },
    }));
}

/** "Tomorrow: <event> still has no outfit — assign one tonight." */
function buildAssignOutfitTips(events: PlannerEvent[], todayLocalISO: string): PreparationTip[] {
  return events
    .filter((ev) => !ev.outfit_id && daysBetween(todayLocalISO, ev.event_date) === 1)
    .map((ev) => ({
      id: `assign-${ev.id}`,
      type: 'assign-outfit' as const,
      eventId: ev.id,
      messageKey: 'assignOutfitTonight',
      messageParams: { eventName: ev.name },
    }));
}

/** A garment reused across 2+ different events within the lookahead window
 * -> a laundry heads-up before the earlier of the two dates. Only considers
 * garments with a known name (falls back silently otherwise — never shows
 * "undefined" in a tip). */
function buildLaundryTips(events: PlannerEvent[], todayLocalISO: string): PreparationTip[] {
  const withinWindow = events.filter((ev) => {
    const diff = daysBetween(todayLocalISO, ev.event_date);
    return diff >= 0 && diff <= LAUNDRY_LOOKAHEAD_DAYS && !!ev.outfit_id && !!ev.outfits;
  });

  const garmentToDates = new Map<string, { name: string; dates: string[] }>();
  for (const ev of withinWindow) {
    for (const oi of ev.outfits?.outfit_items || []) {
      const item = oi.clothing_items;
      if (!item?.id || !item.name) continue;
      const entry = garmentToDates.get(item.id) || { name: item.name, dates: [] };
      entry.dates.push(ev.event_date);
      garmentToDates.set(item.id, entry);
    }
  }

  const tips: PreparationTip[] = [];
  for (const [itemId, { name, dates }] of garmentToDates) {
    const uniqueDates = Array.from(new Set(dates)).sort();
    if (uniqueDates.length < 2) continue;
    const earliestRepeat = uniqueDates[1]; // the date it's needed again
    tips.push({
      id: `laundry-${itemId}`,
      type: 'laundry',
      messageKey: 'laundryBeforeDate',
      messageParams: { itemName: name, dateLabel: weekdayLabel(earliestRepeat) },
    });
  }

  return tips;
}

export function generatePreparationTips(events: PlannerEvent[], todayLocalISO: string): PreparationTip[] {
  return [
    ...buildAssignOutfitTips(events, todayLocalISO),
    ...buildReviewOutfitTips(events, todayLocalISO),
    ...buildLaundryTips(events, todayLocalISO),
  ];
}
