/**
 * locationService.ts
 *
 * Thin wrapper around expo-location for the one thing Home needs: "roughly
 * where is the user right now, without asking every single time". Nothing
 * here is Vyra-specific business logic — WeatherService is the only caller.
 *
 * Requires the `expo-location` package (see the setup notes delivered with
 * this build — it isn't installed yet, run `npx expo install expo-location`).
 *
 * Permission handling is deliberately soft-fail: if the user denies location
 * access, every function here resolves to `null` rather than throwing, so
 * the Home screen can simply not render the Weather card instead of
 * crashing or showing fake data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Coordinates } from './weather/types';

const LOCATION_CACHE_KEY = '@vyra_location_cache';
// Coordinates rarely change meaningfully within a short window for a
// clothing/weather use case (unlike turn-by-turn navigation) — 15 minutes
// keeps repeated Home visits fast without asking the OS for a GPS fix constantly.
const LOCATION_CACHE_TTL_MS = 15 * 60 * 1000;

interface CachedLocation {
  coords: Coordinates;
  cachedAt: number;
}

async function readCache(): Promise<CachedLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (!parsed?.coords || typeof parsed.cachedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(coords: Coordinates): Promise<void> {
  try {
    const entry: CachedLocation = { coords, cachedAt: Date.now() };
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Non-fatal — worst case we just ask the OS for a fresh fix next time.
  }
}

/**
 * Returns the user's current coordinates, using a short-lived cache to avoid
 * hitting the OS location API on every Home mount. Returns `null` if
 * permission was denied or location couldn't be determined — callers should
 * treat that as "no weather available right now", not as an error to surface.
 */
export async function getCurrentCoordinates(options?: { forceRefresh?: boolean }): Promise<Coordinates | null> {
  if (!options?.forceRefresh) {
    const cached = await readCache();
    if (cached && Date.now() - cached.cachedAt < LOCATION_CACHE_TTL_MS) {
      return cached.coords;
    }
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords: Coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    await writeCache(coords);
    return coords;
  } catch (err) {
    console.error('[locationService] failed to get current position:', err);
    // Fall back to a stale cached position rather than nothing, if we have one.
    const cached = await readCache();
    return cached?.coords ?? null;
  }
}
