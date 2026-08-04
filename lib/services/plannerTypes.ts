/**
 * plannerTypes.ts
 *
 * Shared shape for a "planner event" used across the Smart Planner's
 * services, hooks, and components (usePlannerCalendarData,
 * plannerConflictService, eventPreparationService, DayTimeline,
 * EventOutfitAssignment, etc.). Centralized so every piece agrees on the
 * same fields instead of each screen declaring its own ad hoc `any`-typed
 * event shape (which is what create-event.tsx/event-details.tsx/
 * calendar.tsx each did independently before this refactor).
 */

import type { EventCategory } from '../../constants/eventCategories';

export interface PlannerOutfitItemImage {
  clothing_items: { id?: string; name?: string | null; image_url: string | null; season?: string | null } | null;
}

export interface PlannerOutfitSummary {
  id: string;
  name: string;
  occasion: string | null;
  ai_confidence?: number | null;
  outfit_items?: PlannerOutfitItemImage[];
}

export interface PlannerEvent {
  id: string;
  user_id?: string;
  name: string;
  /** YYYY-MM-DD */
  event_date: string;
  /** HH:MM:SS or null — added by the 2026-08-04 migration; absent on events
   * created before it. Never fabricate a value when this is null. */
  start_time: string | null;
  end_time: string | null;
  category: string;
  location: string | null;
  description?: string | null;
  outfit_id: string | null;
  outfits?: PlannerOutfitSummary | null;
  recurrence_type?: string | null;
  recurrence_parent_id?: string | null;
}

/** Narrows PlannerEvent.category to the canonical vocabulary where a caller
 * has already validated it — most DB rows will match EVENT_CATEGORIES, but
 * the column is free text, so this is an assertion helper, not a runtime
 * guarantee. */
export function asEventCategory(category: string): EventCategory {
  return category as EventCategory;
}

export interface PlannerDayPlan {
  id: string;
  outfitId: string;
  outfitName: string;
  coverImage: string | null;
  occasion: string | null;
  /** Set when this "day look" wasn't an explicit outfit_plans row but was
   * derived from a single event's assigned outfit — see useDaySummary.ts.
   * Lets the UI say "Outfit for <event>" instead of implying a separate,
   * independent day-level plan exists. */
  sourceEventId?: string;
  sourceEventName?: string;
  /** Set when other events THAT SAME DAY also have their own outfit
   * assigned, so the UI can say "+N more" instead of silently picking one
   * event's outfit and hiding that others exist. */
  additionalOutfitCount?: number;
}
