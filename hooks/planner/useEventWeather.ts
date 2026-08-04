/**
 * useEventWeather — Smart Planner spec item 5 (Weather Integration per
 * event). Reuses WeatherService exclusively (via the already-loaded
 * `current`/`forecast` from useWeather) — this hook never calls a weather
 * API directly, per the explicit constraint in the Smart Planner brief.
 *
 * weatherService.getWeeklyForecast() only returns FORECAST_DAYS (5, as of
 * this writing) days of data. For an event further out than that, this
 * hook honestly reports `isWithinForecastRange: false` instead of
 * fabricating a forecast — the UI (EventWeatherBadge) shows "weather not
 * available yet" rather than a guessed number.
 */

import { useMemo } from 'react';
import type { ForecastDay, WeatherSnapshot } from '../../lib/services/weatherService';

export interface UseEventWeatherResult {
  isToday: boolean;
  isWithinForecastRange: boolean;
  /** Today's live snapshot when the event is today, otherwise null. */
  current: WeatherSnapshot | null;
  /** The matching forecast day when available (today or up to FORECAST_DAYS out). */
  forecastDay: ForecastDay | null;
}

export function useEventWeather(
  eventDateISO: string,
  todayLocalISO: string,
  current: WeatherSnapshot | null,
  forecast: ForecastDay[]
): UseEventWeatherResult {
  return useMemo(() => {
    const isToday = eventDateISO === todayLocalISO;
    const forecastDay = forecast.find((f) => f.date === eventDateISO) ?? null;

    return {
      isToday,
      isWithinForecastRange: !!forecastDay,
      current: isToday ? current : null,
      forecastDay,
    };
  }, [eventDateISO, todayLocalISO, current, forecast]);
}
