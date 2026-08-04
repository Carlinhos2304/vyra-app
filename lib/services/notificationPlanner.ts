/**
 * notificationPlanner.ts
 *
 * Category 1 (Planner Notifications) — multiple reminders per event, edit,
 * cancel, repeat — plus category 5 (Planner AI): a proactive nudge when an
 * important event with no outfit yet is approaching.
 *
 * Both categories key off the same `PlannerEvent` shape already shared
 * across the Planner (see plannerTypes.ts) and the same
 * `IMPORTANT_EVENT_CATEGORIES` list eventPreparationService/
 * plannerConflictService already use — no new "what counts as important"
 * vocabulary invented here.
 *
 * iOS caps an app at 64 pending local notifications. A recurring event can
 * materialize up to ~104 occurrence rows (recurringEventService's hard cap)
 * and this file schedules up to 3 reminders each — clearly enough to blow
 * that budget on its own. ROLLING_WINDOW_DAYS is the mitigation: only
 * occurrences starting within the window get reminders scheduled right now.
 * `resyncPlannerReminders()` is meant to be called on every app foreground
 * (see notificationService.runNotificationSweep) to top up reminders for
 * occurrences that have since entered the window — enqueueAndSchedule's
 * dedupe means re-running this as often as the app opens is always safe.
 */

import { supabase } from '../supabase';
import * as Queue from './notificationQueue';
import { IMPORTANT_EVENT_CATEGORIES } from '../../constants/eventCategories';
import type { PlannerEvent } from './plannerTypes';
import type { NotificationPreferences, SupportedNotificationLanguage } from './notificationTypes';

/** Minutes-before-event offsets used for any event that has a start_time.
 * Ordered longest-lead-time first purely for readability; scheduling order
 * doesn't matter since each is an independent local notification. */
export const DEFAULT_REMINDER_OFFSETS_MINUTES = [24 * 60, 60, 30];

/** Only events starting within this many days get reminders scheduled
 * eagerly — see file header. */
const ROLLING_WINDOW_DAYS = 30;

/** How many days out counts as "approaching" for the Planner AI nudge. */
const PLANNER_AI_LOOKAHEAD_DAYS = 3;

