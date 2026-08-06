/**
 * notificationTypes.ts
 *
 * Shared vocabulary for the whole notification system — every other
 * notification* service imports its category/content/preference shapes from
 * here instead of redeclaring them, the same role plannerTypes.ts plays for
 * the Planner services.
 *
 * NotificationCategory's 7 values map 1:1 to:
 *   - the `category` check constraint on notification_log
 *     (supabase/migrations/20260804200000_notifications_system.sql)
 *   - the 7 `*_enabled` columns on notification_preferences
 *   - the 6 user-facing feature groups from the spec, with "Planner
 *     Notifications" and "Planner AI" kept as two separate categories
 *     (`planner` / `planner_ai`) even though both concern events, because
 *     they have very different preferences semantics: a user may want event
 *     reminders but not want the AI proactively nudging outfit prep, or vice
 *     versa.
 */

export type NotificationCategory =
  | 'planner'
  | 'weather'
  | 'outfit_reminder'
  | 'ai_suggestion'
  | 'wardrobe'
  | 'planner_ai'
  | 'weekly_summary';

export type NotificationLogStatus = 'scheduled' | 'delivered' | 'cancelled' | 'failed';

export interface NotificationPreferences {
  plannerEnabled: boolean;
  weatherEnabled: boolean;
  outfitRemindersEnabled: boolean;
  aiSuggestionsEnabled: boolean;
  wardrobeEnabled: boolean;
  plannerAiEnabled: boolean;
  weeklySummaryEnabled: boolean;

  quietHoursEnabled: boolean;
  /** "HH:MM", 24h, local to the device. */
  quietHoursStart: string;
  quietHoursEnd: string;
  /** Preferred local time for the day's "batch" of non-time-critical
   * notifications (outfit reminder, AI suggestions, weekly summary). Planner
   * event reminders ignore this — they're tied to the event's own time. */
  notificationTime: string;
  weekendNotificationsEnabled: boolean;
}

/** Mirrors the DB defaults in notification_preferences exactly — used before
 * the first fetch resolves and as a non-fatal fallback if it fails, matching
 * the rest of the app's "never block the UI on a preferences read" pattern
 * (see useWeather/useTodayOutfit's isLoading:true-first convention). */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  plannerEnabled: true,
  weatherEnabled: true,
  outfitRemindersEnabled: true,
  aiSuggestionsEnabled: true,
  wardrobeEnabled: true,
  plannerAiEnabled: true,
  weeklySummaryEnabled: true,

  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  notificationTime: '08:00',
  weekendNotificationsEnabled: true,
};

/** One row of notification_log — see that table's comment for the outbox
 * rationale (dedupe today, push-ready tomorrow). */
export interface NotificationLogEntry {
  id: string;
  category: NotificationCategory;
  dedupeKey: string;
  title: string;
  body: string;
  actionRoute: string | null;
  localIdentifier: string | null;
  status: NotificationLogStatus;
  scheduledFor: string | null;
  createdAt: string;
}

/** The input every category service ultimately hands to
 * notificationQueue.enqueueAndSchedule() — content plus enough metadata for
 * the queue to dedupe, schedule, and log it without the category service
 * needing to know anything about expo-notifications or Supabase directly. */
export interface NotificationRequest {
  category: NotificationCategory;
  /** Stable per-notification key, unique per user — see notification_log's
   * `unique(user_id, dedupe_key)`. Re-requesting the same key is a safe no-op. */
  dedupeKey: string;
  title: string;
  body: string;
  /** expo-router path to open on tap, e.g. "/planner/event-details" — paired
   * with `actionParams` rather than a pre-built query string so the tap
   * handler (App.tsx / _layout.tsx notification-response listener) can do
   * `router.push({ pathname: actionRoute, params: actionParams })` directly. */
  actionRoute?: string | null;
  actionParams?: Record<string, string> | null;
  /** When this notification should fire. Category services compute this in
   * local time; notificationQueue passes it through notificationScheduler's
   * quiet-hours/weekend shaping before actually scheduling it. */
  triggerDate: Date;
  /** Category-scoped identifier suffix (e.g. an event id + offset) folded
   * into the expo-notifications identifier so notificationPlanner can cancel
   * a specific reminder later without affecting sibling reminders for the
   * same event. Falls back to `dedupeKey` when omitted. */
  identifier?: string;
}

/** Simple bilingual copy helper shape used by every category service's
 * content builder — Vyra's local notification content isn't routed through
 * the React `useLanguage()` i18n system (services are plain TS, not
 * components), so each service keeps its own small `{ en, es }` templates
 * and takes the caller's current language as a plain parameter instead. */
export type SupportedNotificationLanguage = 'en' | 'es';

/**
 * "YYYY-MM-DD" in the DEVICE's local calendar day — deliberately NOT
 * `date.toISOString().slice(0, 10)`, which reads UTC and silently shifts by
 * one day for any user west of UTC in the evening (or east of UTC just after
 * midnight). Every category service that computes "today"/"this week" for
 * dedupe keys or date-range queries must go through this one helper so that
 * boundary math (rolling windows, weekly summaries, the daily sweep
 * throttle) agrees on what day it is.
 *
 * Lives here (not in notificationService.ts, where it originated) so
 * notificationPlanner.ts can import it too without creating a circular
 * import — notificationService.ts imports FROM notificationPlanner.ts.
 */
export function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
