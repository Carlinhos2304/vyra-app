/**
 * useDailySuggestion — the AI Daily Suggestion card + Today's Schedule note.
 * Deliberately decoupled from Home's initial DATA fetch: pass it
 * `weatherReady` (from useWeather) and it fires exactly once, whether or not
 * weather ended up available, then resolves whenever the AI responds — Home
 * itself never waits on this call.
 *
 * `isLoading` starts `true` (not `false`) so AIDailySuggestionCard mounts
 * and plays its entrance animation in Home's very first paint, in sync with
 * every other card (useWeather/useTodayOutfit/useWardrobeInsights all start
 * `isLoading: true` the same way) — showing its skeleton immediately instead
 * of staying unmounted until weather resolves AND the AI call finishes. That
 * used to mean the card (and the two-step wait behind it: weather, then a
 * sequential AI call) popped in well after the rest of Home had already
 * settled, shoving TodayScheduleCard/WardrobeInsightsGrid/etc. down with an
 * unanimated layout jump — which read as "this card has no animation" even
 * though its own fade-in was firing correctly; the real bug was *when* it
 * mounted, not whether it animated.
 */

import { useEffect, useRef, useState } from 'react';
import { getDailySuggestion, DailySuggestionResult } from '../lib/services/aiService';
import { WeatherSnapshot } from '../lib/services/weatherService';

export interface UseDailySuggestionResult {
  suggestion: DailySuggestionResult | null;
  isLoading: boolean;
}

function getLocalISODateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function useDailySuggestion(weather: WeatherSnapshot | null, weatherReady: boolean): UseDailySuggestionResult {
  const [suggestion, setSuggestion] = useState<DailySuggestionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!weatherReady || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const todayLocalISO = getLocalISODateString(new Date());
        const result = await getDailySuggestion(
          todayLocalISO,
          weather
            ? {
                temperatureCelsius: weather.temperatureCelsius,
                feelsLikeCelsius: weather.feelsLikeCelsius,
                conditionLabel: weather.conditionLabel,
                chanceOfRainPercent: weather.chanceOfRainPercent,
              }
            : null
        );
        if (!cancelled) setSuggestion(result);
      } catch (err) {
        // Non-fatal by design — the spec is explicit that AI must never
        // block or break Home. The card simply stays hidden (see
        // AIDailySuggestionCard's handling of a null suggestion).
        console.error('[useDailySuggestion] failed:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [weatherReady, weather]);

  return { suggestion, isLoading };
}
