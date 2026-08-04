/**
 * weatherNotifications.ts
 *
 * Category 2 (Outfit Reminder). Deterministic, no AI — same rationale as
 * eventPreparationService: "today's outfit is ready" / "rain expected" /
 * "high temperatures" are lookups plus threshold checks, not reasoning, so
 * this stays instant and free rather than paying for an AI call once a day
 * per user for something a couple of `if` statements already answer
 * correctly. Reuses weatherService.ts (the app's one weather entry point)
 * and the same "day has an effective outfit" concept useDaySummary.ts
 * already established for the Calendar (an explicit outfit_plans row, or a
 * single event that day with its own outfit assigned).
 */

import { supabase } from '../supabase';
import * as Queue from './notificationQueue';
import type { WeatherSnapshot } from './weatherService';
import type { NotificationPreferences, SupportedNotificationLanguage } from './notificationTypes';

/** Thresholds are intentionally simple and named constants rather than
 * magic numbers scattered through the rule checks below — easy to retune
 * later without hunting through the logic. */
const RAIN_CHANCE_THRESHOLD_PERCENT = 50;
const HIGH_TEMPERATURE_CELSIUS = 28;

function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** True when today already has an effective outfit — either an explicit
 * outfit_plans row, or at least one of today's events has its own outfit
 * assigned (same "effective plan" concept as useDaySummary.deriveEffectivePlan,
 * simplified to a boolean since this only needs to decide which notification
 * copy to use, not render anything). */
async function hasTodayOutfit(userId: string, todayISO: string): Promise<boolean> {
  const [planResult, eventsResult] = await Promise.all([
    supabase.from('outfit_plans').select('id').eq('user_id', userId).eq('planned_date', todayISO).maybeSingle(),
    supabase.from('events').select('id').eq('user_id', userId).eq('event_date', todayISO).not('outfit_id', 'is', null).limit(1).maybeSingle(),
  ]);

  return !!planResult.data || !!eventsResult.data;
}

interface OutfitReminderContent {
  title: string;
  body: string;
}

/** Picks ONE message — weather warnings take priority over the plain "ready"
 * confirmation (a jacket reminder is more useful than "your outfit is
 * ready" on a rainy day), matching the spec's own ordering of examples. */
function buildOutfitReminderContent(
  weather: WeatherSnapshot | null,
  outfitReady: boolean,
  language: SupportedNotificationLanguage
): OutfitReminderContent {
  const title = language === 'es' ? 'Outfit del día' : "Today's Outfit";

  if (weather?.chanceOfRainPercent !== null && (weather?.chanceOfRainPercent ?? 0) >= RAIN_CHANCE_THRESHOLD_PERCENT) {
    return {
      title,
      body:
        language === 'es'
          ? 'Se espera lluvia hoy. Considera agregar una chaqueta.'
          : 'Rain expected today. Consider adding a jacket.',
    };
  }

  if (weather && weather.temperatureCelsius >= HIGH_TEMPERATURE_CELSIUS) {
    return {
      title,
      body:
        language === 'es'
          ? 'Altas temperaturas hoy. Se recomienda ropa ligera.'
          : 'High temperatures today. Lightweight clothing recommended.',
    };
  }

  if (outfitReady) {
    return {
      title,
      body: language === 'es' ? 'El outfit de hoy está listo.' : "Today's outfit is ready.",
    };
  }

  return {
    title,
    body: language === 'es' ? 'Aún no has planeado un outfit para hoy.' : "You haven't planned an outfit for today yet.",
  };
}

/**
 * Schedules (at most) one Outfit Reminder for today, deduped per calendar
 * day (`outfit_reminder-<date>`) so opening the app repeatedly the same day
 * never re-schedules it. Fires at the user's configured `notificationTime`,
 * or immediately-ish if that time already passed today (still same-day
 * useful information, just late).
 */
export async function scheduleTodayOutfitReminder(
  weather: WeatherSnapshot | null,
  prefs: NotificationPreferences,
  language: SupportedNotificationLanguage
): Promise<void> {
  if (!prefs.outfitRemindersEnabled && !prefs.weatherEnabled) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date();
  const todayISO = toLocalISODate(today);
  const outfitReady = await hasTodayOutfit(user.id, todayISO);

  const isWeatherDriven =
    prefs.weatherEnabled &&
    !!weather &&
    ((weather.chanceOfRainPercent ?? 0) >= RAIN_CHANCE_THRESHOLD_PERCENT || weather.temperatureCelsius >= HIGH_TEMPERATURE_CELSIUS);

  // Outfit-ready confirmations are gated by outfitRemindersEnabled; weather
  // warnings are gated by weatherEnabled — a user can want one without the
  // other, so skip entirely if neither applies to today's content.
  if (!isWeatherDriven && !prefs.outfitRemindersEnabled) return;

  const { title, body } = buildOutfitReminderContent(weather, outfitReady, language);

  const [hh, mm] = prefs.notificationTime.split(':').map(Number);
  const triggerDate = new Date(today);
  triggerDate.setHours(hh, mm, 0, 0);
  if (triggerDate.getTime() <= Date.now()) {
    triggerDate.setTime(Date.now() + 60_000); // Time already passed today — fire shortly instead of dropping the day's notification entirely.
  }

  await Queue.enqueueAndSchedule(
    {
      category: isWeatherDriven ? 'weather' : 'outfit_reminder',
      dedupeKey: `outfit_reminder-${todayISO}`,
      title,
      body,
      actionRoute: '/(tabs)/calendar',
      triggerDate,
    },
    prefs
  );
}
