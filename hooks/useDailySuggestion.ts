/**
 * useDailySuggestion — the AI Daily Suggestion card + Today's Schedule note.
 * Deliberately decoupled from Home's initial render: pass it `weatherReady`
 * (from useWeather) and it fires exactly once, whether or not weather ended
 * up available, then fades its result in whenever the AI responds — Home
 * itself never waits on this.
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
  const [isLoading, setIsLoading] = useState(false);
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
