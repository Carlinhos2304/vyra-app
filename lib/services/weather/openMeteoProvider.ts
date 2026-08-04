/**
 * OpenMeteoProvider — default WeatherProvider. Open-Meteo requires no API
 * key/signup, so unlike the AI providers, no secret ever needs to be hidden
 * behind an Edge Function for this to work — the app calls it directly.
 * If a future provider DOES need a key, swap it in via
 * weatherProviderFactory.ts's switch (same pattern as the AI providers'
 * providerFactory.ts) without touching any UI/hook code.
 */

import {
  Coordinates,
  ForecastDay,
  WeatherConditionKey,
  WeatherProvider,
  WeatherProviderError,
  WeatherSnapshot,
} from './types';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 10_000;

/** Open-Meteo (and the wider weather industry) uses the WMO weather
 * interpretation codes — this is the one place that vocabulary is decoded
 * into Vyra's own small WeatherConditionKey enum + a display label. */
function mapWeatherCode(code: number): { label: string; key: WeatherConditionKey } {
  if (code === 0) return { label: 'Clear', key: 'clear' };
  if (code === 1) return { label: 'Mostly Clear', key: 'clear' };
  if (code === 2) return { label: 'Partly Cloudy', key: 'partly-cloudy' };
  if (code === 3) return { label: 'Cloudy', key: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog', key: 'fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', key: 'drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', key: 'rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', key: 'snow' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', key: 'storm' };
  return { label: 'Cloudy', key: 'cloudy' };
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const body = await response.text();
      throw new WeatherProviderError(`Open-Meteo API error (${response.status}): ${body}`, 'open-meteo');
    }
    return await response.json();
  } catch (err) {
    if (err instanceof WeatherProviderError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new WeatherProviderError('Open-Meteo request timed out.', 'open-meteo', err);
    }
    throw new WeatherProviderError(`Unexpected Open-Meteo failure: ${(err as Error)?.message ?? err}`, 'open-meteo', err);
  } finally {
    clearTimeout(timeout);
  }
}

export class OpenMeteoProvider implements WeatherProvider {
  readonly name = 'open-meteo';

  async getCurrentWeather(coords: Coordinates): Promise<WeatherSnapshot> {
    const url = `${BASE_URL}?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&daily=precipitation_probability_max&timezone=auto&forecast_days=1`;
    const data = await fetchJson(url);

    const current = data?.current;
    if (!current || typeof current.temperature_2m !== 'number') {
      throw new WeatherProviderError('Open-Meteo response did not include current conditions.', 'open-meteo');
    }

    const { label, key } = mapWeatherCode(current.weather_code);

    return {
      temperatureCelsius: Math.round(current.temperature_2m),
      feelsLikeCelsius: Math.round(current.apparent_temperature ?? current.temperature_2m),
      conditionLabel: label,
      conditionKey: key,
      humidityPercent: typeof current.relative_humidity_2m === 'number' ? Math.round(current.relative_humidity_2m) : null,
      chanceOfRainPercent: Array.isArray(data?.daily?.precipitation_probability_max)
        ? data.daily.precipitation_probability_max[0] ?? null
        : null,
      fetchedAt: Date.now(),
    };
  }

  async getForecast(coords: Coordinates, days: number): Promise<ForecastDay[]> {
    const clampedDays = Math.max(1, Math.min(16, days));
    const url = `${BASE_URL}?latitude=${coords.latitude}&longitude=${coords.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=${clampedDays}`;
    const data = await fetchJson(url);

    const daily = data?.daily;
    if (!daily || !Array.isArray(daily.time)) {
      throw new WeatherProviderError('Open-Meteo response did not include a daily forecast.', 'open-meteo');
    }

    return daily.time.map((date: string, index: number) => {
      const { label, key } = mapWeatherCode(daily.weather_code?.[index]);
      return {
        date,
        highCelsius: Math.round(daily.temperature_2m_max?.[index]),
        lowCelsius: Math.round(daily.temperature_2m_min?.[index]),
        conditionLabel: label,
        conditionKey: key,
        chanceOfRainPercent: daily.precipitation_probability_max?.[index] ?? null,
      };
    });
  }
}
