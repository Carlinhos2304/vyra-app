/**
 * weatherRecommendation.ts
 *
 * Deterministic, zero-latency mapping from a real forecast day to a short
 * outfit recommendation phrase for WeeklyForecastStrip (e.g. "Light Layers",
 * "Waterproof Jacket", "Linen Shirt"). The spec allows this to come from AI
 * ("la recomendación puede provenir de IA") but doesn't require it — since
 * Home already has one AI call in flight (useDailySuggestion) and this is a
 * simple, cheap, real-data-driven rule (never a fake value), doing it
 * locally avoids extra AI cost/latency and an extra Edge Function round trip
 * for something this mechanical to answer well without a model.
 */

import { ForecastDay } from '../services/weatherService';

export function getOutfitRecommendation(day: ForecastDay): string {
  if (day.conditionKey === 'storm') return 'Waterproof Jacket';
  if (day.conditionKey === 'rain' || day.conditionKey === 'drizzle') return 'Waterproof Jacket';
  if (day.conditionKey === 'snow') return 'Warm Layers';
  if (day.highCelsius >= 26) return 'Linen Shirt';
  if (day.highCelsius <= 12) return 'Light Layers';
  if (day.conditionKey === 'fog' || day.conditionKey === 'cloudy') return 'Light Jacket';
  return 'Casual Layers';
}
