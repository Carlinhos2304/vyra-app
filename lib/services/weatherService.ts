/**
 * weatherService.ts
 *
 * The ONLY file the UI/hooks should import for weather data. Internally it
 * combines locationService (where is the user) with whichever WeatherProvider
 * weatherProviderFactory hands back (Open-Meteo by default) — callers never
 * touch either directly, so swapping providers or changing the location
 * strategy later never requires touching a component.
 *
 * Caches both the current snapshot and the forecast in AsyncStorage with
 * their own expirations, so opening Home repeatedly in the same session
 * doesn't re-hit the weather API (or re-prompt for a GPS fix) every time.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentCoordinates } from './locationService';
import { getWeatherProvider } from './weather/weatherProviderFactory';
import { Coordinates, ForecastDay, WeatherConditionKey, WeatherSnapshot } from './weather/types';

const CURRENT_CACHE_KEY = '@vyra_weather_current_cache';
const FORECAST_CACHE_KEY = '@vyra_weather_forecast_cache';

// Current conditions go stale faster than a multi-day forecast — these TTLs
// are the "intelligent expiration" the spec asked for, not a single blanket value.
const CURRENT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FORECAST_CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const FORECAST_DAYS = 5;

interface CachedEntry<T> {
  data: T;
  cachedAt: number;
}

async function readCache<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    if (!parsed?.data || typeof parsed.cachedAt !== 'number') return null;
    if (Date.now() - parsed.cachedAt >= ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CachedEntry<T> = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Non-fatal — worst case we just call the API again next time.
  }
}

/**
 * Returns today's current weather snapshot, or `null` if location isn't
 * available (permission denied) or the provider call failed — callers
 * should render "no weather right now" rather than fabricated numbers.
 */
export async function getCurrentWeather(options?: { forceRefresh?: boolean }): Promise<WeatherSnapshot | null> {
  if (!options?.forceRefresh) {
    const cached = await readCache<WeatherSnapshot>(CURRENT_CACHE_KEY, CURRENT_CACHE_TTL_MS);
    if (cached) return cached;
  }

  const coords = await getCurrentCoordinates({ forceRefresh: options?.forceRefresh });
  if (!coords) return null;

  try {
    const snapshot = await getWeatherProvider().getCurrentWeather(coords);
    await writeCache(CURRENT_CACHE_KEY, snapshot);
    return snapshot;
  } catch (err) {
    console.error('[weatherService] getCurrentWeather failed:', err);
    return null;
  }
}

/**
 * Returns a `FORECAST_DAYS`-day forecast (today included), or `[]` if
 * location/provider isn't available.
 */
export async function getWeeklyForecast(options?: { forceRefresh?: boolean }): Promise<ForecastDay[]> {
  if (!options?.forceRefresh) {
    const cached = await readCache<ForecastDay[]>(FORECAST_CACHE_KEY, FORECAST_CACHE_TTL_MS);
    if (cached) return cached;
  }

  const coords = await getCurrentCoordinates({ forceRefresh: options?.forceRefresh });
  if (!coords) return [];

  try {
    const forecast = await getWeatherProvider().getForecast(coords, FORECAST_DAYS);
    await writeCache(FORECAST_CACHE_KEY, forecast);
    return forecast;
  } catch (err) {
    console.error('[weatherService] getWeeklyForecast failed:', err);
    return [];
  }
}

export type { WeatherSnapshot, ForecastDay, WeatherConditionKey, Coordinates };
