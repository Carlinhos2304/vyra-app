/**
 * notificationScheduler.ts
 *
 * The ONLY file in the notification system that imports `expo-notifications`
 * directly (besides the legacy exports re-homed in notificationService.ts,
 * which now delegate here internally). Every category service
 * (notificationPlanner, weatherNotifications, wardrobeNotifications) and the
 * outbox (notificationQueue) go through this file instead of calling
 * expo-notifications themselves — the same "one file owns the OS boundary"
 * shape weatherService.ts already uses for WeatherProvider and aiService.ts
 * uses for Supabase Edge Functions.
 *
 * Two responsibilities live here on purpose:
 *   1. OS primitives — permission, schedule, cancel, push-token capture.
 *   2. Quiet-hours / weekend delivery-time shaping — centralized so no
 *      category service reimplements "is this time inside quiet hours"
 *      itself (that duplication is exactly how these rules would drift).
 *
 * Local vs. push, without a rewrite later: `scheduleLocal()` is what every
 * category calls today. The day a push sender exists, only this file and
 * notificationQueue.ts change (queue starts also writing rows a server-side
 * job can pick up) — category services and the UI never need to know
 * delivery moved from a local OS timer to a push payload.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../supabase';
import type { NotificationCategory, NotificationPreferences } from './notificationTypes';

/**
 * True when running inside the Expo Go client rather than a development/
 * production build. As of Expo SDK 53, Expo Go dropped remote push-token
 * support (expo-notifications logs a one-time, non-fatal warning about this
 * the moment the module is imported — that log is expected and harmless,
 * and every LOCAL notification this system schedules keeps working fine in
 * Expo Go). This flag is only used to skip calling getExpoPushTokenAsync()
 * ourselves in registerPushToken(), since attempting a push-token fetch in
 * Expo Go would just fail after the fact anyway.
 */
const isRunningInExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure how notifications are handled when the app is foregrounded.
// (Kept here, not duplicated in the legacy notificationService.ts — that
// file no longer calls setNotificationHandler itself, see its header.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Android 8+ (API 26+) silently drops/mutes any notification whose channel
 * hasn't been created — there's no cross-platform equivalent, so this is
 * Android-only and a no-op on iOS. One channel per category (rather than a
 * single generic one) so a user can mute/adjust importance for, say,
 * Wardrobe reminders from Android's own system settings without touching
 * Planner reminders — a real Android capability that a single shared channel
 * would throw away. `createNotificationChannelAsync` upserts, so calling
 * this on every app start is safe and cheap; iOS-specific delivery nuances
 * (provisional authorization, the 64-pending cap, categories/actions) are
 * deliberately out of scope for this pass.
 */
export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const channels: { id: NotificationCategory; name: string; importance: Notifications.AndroidImportance }[] = [
    { id: 'planner', name: 'Planner reminders', importance: Notifications.AndroidImportance.HIGH },
    { id: 'planner_ai', name: 'Planner AI suggestions', importance: Notifications.AndroidImportance.DEFAULT },
    { id: 'weather', name: 'Weather alerts', importance: Notifications.AndroidImportance.DEFAULT },
    { id: 'outfit_reminder', name: "Today's outfit", importance: Notifications.AndroidImportance.DEFAULT },
    { id: 'ai_suggestion', name: 'AI smart suggestions', importance: Notifications.AndroidImportance.DEFAULT },
    { id: 'wardrobe', name: 'Wardrobe reminders', importance: Notifications.AndroidImportance.LOW },
    { id: 'weekly_summary', name: 'Weekly summary', importance: Notifications.AndroidImportance.LOW },
  ];

  try {
    await Promise.all(
      channels.map((channel) =>
        Notifications.setNotificationChannelAsync(channel.id, {
          name: channel.name,
          importance: channel.importance,
          lightColor: '#1C1917',
        })
      )
    );
  } catch (err) {
    console.warn('[notificationScheduler] ensureAndroidNotificationChannels failed (non-fatal):', err);
  }
}

