/**
 * weatherIcon.ts — maps Vyra's small WeatherConditionKey vocabulary (see
 * lib/services/weather/types.ts) to an Ionicons glyph name. The one place
 * WeatherCard and WeeklyForecastStrip both go for this, so the mapping never
 * drifts between the two.
 */

import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { WeatherConditionKey } from '../services/weather/types';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export function getWeatherIconName(key: WeatherConditionKey): IoniconsName {
  switch (key) {
    case 'clear':
      return 'sunny-outline';
    case 'partly-cloudy':
      return 'partly-sunny-outline';
    case 'cloudy':
    case 'fog':
      return 'cloudy-outline';
    case 'drizzle':
    case 'rain':
      return 'rainy-outline';
    case 'snow':
      return 'snow-outline';
    case 'storm':
      return 'thunderstorm-outline';
    default:
      return 'cloudy-outline';
  }
}
