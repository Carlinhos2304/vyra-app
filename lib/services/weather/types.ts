/**
 * WeatherProvider — same "swap the vendor without touching callers" shape as
 * the AIProvider abstraction used by the Edge Functions (see each Edge
 * Function's own providers/types.ts, e.g. supabase/functions/analyze-garment
 * /providers/types.ts), just on the client side and for weather instead of
 * AI. weatherService.ts (the only consumer UI code should ever import from)
 * is the sole place that knows which provider is active.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Small, UI-agnostic vocabulary so WeatherCard/WeeklyForecastStrip never
 * have to know a specific provider's condition strings or icon codes. */
export type WeatherConditionKey =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

export interface WeatherSnapshot {
  temperatureCelsius: number;
  feelsLikeCelsius: number;
  /** Human-readable label, e.g. "Partly Cloudy" — safe to render directly. */
  conditionLabel: string;
  conditionKey: WeatherConditionKey;
  humidityPercent: number | null;
  /** 0-100, null when the provider doesn't expose a precipitation probability. */
  chanceOfRainPercent: number | null;
  /** Epoch ms this snapshot was fetched — used by weatherService's cache, not for display. */
  fetchedAt: number;
}

export interface ForecastDay {
  /** YYYY-MM-DD, local. */
  date: string;
  highCelsius: number;
  lowCelsius: number;
  conditionLabel: string;
  conditionKey: WeatherConditionKey;
  chanceOfRainPercent: number | null;
}

export interface WeatherProvider {
  /** Short identifier used in logs (e.g. 'open-meteo'). */
  readonly name: string;
  getCurrentWeather(coords: Coordinates): Promise<WeatherSnapshot>;
  getForecast(coords: Coordinates, days: number): Promise<ForecastDay[]>;
}

export class WeatherProviderError extends Error {
  constructor(message: string, public readonly providerName: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'WeatherProviderError';
  }
}