/** Prompts the OS permission dialog if not already decided. Only call this
 * from an explicit user action (the master toggle, the new preferences
 * screen) — never implicitly from a background sweep, matching the
 * discipline already established for schedulePlannedOutfitReminder. */
export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('[notificationScheduler] Notifications only work on physical devices.');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[notificationScheduler] Notification permission was not granted.');
    return false;
  }

  return true;
}

/** Read-only permission check — never prompts. Every implicit scheduling
 * call (event created, app foreground sweep, ...) must use this, not
 * requestPermissions(). */
export async function hasPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Best-effort Expo push token capture, called right after permission is
 * granted. Non-fatal on any failure (no EAS project id in a dev build, no
 * network, etc.) — nothing currently reads this column, so a failure here
 * must never block the local-notification flow the user is actually waiting
 * on. Saves to profiles.expo_push_token so turning on push delivery later
 * never requires re-prompting existing users for a token.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  // Expo Go can't produce a usable remote push token since SDK 53 — skip the
  // attempt entirely rather than let it fail noisily after the fact. Local
  // notifications (everything this app currently schedules) are unaffected.
  if (isRunningInExpoGo) return null;

  try {
    const permitted = await hasPermission();
    if (!permitted) return null;

    // No explicit projectId passed — Expo resolves it from app.json's
    // extra.eas.projectId automatically, which is already configured.
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse?.data ?? null;
    if (!token) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return token;

    const { error } = await supabase.from('profiles').update({ expo_push_token: token }).eq('id', user.id);
    if (error) {
      console.warn('[notificationScheduler] Failed to persist push token (non-fatal):', error.message);
    }

    return token;
  } catch (err) {
    console.warn('[notificationScheduler] registerPushToken failed (non-fatal):', err);
    return null;
  }
}

export interface ScheduleLocalInput {
  /** Stable identifier — reused as-is for later cancellation. Callers should
   * fold in enough context (category + entity id + variant) that unrelated
   * notifications never collide, e.g. `planner-${eventId}-30`. */
  identifier: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  triggerDate: Date;
  /** Android notification channel to deliver on — one of the ids created by
   * ensureAndroidNotificationChannels(). Ignored on iOS. Falls back to
   * expo-notifications' own default channel when omitted, which is why
   * every caller going through notificationQueue always passes its
   * NotificationCategory here (category ids double as channel ids). */
  channelId?: NotificationCategory;
}

/**
 * Schedules a single local notification for an exact date. Never throws —
 * scheduling a reminder is always a non-critical enhancement layered on top
 * of whatever critical write the caller already made (an event save, an
 * outfit assignment, ...), the same principle schedulePlannedOutfitReminder
 * established. Returns the identifier on success, `null` on any skip/failure
 * (with the specific reason logged).
 */
export async function scheduleLocal(input: ScheduleLocalInput): Promise<string | null> {
  if (input.triggerDate.getTime() <= Date.now()) {
    return null; // Never schedule in the past.
  }

  const permitted = await hasPermission();
  if (!permitted) {
    console.warn(`[notificationScheduler] Skipped "${input.identifier}" — notification permission not granted.`);
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: input.identifier,
      content: {
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: input.triggerDate,
        ...(Platform.OS === 'android' && input.channelId ? { channelId: input.channelId } : {}),
      } as unknown as Notifications.NotificationTriggerInput,
    });
  } catch (err) {
    console.warn(`[notificationScheduler] scheduleNotificationAsync failed for "${input.identifier}" (non-fatal):`, err);
    return null;
  }
}

export async function cancelLocal(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Already fired, already cancelled, or never existed — all fine to ignore.
  }
}

