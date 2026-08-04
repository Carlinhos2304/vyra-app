/**
 * recurringEventService.ts
 *
 * Recurring events (Smart Planner spec item 9: Daily / Weekly / Monthly /
 * Custom) are modeled as materialized rows, not a virtual/expanded-at-read
 * rule — see the migration comment in
 * supabase/migrations/20260804141804_planner_smart_features.sql for why.
 * One "parent" event (the occurrence the user actually filled out a form
 * for) carries the recurrence_type/interval/end_date; every additional
 * occurrence is a plain `events` row with `recurrence_parent_id` pointing
 * back at the parent. Every existing query against `events` — day lookups,
 * upcoming-events lists, useNextEvent — keeps working with zero changes,
 * because a recurring series is just N ordinary rows.
 *
 * Deliberately NOT infinite: a recurrence with no end date is capped at
 * MAX_OCCURRENCES_WITHOUT_END_DATE materialized rows rather than silently
 * generating forever. Callers should surface how many occurrences were
 * actually created (createRecurringEvent's return value) rather than
 * assuming the request was honored exactly as asked — no silent
 * truncation.
 */

import { supabase } from '../supabase';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface RecurrenceRule {
  type: RecurrenceType;
  /** Only meaningful for 'custom' — repeat every N days. Ignored otherwise. */
  intervalDays?: number;
  /** YYYY-MM-DD, inclusive. When omitted, generation stops at
   * MAX_OCCURRENCES_WITHOUT_END_DATE instead of running unbounded. */
  endDateISO?: string | null;
}

export class RecurringEventError extends Error {}

const MAX_OCCURRENCES_WITHOUT_END_DATE = 24;
/** Even with an explicit end date, never materialize more than this many
 * rows for a single series — a safety ceiling against a mistyped far-future
 * end date silently creating thousands of rows. */
const MAX_OCCURRENCES_HARD_CAP = 104; // ~2 years of weekly occurrences

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function addMonthsISO(dateISO: string, months: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/**
 * Pure function — computes every occurrence date (including the start date
 * itself, at index 0) for a recurrence rule. No I/O, fully unit-testable.
 */
export function computeOccurrenceDates(startDateISO: string, rule: RecurrenceRule): string[] {
  const stepDays =
    rule.type === 'daily' ? 1 : rule.type === 'weekly' ? 7 : rule.type === 'custom' ? Math.max(1, rule.intervalDays || 1) : null;

  const dates: string[] = [startDateISO];
  const cap = rule.endDateISO ? MAX_OCCURRENCES_HARD_CAP : MAX_OCCURRENCES_WITHOUT_END_DATE;

  let cursor = startDateISO;
  for (let i = 1; i < cap; i++) {
    cursor = rule.type === 'monthly' ? addMonthsISO(cursor, 1) : addDaysISO(cursor, stepDays as number);
    if (rule.endDateISO && cursor > rule.endDateISO) break;
    dates.push(cursor);
  }

  return dates;
}

export interface RecurringEventBaseInput {
  name: string;
  category: string;
  location: string;
  description: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface CreateRecurringEventResult {
  parentEventId: string;
  occurrenceCount: number;
  /** True when generation stopped because of MAX_OCCURRENCES_WITHOUT_END_DATE
   * or MAX_OCCURRENCES_HARD_CAP rather than reaching the requested end date
   * naturally (there wasn't one, or it was further out than the cap allows). */
  wasCapped: boolean;
}

/**
 * Inserts a recurring event's parent row plus every generated child
 * occurrence. All rows share the same name/category/location/description —
 * per-occurrence edits (e.g. "just this one" changes) are done afterward via
 * the normal event-details.tsx edit flow, same as editing any single event.
 */
export async function createRecurringEvent(
  base: RecurringEventBaseInput,
  startDateISO: string,
  rule: RecurrenceRule
): Promise<CreateRecurringEventResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new RecurringEventError('Your session has expired. Please sign in again.');
  }

  const occurrenceDates = computeOccurrenceDates(startDateISO, rule);
  const requestedButUncapped = rule.endDateISO
    ? occurrenceDates[occurrenceDates.length - 1] < rule.endDateISO
    : true;
  const wasCapped = occurrenceDates.length >= MAX_OCCURRENCES_HARD_CAP || (!rule.endDateISO && occurrenceDates.length >= MAX_OCCURRENCES_WITHOUT_END_DATE);

  const { data: parent, error: parentErr } = await supabase
    .from('events')
    .insert({
      user_id: user.id,
      name: base.name,
      event_date: startDateISO,
      category: base.category,
      location: base.location,
      description: base.description,
      start_time: base.startTime ?? null,
      end_time: base.endTime ?? null,
      recurrence_type: rule.type,
      recurrence_interval: rule.type === 'custom' ? rule.intervalDays ?? null : null,
      recurrence_end_date: rule.endDateISO ?? null,
    })
    .select('id')
    .single();

  if (parentErr) {
    throw new RecurringEventError(parentErr.message);
  }

  const childDates = occurrenceDates.slice(1);
  if (childDates.length > 0) {
    const childRows = childDates.map((occurrenceDate) => ({
      user_id: user.id,
      name: base.name,
      event_date: occurrenceDate,
      category: base.category,
      location: base.location,
      description: base.description,
      start_time: base.startTime ?? null,
      end_time: base.endTime ?? null,
      recurrence_type: rule.type,
      recurrence_interval: rule.type === 'custom' ? rule.intervalDays ?? null : null,
      recurrence_end_date: rule.endDateISO ?? null,
      recurrence_parent_id: parent.id,
    }));

    const { error: childrenErr } = await supabase.from('events').insert(childRows);
    if (childrenErr) {
      throw new RecurringEventError(childrenErr.message);
    }
  }

  void requestedButUncapped; // reserved for a future "series continued beyond N occurrences" banner

  return {
    parentEventId: parent.id,
    occurrenceCount: occurrenceDates.length,
    wasCapped,
  };
}
