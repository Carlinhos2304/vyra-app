/**
 * notificationAI.ts
 *
 * Category 3 (AI Smart Notifications) client. Exact same shape as
 * aiService.ts's other entry points: never talks to an AI provider
 * directly, always through the smart-notifications Edge Function, which
 * assembles real server-side context and delegates reasoning to whichever
 * AIProvider is configured (reuses the same AI_PROVIDER/GEMINI_API_KEY/
 * OPENAI_API_KEY secrets already set up for analyze-garment/generate-outfit/
 * daily-suggestion — nothing new to configure).
 *
 * Scheduling/throttling (at most once/day) lives in
 * notificationService.runNotificationSweep, not here — this file is a pure
 * request/response client, same division of concerns aiService.ts already
 * has with its callers.
 */

import { supabase } from '../supabase';
import { extractInvokeErrorMessage } from './aiService';
import type { WeatherSnapshot } from './weatherService';

export class SmartNotificationError extends Error {}

export interface SmartNotificationItem {
  title: string;
  body: string;
}

/** Same weather shape aiService.getDailySuggestion's DailySuggestionWeatherInput
 * uses — declared separately so this file's contract doesn't depend on
 * weatherService's internals shifting later (same rationale as aiService.ts's
 * own DailySuggestionWeatherInput). */
export interface SmartNotificationWeatherInput {
  temperatureCelsius?: number | null;
  feelsLikeCelsius?: number | null;
  conditionLabel?: string | null;
  chanceOfRainPercent?: number | null;
}

function toWeatherInput(snapshot: WeatherSnapshot | null | undefined): SmartNotificationWeatherInput | null {
  if (!snapshot) return null;
  return {
    temperatureCelsius: snapshot.temperatureCelsius,
    feelsLikeCelsius: snapshot.feelsLikeCelsius,
    conditionLabel: snapshot.conditionLabel,
    chanceOfRainPercent: snapshot.chanceOfRainPercent,
  };
}

/**
 * Asks the smart-notifications Edge Function for today's AI-generated
 * pattern observations (0-3 items — see that function's normalize.ts).
 * Throws SmartNotificationError on a genuine request failure; callers should
 * treat that as "no smart notifications today", never something to surface
 * to the user, same non-blocking posture as getDailySuggestion.
 *
 * @param todayLocalDate The caller's own local calendar day, "YYYY-MM-DD".
 * @param weatherToday/weatherTomorrow Optional — omit whichever isn't available.
 */
export async function getSmartNotifications(
  todayLocalDate: string,
  weatherToday?: WeatherSnapshot | null,
  weatherTomorrow?: WeatherSnapshot | null
): Promise<SmartNotificationItem[]> {
  if (!todayLocalDate) {
    throw new SmartNotificationError('todayLocalDate is required to request smart notifications.');
  }

  const { data, error } = await supabase.functions.invoke('smart-notifications', {
    body: {
      todayLocalDate,
      weatherToday: toWeatherInput(weatherToday),
      weatherTomorrow: toWeatherInput(weatherTomorrow),
    },
  });

  if (error) {
    const message = await extractInvokeErrorMessage(error, 'The smart notifications service could not process this request.');
    console.error('[getSmartNotifications] Edge Function error:', message);
    throw new SmartNotificationError(message);
  }

  if (!data || !Array.isArray(data.notifications)) {
    throw new SmartNotificationError('The smart notifications service returned an unexpected response.');
  }

  return data.notifications as SmartNotificationItem[];
}
