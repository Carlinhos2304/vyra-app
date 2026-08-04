/**
 * notificationService.ts
 *
 * Moved here from services/notificationService.ts (2026-08-04 Planner audit)
 * so every service in the app lives in one place — services/ was the one
 * outlier. The old path now just re-exports from here for backward
 * compatibility; new code should import from lib/services/notificationService.
 *
 * Also fixes the root cause behind "the event saves but sometimes shows an
 * error": schedulePlannedOutfitReminder() used to let ANY failure inside it
 * (missing OS notification permission, Android exact-alarm restrictions,
 * Expo Go limitations, etc.) propagate as a thrown error. create-event.tsx
 * used to await it inside the SAME try/catch as the critical `events.insert`
 * call, so a failure here — after the event had already been saved
 * successfully — surfaced as a save error to the user.
 *
 * The real fix has two parts:
 *  1. The caller (create-event.tsx) no longer shares a try/catch between the
 *     event insert and the reminder scheduling — see that file.
 *  2. This function is now defensive on its own terms too: scheduling a
 *     reminder is a non-critical enhancement, never something that should be
 *     able to fail loudly. It checks the OS permission first (read-only
 *     check, no prompt — prompting belongs to the Settings toggle flow in
 *     useNotifications.ts) and swallows any scheduling failure, logging a
 *     specific reason instead of hiding the cause outright. Any future
 *     caller (e.g. per-occurrence reminders for recurring events) inherits
 *     this safety automatically.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.warn('[notificationService] Notifications only work on physical devices.');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[notificationService] Notification permission was not granted.');
    return false;
  }

  return true;
};

/** Read-only permission check — does NOT prompt the OS dialog. Used by
 * scheduling calls that happen implicitly (e.g. right after saving an
 * event) where popping a permission prompt would be surprising; the
 * explicit "enable notifications" toggle (useNotifications.ts) is the only
 * place that should call requestNotificationPermissions() and prompt. */
async function hasNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export const scheduleDailyReminder = async () => {
  // Cancel any existing daily reminder to avoid duplicates
  await cancelDailyReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Today's Outfit",
      body: 'Plan your outfit for today.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
};

export const cancelDailyReminder = async () => {
  // We can identify the daily reminder by its content or by keeping a list of IDs.
  // For simplicity in V1, let's just find and cancel based on known title.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const daily = scheduled.find((n) => n.content.title === "Today's Outfit");
  if (daily) {
    await Notifications.cancelScheduledNotificationAsync(daily.identifier);
  }
};

/**
 * Schedules a local reminder 1 hour before `triggerDate` for a planned
 * outfit/event. Non-critical by design: returns `null` (instead of
 * throwing) whenever it can't schedule — a past trigger time, no OS
 * permission, or any underlying expo-notifications failure — logging
 * exactly why so the cause is visible in dev tools without ever bubbling up
 * as a user-facing error on the caller's critical path.
 *
 * @param eventOrOutfitId Used as the notification identifier so it can later
 *   be targeted by cancelNotification(). Named generically because callers
 *   pass either an outfit id (Home's "Today's Outfit") or an event id
 *   (create-event.tsx) — both are just opaque ids to this function.
 */
export const schedulePlannedOutfitReminder = async (
  eventOrOutfitId: string,
  triggerDate: Date
): Promise<string | null> => {
  const triggerTime = new Date(triggerDate.getTime() - 60 * 60 * 1000);

  if (triggerTime < new Date()) return null; // Don't schedule in the past

  const permitted = await hasNotificationPermission();
  if (!permitted) {
    console.warn(
      '[notificationService] Skipped scheduling — notification permission is not granted (profile.notifications_enabled being true does not guarantee the OS permission is).'
    );
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: `outfit-${eventOrOutfitId}`,
      content: {
        title: 'Upcoming Outfit',
        body: "Don't forget your planned outfit.",
        data: { outfitId: eventOrOutfitId },
      },
      // Typecast to satisfy Expo's TypeScript definitions for a Date-based trigger
      trigger: triggerTime as unknown as Notifications.NotificationTriggerInput,
    });
  } catch (err) {
    console.warn('[notificationService] scheduleNotificationAsync failed — reminder skipped, not a fatal error:', err);
    return null;
  }
};

