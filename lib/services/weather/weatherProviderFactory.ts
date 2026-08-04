/**
 * weatherProviderFactory — same switch-point pattern as the AI Edge
 * Functions' providerFactory.ts. weatherService.ts is the ONLY file that
 * calls this; no UI/hook code should ever import a concrete provider class
 * directly.
 *
 * TO ADD A NEW PROVIDER LATER (e.g. one that needs an API key):
 *   1. Create ./someProvider.ts implementing WeatherProvider (./types.ts).
 *   2. If it needs a secret key, do NOT embed it in the client bundle — add a
 *      thin Edge Function proxy (mirroring supabase/functions/*) that holds
 *      the key server-side, and have someProvider.ts call that Edge Function
 *      instead of the vendor directly.
 *   3. Register it below. No changes needed anywhere else in the app.
 */

import { WeatherProvider } from './types';
import { OpenMeteoProvider } from './openMeteoProvider';

let cachedProvider: WeatherProvider | null = null;

export function getWeatherProvider(): WeatherProvider {
  if (!cachedProvider) {
    cachedProvider = new OpenMeteoProvider();
  }
  return cachedProvider;
}
