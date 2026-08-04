/**
 * notificationPreferences.ts
 *
 * CRUD for the notification_preferences table (one additive row per user,
 * see supabase/migrations/20260804200000_notifications_system.sql). Sits
 * underneath the pre-existing `profiles.notifications_enabled` master
 * switch, which this file never reads or writes — that column is still
 * owned entirely by useNotifications.ts / profile.tsx / onboarding, unchanged.
 *
 * Lazily creates a row on first read instead of requiring a data-migration
 * backfill: every existing user (and every brand-new signup, with no extra
 * auth-trigger plumbing needed) gets DEFAULT_NOTIFICATION_PREFERENCES the
 * moment anything asks for their preferences, via a plain upsert.
 */

import { supabase } from '../supabase';
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferences } from './notificationTypes';

interface NotificationPreferencesRow {
  planner_enabled: boolean;
  weather_enabled: boolean;
  outfit_reminders_enabled: boolean;
  ai_suggestions_enabled: boolean;
  wardrobe_enabled: boolean;
  planner_ai_enabled: boolean;
  weekly_summary_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  notification_time: string;
  weekend_notifications_enabled: boolean;
}

/** Postgres `time` columns round-trip as "HH:MM:SS" — trim to "HH:MM" so
 * every consumer (the scheduler's parseHHMM, the preferences screen's time
 * picker) only ever deals with one format. */
function trimSeconds(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function rowToPreferences(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    plannerEnabled: row.planner_enabled,
    weatherEnabled: row.weather_enabled,
    outfitRemindersEnabled: row.outfit_reminders_enabled,
    aiSuggestionsEnabled: row.ai_suggestions_enabled,
    wardrobeEnabled: row.wardrobe_enabled,
    plannerAiEnabled: row.planner_ai_enabled,
    weeklySummaryEnabled: row.weekly_summary_enabled,
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: trimSeconds(row.quiet_hours_start),
    quietHoursEnd: trimSeconds(row.quiet_hours_end),
    notificationTime: trimSeconds(row.notification_time),
    weekendNotificationsEnabled: row.weekend_notifications_enabled,
  };
}

function preferencesToRow(prefs: Partial<NotificationPreferences>): Partial<NotificationPreferencesRow> {
  const row: Partial<NotificationPreferencesRow> = {};
  if (prefs.plannerEnabled !== undefined) row.planner_enabled = prefs.plannerEnabled;
  if (prefs.weatherEnabled !== undefined) row.weather_enabled = prefs.weatherEnabled;
  if (prefs.outfitRemindersEnabled !== undefined) row.outfit_reminders_enabled = prefs.outfitRemindersEnabled;
  if (prefs.aiSuggestionsEnabled !== undefined) row.ai_suggestions_enabled = prefs.aiSuggestionsEnabled;
  if (prefs.wardrobeEnabled !== undefined) row.wardrobe_enabled = prefs.wardrobeEnabled;
  if (prefs.plannerAiEnabled !== undefined) row.planner_ai_enabled = prefs.plannerAiEnabled;
  if (prefs.weeklySummaryEnabled !== undefined) row.weekly_summary_enabled = prefs.weeklySummaryEnabled;
  if (prefs.quietHoursEnabled !== undefined) row.quiet_hours_enabled = prefs.quietHoursEnabled;
  if (prefs.quietHoursStart !== undefined) row.quiet_hours_start = prefs.quietHoursStart;
  if (prefs.quietHoursEnd !== undefined) row.quiet_hours_end = prefs.quietHoursEnd;
  if (prefs.notificationTime !== undefined) row.notification_time = prefs.notificationTime;
  if (prefs.weekendNotificationsEnabled !== undefined) row.weekend_notifications_enabled = prefs.weekendNotificationsEnabled;
  return row;
}

/**
 * Fetches the caller's notification preferences, creating a
 * default-populated row on first call. Never throws — returns
 * DEFAULT_NOTIFICATION_PREFERENCES on any failure (no session, RLS hiccup,
 * offline), matching the rest of the app's "a preferences read must never
 * block or break the screen that needs it" convention.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_NOTIFICATION_PREFERENCES;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select(
        'planner_enabled, weather_enabled, outfit_reminders_enabled, ai_suggestions_enabled, wardrobe_enabled, planner_ai_enabled, weekly_summary_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, notification_time, weekend_notifications_enabled'
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[notificationPreferences] fetch failed, using defaults:', error.message);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    if (data) return rowToPreferences(data as NotificationPreferencesRow);

    // No row yet — lazily create one with defaults.
    const { data: inserted, error: insertError } = await supabase
      .from('notification_preferences')
      .insert({ user_id: user.id })
      .select(
        'planner_enabled, weather_enabled, outfit_reminders_enabled, ai_suggestions_enabled, wardrobe_enabled, planner_ai_enabled, weekly_summary_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, notification_time, weekend_notifications_enabled'
      )
      .single();

    if (insertError || !inserted) {
      console.error('[notificationPreferences] lazy-create failed, using defaults:', insertError?.message);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    return rowToPreferences(inserted as NotificationPreferencesRow);
  } catch (err) {
    console.error('[notificationPreferences] unexpected failure, using defaults:', err);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export class NotificationPreferencesError extends Error {}

/**
 * Persists a partial update (e.g. just `{ plannerEnabled: false }` from a
 * single Switch toggle) and returns the full resulting preferences object so
 * the caller can update its local state from a single source of truth. Does
 * throw NotificationPreferencesError on failure — unlike the read path,
 * callers here are an explicit user action (toggling a Switch) that DOES
 * need to know if it didn't save, the same pattern profile.tsx's
 * handleToggleNotifications already uses for the master switch.
 */
export async function updateNotificationPreferences(
  partial: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new NotificationPreferencesError('Your session has expired. Please sign in again.');
  }

  // Ensure a row exists first (same lazy-create as the read path) so a user
  // who opens the preferences screen for the very first time and flips one
  // switch doesn't hit a "no row to update" no-op.
  await getNotificationPreferences();

  const { data, error } = await supabase
    .from('notification_preferences')
    .update(preferencesToRow(partial))
    .eq('user_id', user.id)
    .select(
      'planner_enabled, weather_enabled, outfit_reminders_enabled, ai_suggestions_enabled, wardrobe_enabled, planner_ai_enabled, weekly_summary_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, notification_time, weekend_notifications_enabled'
    )
    .single();

  if (error || !data) {
    throw new NotificationPreferencesError(error?.message || 'Could not save notification preferences.');
  }

  return rowToPreferences(data as NotificationPreferencesRow);
}