export async function cancelAllLocal(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getAllScheduledLocal(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}

/** Cancels every currently-scheduled local notification whose identifier
 * starts with `prefix` (e.g. `planner-${eventId}-`) — the primitive
 * notificationPlanner's cancel/edit/reschedule flows build on, and also
 * what a rolling-window resync uses to clear out-of-window reminders before
 * re-scheduling the ones that are back in range. */
export async function cancelLocalByPrefix(prefix: string): Promise<void> {
  const scheduled = await getAllScheduledLocal();
  const matches = scheduled.filter((n) => n.identifier.startsWith(prefix));
  await Promise.all(matches.map((n) => cancelLocal(n.identifier)));
}

function parseHHMM(value: string): { hours: number; minutes: number } {
  const [h, m] = value.split(':').map(Number);
  return { hours: Number.isFinite(h) ? h : 0, minutes: Number.isFinite(m) ? m : 0 };
}

function atLocalTime(date: Date, hhmm: string): Date {
  const { hours, minutes } = parseHHMM(hhmm);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/** True when `date`'s local time-of-day falls inside [quietHoursStart,
 * quietHoursEnd), correctly handling a window that wraps past midnight (e.g.
 * 22:00 -> 07:00). */
function isWithinQuietHours(date: Date, prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursEnabled) return false;

  const start = parseHHMM(prefs.quietHoursStart);
  const end = parseHHMM(prefs.quietHoursEnd);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  const dateMinutes = date.getHours() * 60 + date.getMinutes();

  if (startMinutes === endMinutes) return false; // Degenerate window — treat as "always allowed".

  if (startMinutes < endMinutes) {
    // Same-day window, e.g. 13:00 -> 15:00.
    return dateMinutes >= startMinutes && dateMinutes < endMinutes;
  }
  // Wraps past midnight, e.g. 22:00 -> 07:00.
  return dateMinutes >= startMinutes || dateMinutes < endMinutes;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * The single place every category service funnels a "I'd like to notify
 * around this time" request through before it reaches scheduleLocal(). Two
 * outcomes:
 *   - `null` — this notification should not fire at all (weekend
 *     notifications are off and `desired` falls on a weekend, and the
 *     category isn't `alwaysAllowWeekend`-exempt).
 *   - a `Date` — `desired`, or the nearest allowed time outside quiet hours
 *     if `desired` fell inside the window (pushed to `quietHoursEnd` on the
 *     same rollover, never silently dropped).
 *
 * `alwaysAllowWeekend` exists for Planner reminders: an event the user
 * explicitly created for Saturday should still remind them about it even if
 * they've disabled *discretionary* weekend notifications — that toggle is
 * about Vyra proactively reaching out on a day off, not about muting
 * reminders for things the user themselves scheduled.
 */
export function resolveDeliveryTime(
  desired: Date,
  prefs: NotificationPreferences,
  options?: { alwaysAllowWeekend?: boolean }
): Date | null {
  if (!options?.alwaysAllowWeekend && !prefs.weekendNotificationsEnabled && isWeekend(desired)) {
    return null;
  }

  if (!isWithinQuietHours(desired, prefs)) {
    return desired;
  }

  const end = parseHHMM(prefs.quietHoursEnd);
  const shifted = atLocalTime(desired, prefs.quietHoursEnd);
  // If quiet hours wrap past midnight and `desired` was already past
  // midnight (e.g. 02:00, window 22:00->07:00), quietHoursEnd today is the
  // right target. If `desired` was before midnight (e.g. 23:00), the end
  // time is tomorrow morning.
  const startedBeforeMidnight = desired.getHours() * 60 + desired.getMinutes() >= parseHHMM(prefs.quietHoursStart).hours * 60 + parseHHMM(prefs.quietHoursStart).minutes;
  if (startedBeforeMidnight && parseHHMM(prefs.quietHoursStart).hours * 60 + parseHHMM(prefs.quietHoursStart).minutes > end.hours * 60 + end.minutes) {
    shifted.setDate(shifted.getDate() + 1);
  }
  return shifted;
}