export const cancelNotification = async (outfitId: string) => {
  await Notifications.cancelScheduledNotificationAsync(`outfit-${outfitId}`);
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// ============================================================================
// Production notification system — orchestrator additions (2026-08-04).
// ============================================================================
// Everything above this line is the original, untouched local-notification
// API (permissions, the static daily reminder, the single per-event 1-hour
// reminder) — every existing caller (useNotifications.ts, profile.tsx,
// onboarding/personalization.tsx) keeps working exactly as before.
//
// Everything below is new: `runNotificationSweep()` is the single entry
// point the app calls once per foreground (see hooks/useNotificationSweep.ts)
// to drive all 7 categories (Planner, Weather/Outfit, AI Smart, Wardrobe,
// Planner AI, Weekly Summary) through their respective services, all funneled
// through notificationQueue's dedupe so calling this many times a day is
// always safe. This file stays the "public facade" the app talks to —
// screens still never import notificationScheduler/notificationQueue/the
// category services directly.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import * as Scheduler from './notificationScheduler';
import * as Queue from './notificationQueue';
import { getNotificationPreferences } from './notificationPreferences';
import { resyncPlannerReminders, schedulePlannerAiNudges } from './notificationPlanner';
import { scheduleTodayOutfitReminder } from './weatherNotifications';
import { scheduleWardrobeTips } from './wardrobeNotifications';
import { getSmartNotifications } from './notificationAI';
import { getWardrobeInsights } from './wardrobeInsightsService';
import { getCurrentWeather, getWeeklyForecast } from './weatherService';
import type { PlannerEvent } from './plannerTypes';
import type { NotificationPreferences, SupportedNotificationLanguage } from './notificationTypes';

const SWEEP_THROTTLE_KEY = '@vyra_notification_sweep_last_run_date';

function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isoWeekKey(date: Date): string {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** The pre-existing master switch (unchanged column, unchanged meaning) —
 * every category, old and new, stays gated behind this first. */
async function isMasterSwitchEnabled(userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('notifications_enabled').eq('id', userId).maybeSingle();
  return !!data?.notifications_enabled;
}

/**
 * Category 6 (Weekly Summary) — deliberately NOT AI-generated (see the
 * architecture notes shared before implementation): every field here is
 * real arithmetic over the user's own data, reusing wardrobeInsightsService
 * for the metrics it already computes and two small direct queries for the
 * two it doesn't (style distribution, upcoming event count). One
 * notification per ISO week, deduped by `weekly_summary-<week>` regardless
 * of which day of the week the sweep happens to run.
 */
async function buildWeeklySummary(
  userId: string,
  language: SupportedNotificationLanguage
): Promise<{ title: string; body: string } | null> {
  const todayISO = toLocalISODate(new Date());
  const weekAgoISO = toLocalISODate(new Date(Date.now() - 7 * 86_400_000));
  const weekAheadISO = toLocalISODate(new Date(Date.now() + 7 * 86_400_000));

  const [insights, outfitsThisWeekResult, upcomingEventsResult, styleResult] = await Promise.all([
    getWardrobeInsights(),
    supabase.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekAgoISO),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('event_date', todayISO).lte('event_date', weekAheadISO),
    supabase.from('clothing_items').select('style').eq('user_id', userId),
  ]);

  const outfitsCreated = outfitsThisWeekResult.count ?? 0;
  const upcomingEvents = upcomingEventsResult.count ?? 0;

  if (outfitsCreated === 0 && upcomingEvents === 0 && insights.totalGarments === 0) return null; // Nothing real to report.

  let mostUsedStyle: string | null = null;
  if (!styleResult.error && styleResult.data) {
    const tally = new Map<string, number>();
    for (const row of styleResult.data as { style: string | null }[]) {
      if (!row.style) continue;
      tally.set(row.style, (tally.get(row.style) || 0) + 1);
    }
    let best: [string, number] | null = null;
    for (const entry of tally.entries()) {
      if (!best || entry[1] > best[1]) best = entry;
    }
    mostUsedStyle = best?.[0] ?? null;
  }

  const title = language === 'es' ? 'Resumen semanal' : 'Weekly Summary';
  const lines: string[] = [];

  if (language === 'es') {
    lines.push(`Esta semana creaste ${outfitsCreated} outfit${outfitsCreated === 1 ? '' : 's'}.`);
    if (insights.mostUsedColor) lines.push(`Color más usado: ${insights.mostUsedColor.label}.`);
    if (mostUsedStyle) lines.push(`Estilo más usado: ${mostUsedStyle}.`);
    lines.push(`${upcomingEvents} evento${upcomingEvents === 1 ? '' : 's'} próximo${upcomingEvents === 1 ? '' : 's'}.`);
    lines.push(`${insights.unusedItemsCount} prenda${insights.unusedItemsCount === 1 ? '' : 's'} sin usar.`);
  } else {
    lines.push(`This week you created ${outfitsCreated} outfit${outfitsCreated === 1 ? '' : 's'}.`);
    if (insights.mostUsedColor) lines.push(`Most used color: ${insights.mostUsedColor.label}.`);
    if (mostUsedStyle) lines.push(`Most used style: ${mostUsedStyle}.`);
    lines.push(`${upcomingEvents} upcoming event${upcomingEvents === 1 ? '' : 's'}.`);
    lines.push(`${insights.unusedItemsCount} unworn garment${insights.unusedItemsCount === 1 ? '' : 's'}.`);
  }

  return { title, body: lines.join(' ') };
}

async function runWeeklySummarySweep(
  userId: string,
  prefs: NotificationPreferences,
  language: SupportedNotificationLanguage
): Promise<void> {
  if (!prefs.weeklySummaryEnabled) return;

  const summary = await buildWeeklySummary(userId, language);
  if (!summary) return;

  const [hh, mm] = prefs.notificationTime.split(':').map(Number);
  const triggerDate = new Date();
  triggerDate.setHours(hh, mm, 0, 0);
  if (triggerDate.getTime() <= Date.now()) triggerDate.setDate(triggerDate.getDate() + 1);

  await Queue.enqueueAndSchedule(
    {
      category: 'weekly_summary',
      dedupeKey: `weekly_summary-${isoWeekKey(new Date())}`,
      title: summary.title,
      body: summary.body,
      actionRoute: '/(tabs)/closet',
      triggerDate,
    },
    prefs
  );
}

/**
 * Category 3 (AI Smart Notifications). Throttled to once/day by the sweep's
 * own AsyncStorage guard (see runNotificationSweep) rather than inside this
 * function, so a failed AI call doesn't get silently retried every time the
 * app opens the same day (that's exactly the kind of repeated-cost bug the
 * "recompute on foreground" strategy has to guard against explicitly).
 */
async function runSmartNotificationsSweep(
  prefs: NotificationPreferences,
  language: SupportedNotificationLanguage,
  todayLocalISO: string
): Promise<void> {
  if (!prefs.aiSuggestionsEnabled) return;

  try {
    const [today, forecast] = await Promise.all([getCurrentWeather(), getWeeklyForecast()]);
    const tomorrow = forecast?.[1] ?? null;
    const items = await getSmartNotifications(
      todayLocalISO,
      today,
      tomorrow
        ? {
            temperatureCelsius: tomorrow.highCelsius,
            feelsLikeCelsius: null,
            conditionLabel: tomorrow.conditionLabel,
            chanceOfRainPercent: tomorrow.chanceOfRainPercent,
          }
        : null
    );

    const [hh, mm] = prefs.notificationTime.split(':').map(Number);
    const triggerDate = new Date();
    triggerDate.setHours(hh, mm, 0, 0);
    if (triggerDate.getTime() <= Date.now()) triggerDate.setDate(triggerDate.getDate() + 1);

    for (let i = 0; i < items.length; i++) {
      await Queue.enqueueAndSchedule(
        {
          category: 'ai_suggestion',
          dedupeKey: `ai_suggestion-${todayLocalISO}-${i}`,
          title: items[i].title,
          body: items[i].body,
          actionRoute: '/(tabs)/home',
          triggerDate: new Date(triggerDate.getTime() + i * 5 * 60_000), // Stagger multiple same-day AI notes 5 min apart instead of firing all at once.
        },
        prefs
      );
    }
  } catch (err) {
    // Non-fatal by design, same posture as getDailySuggestion's callers —
    // a failed/slow AI call must never break the rest of the sweep.
    console.error('[notificationService] runSmartNotificationsSweep failed (non-fatal):', err);
  }
}

/**
 * The single entry point the app calls once per foreground (see
 * hooks/useNotificationSweep.ts). Cheap to call repeatedly: throttled to at
 * most once per calendar day via AsyncStorage, and every individual category
 * write is independently deduped by notificationQueue — calling this twice
 * in the same minute (e.g. a fast app reopen) is always safe.
 */
export async function runNotificationSweep(language: SupportedNotificationLanguage): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const masterEnabled = await isMasterSwitchEnabled(user.id);
  if (!masterEnabled) return;

  const todayISO = toLocalISODate(new Date());
  const lastRun = await AsyncStorage.getItem(SWEEP_THROTTLE_KEY);
  if (lastRun === todayISO) return;

  await Scheduler.ensureAndroidNotificationChannels();
  // Best-effort — never blocks the rest of the sweep on a push-token failure.
  Scheduler.registerPushToken().catch(() => undefined);

  const prefs = await getNotificationPreferences();

  await resyncPlannerReminders(prefs, language);

  if (prefs.plannerAiEnabled) {
    const windowEnd = toLocalISODate(new Date(Date.now() + 7 * 86_400_000));
    const { data: upcomingEvents } = await supabase
      .from('events')
      .select('id, name, event_date, start_time, end_time, category, location, outfit_id')
      .eq('user_id', user.id)
      .gte('event_date', todayISO)
      .lte('event_date', windowEnd);
    await schedulePlannerAiNudges((upcomingEvents || []) as unknown as PlannerEvent[], todayISO, prefs, language);
  }

  if (prefs.weatherEnabled || prefs.outfitRemindersEnabled) {
    const weather = await getCurrentWeather();
    await scheduleTodayOutfitReminder(weather, prefs, language);
  }

  await scheduleWardrobeTips(prefs, language);
  await runSmartNotificationsSweep(prefs, language, todayISO);
  await runWeeklySummarySweep(user.id, prefs, language);

  await AsyncStorage.setItem(SWEEP_THROTTLE_KEY, todayISO);
}
