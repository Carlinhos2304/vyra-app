/**
 * useWeather — the only thing Home needs to know about weatherService.
 * Loads once on mount using whatever cache weatherService already has
 * (instant if warm, otherwise a real fetch) and exposes a manual refresh
 * for pull-to-refresh-style interactions later, without ever blocking the
 * rest of Home's render.
 */

import { useCallback, useEffect, useState } from 'react';
import { getCurrentWeather, getWeeklyForecast, WeatherSnapshot, ForecastDay } from '../lib/services/weatherService';

export interface UseWeatherResult {
  current: WeatherSnapshot | null;
  forecast: ForecastDay[];
  /** True only while the very first load is in flight. */
  isLoading: boolean;
  /** True once the first load attempt has settled (success OR "no weather
   * available") — lets the UI distinguish "still loading" from "loaded, and
   * there's genuinely nothing to show" (e.g. location permission denied). */
  isReady: boolean;
  refresh: () => void;
}

export function useWeather(): UseWeatherResult {
  const [current, setCurrent] = useState<WeatherSnapshot | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const [currentResult, forecastResult] = await Promise.all([
        getCurrentWeather({ forceRefresh }),
        getWeeklyForecast({ forceRefresh }),
      ]);
      setCurrent(currentResult);
      setForecast(forecastResult);
    } catch (err) {
      console.error('[useWeather] failed to load weather:', err);
      setCurrent(null);
      setForecast([]);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => {
    load(true);
  }, [load]);

  return { current, forecast, isLoading, isReady, refresh };
}