function eventStartDateTime(event: PlannerEvent): Date {
  const [y, m, d] = event.event_date.split('-').map(Number);
  if (event.start_time) {
    const [h, min] = event.start_time.split(':').map(Number);
    return new Date(y, m - 1, d, h, min, 0, 0);
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function formatTime12h(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function partOfDay(hour: number, language: SupportedNotificationLanguage): string {
  if (language === 'es') {
    if (hour >= 18) return 'esta noche';
    if (hour >= 12) return 'esta tarde';
    return 'esta mañana';
  }
  if (hour >= 18) return 'tonight';
  if (hour >= 12) return 'this afternoon';
  return 'this morning';
}

/** Builds the notification copy for one (event, offset) pair — matches the
 * spec's own examples ("Gym in 30 minutes", "Dinner tonight at 8 PM",
 * "Interview tomorrow", "Meeting starts in one hour") rather than one generic
 * template for every offset. */
function buildReminderContent(
  event: PlannerEvent,
  offsetMinutes: number,
  language: SupportedNotificationLanguage
): { title: string; body: string } {
  const timeLabel = event.start_time ? formatTime12h(event.start_time) : null;
  const title = language === 'es' ? 'Vyra Planner' : 'Vyra Planner';

  if (offsetMinutes >= 1440) {
    const body =
      language === 'es'
        ? `${event.name} mañana${timeLabel ? ` a las ${timeLabel}` : ''}.`
        : `${event.name} tomorrow${timeLabel ? ` at ${timeLabel}` : ''}.`;
    return { title, body };
  }

  if (offsetMinutes === 60) {
    const body = language === 'es' ? `${event.name} comienza en una hora.` : `${event.name} starts in one hour.`;
    return { title, body };
  }

  if (offsetMinutes > 0) {
    const body = language === 'es' ? `${event.name} en ${offsetMinutes} minutos.` : `${event.name} in ${offsetMinutes} minutes.`;
    return { title, body };
  }

  // offsetMinutes === 0: a same-day heads-up scheduled earlier in the day
  // rather than a countdown — "Dinner tonight at 8 PM"-style.
  const hour = event.start_time ? Number(event.start_time.split(':')[0]) : 9;
  const body =
    language === 'es'
      ? `${event.name} ${partOfDay(hour, 'es')}${timeLabel ? ` a las ${timeLabel}` : ''}.`
      : `${event.name} ${partOfDay(hour, 'en')}${timeLabel ? ` at ${timeLabel}` : ''}.`;
  return { title, body };
}

/**
 * Schedules the default reminder set for one event. Idempotent: always
 * cancels this event's existing reminders first, so calling it again after
 * an edit (time changed, name changed) is the correct "reschedule" flow —
 * there's no separate editEventReminders() to keep in sync with this one.
 */
export async function scheduleEventReminders(
  event: PlannerEvent,
  prefs: NotificationPreferences,
  language: SupportedNotificationLanguage
): Promise<void> {
  await cancelEventReminders(event.id);

  if (!prefs.plannerEnabled) return;

  const start = eventStartDateTime(event);
  const daysUntil = (start.getTime() - Date.now()) / 86_400_000;
  if (daysUntil > ROLLING_WINDOW_DAYS) return; // Out of the rolling window — resyncPlannerReminders picks it up later.

  if (!event.start_time) {
    // Date-only event: a single day-before heads-up at the offset-0 slot
    // (worded as a same-day nudge would be wrong here — there's no time to
    // anchor "tonight at..." to), scheduled for the morning before.
    const dayBefore = new Date(start);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(9, 0, 0, 0);
    const { title, body } = buildReminderContent(event, 1440, language);
    await Queue.enqueueAndSchedule(
      {
        category: 'planner',
        dedupeKey: `planner-${event.id}-1440`,
        identifier: `planner-${event.id}-1440`,
        title,
        body,
        actionRoute: '/planner/event-details',
        actionParams: { id: event.id },
        triggerDate: dayBefore,
      },
      prefs,
      { alwaysAllowWeekend: true } // A user-created reminder for their own event isn't discretionary outreach.
    );
    return;
  }

  for (const offset of DEFAULT_REMINDER_OFFSETS_MINUTES) {
    const triggerDate = new Date(start.getTime() - offset * 60_000);
    const { title, body } = buildReminderContent(event, offset, language);
    await Queue.enqueueAndSchedule(
      {
        category: 'planner',
        dedupeKey: `planner-${event.id}-${offset}`,
        identifier: `planner-${event.id}-${offset}`,
        title,
        body,
        actionRoute: '/planner/event-details',
        actionParams: { id: event.id },
        triggerDate,
      },
      prefs,
      { alwaysAllowWeekend: true }
    );
  }
}

/** Cancels every reminder scheduled for one event, regardless of how many
 * offsets it has — call before deleting an event. */
export async function cancelEventReminders(eventId: string): Promise<void> {
  await Queue.cancelByDedupeKeyPrefix(`planner-${eventId}-`);
}

/**
 * Schedules reminders for every occurrence of a recurring series in one
 * call — the "repeat" support the spec asks for. Each occurrence is just a
 * normal PlannerEvent row (see recurringEventService's header), so this is
 * literally scheduleEventReminders() looped, bounded by the same rolling
 * window each individual call already respects.
 */
export async function scheduleRemindersForOccurrences(
  events: PlannerEvent[],
  prefs: NotificationPreferences,
  language: SupportedNotificationLanguage
): Promise<void> {
  for (const event of events) {
    await scheduleEventReminders(event, prefs, language);
  }
}

/**
 * Meant to run once per app foreground (see
 * notificationService.runNotificationSweep). Re-scans the caller's upcoming
 * events within ROLLING_WINDOW_DAYS and (re)schedules reminders for each —
 * enqueueAndSchedule's dedupe makes this a no-op for events already
 * scheduled, so this is what "tops up" reminders for occurrences of a long
 * recurring series as they enter the window over time.
 */
export async function resyncPlannerReminders(prefs: NotificationPreferences, language: SupportedNotificationLanguage): Promise<void> {
  if (!prefs.plannerEnabled) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const todayISO = new Date().toISOString().slice(0, 10);
  const windowEndISO = new Date(Date.now() + ROLLING_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('events')
    .select('id, name, event_date, start_time, end_time, category, location, outfit_id')
    .eq('user_id', user.id)
    .gte('event_date', todayISO)
    .lte('event_date', windowEndISO);

  if (error) {
    console.error('[notificationPlanner] resyncPlannerReminders failed to fetch events:', error.message);
    return;
  }

  await scheduleRemindersForOccurrences((data || []) as unknown as PlannerEvent[], prefs, language);
}

/** Planner AI candidates: important-category events within
 * PLANNER_AI_LOOKAHEAD_DAYS that still have no outfit assigned. Pure
 * function over already-fetched events, same shape as
 * plannerConflictService/eventPreparationService — no query of its own. */
export function findPlannerAiCandidates(events: PlannerEvent[], todayLocalISO: string): PlannerEvent[] {
  const [ty, tm, td] = todayLocalISO.split('-').map(Number);
  const todayUTC = Date.UTC(ty, tm - 1, td);

  return events.filter((ev) => {
    if (ev.outfit_id) return false;
    if (!IMPORTANT_EVENT_CATEGORIES.includes(ev.category as (typeof IMPORTANT_EVENT_CATEGORIES)[number])) return false;
    const [ey, em, ed] = ev.event_date.split('-').map(Number);
    const eventUTC = Date.UTC(ey, em - 1, ed);
    const daysAway = Math.round((eventUTC - todayUTC) / 86_400_000);
    return daysAway >= 0 && daysAway <= PLANNER_AI_LOOKAHEAD_DAYS;
  });
}

/**
 * Schedules a single "let AI suggest an outfit" nudge per candidate event,
 * deep-linking to event-details — where EventOutfitAssignment (already
 * built for the Smart Planner) generates and lets the user accept a
 * suggestion. Deliberately does NOT call generateOutfits() itself: that
 * would spend an AI call for every qualifying event on every app open
 * whether or not the user ever taps through, where the existing
 * EventOutfitAssignment flow already calls it on demand, right when the
 * user is actually looking at that event.
 */
export async function schedulePlannerAiNudges(
  events: PlannerEvent[],
  todayLocalISO: string,
  prefs: NotificationPreferences,
  language: SupportedNotificationLanguage
): Promise<void> {
  if (!prefs.plannerAiEnabled) return;

  const candidates = findPlannerAiCandidates(events, todayLocalISO);
  const notificationTime = prefs.notificationTime;
  const [hh, mm] = notificationTime.split(':').map(Number);

  for (const event of candidates) {
    const triggerDate = new Date();
    triggerDate.setHours(hh, mm, 0, 0);
    if (triggerDate.getTime() <= Date.now()) triggerDate.setDate(triggerDate.getDate() + 1);

    const title = language === 'es' ? 'Sugerencia de outfit' : 'Outfit suggestion';
    const body =
      language === 'es'
        ? `${event.name} se acerca — deja que la IA te sugiera un outfit.`
        : `${event.name} is approaching — let AI suggest an outfit.`;

    await Queue.enqueueAndSchedule(
      {
        category: 'planner_ai',
        dedupeKey: `planner_ai-${event.id}-${todayLocalISO}`,
        title,
        body,
        actionRoute: '/planner/event-details',
        actionParams: { id: event.id },
        triggerDate,
      },
      prefs
    );
  }
}
