/**
 * EventWeatherBadge — Smart Planner spec item 5 (Weather Integration per
 * event). Renders whatever useEventWeather resolved — never fabricates a
 * number when the event is beyond WeatherService's forecast range.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import type { UseEventWeatherResult } from '../../hooks/planner/useEventWeather';

interface EventWeatherBadgeProps {
  weather: UseEventWeatherResult;
}

const CONDITION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  clear: 'sunny-outline',
  'partly-cloudy': 'partly-sunny-outline',
  cloudy: 'cloud-outline',
  fog: 'reorder-four-outline',
  drizzle: 'rainy-outline',
  rain: 'rainy-outline',
  snow: 'snow-outline',
  storm: 'thunderstorm-outline',
};

export function EventWeatherBadge({ weather }: EventWeatherBadgeProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!weather.isWithinForecastRange || (!weather.current && !weather.forecastDay)) {
    return (
      <View style={[styles.badge, { backgroundColor: theme.colors.surfaceSecondary }]}>
        <Ionicons name="help-circle-outline" size={13} color={theme.colors.textTertiary} />
        <Text style={[styles.text, { color: theme.colors.textTertiary }]} numberOfLines={1}>
          {weather.isWithinForecastRange
            ? t('planner.smartPlanner.weather.unavailable')
            : t('planner.smartPlanner.weather.beyondForecastRange')}
        </Text>
      </View>
    );
  }

  const conditionKey = weather.current?.conditionKey ?? weather.forecastDay?.conditionKey ?? 'clear';
  const icon = CONDITION_ICONS[conditionKey] || 'partly-sunny-outline';
  const temp = weather.current
    ? Math.round(weather.current.temperatureCelsius)
    : weather.forecastDay
    ? Math.round(weather.forecastDay.highCelsius)
    : null;
  const rainChance = weather.current?.chanceOfRainPercent ?? weather.forecastDay?.chanceOfRainPercent ?? null;

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceSecondary }]}>
      <Ionicons name={icon} size={13} color={theme.colors.textSecondary} />
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
        {temp !== null ? `${temp}°` : ''}
        {rainChance !== null && rainChance > 0 ? ` · ${t('planner.smartPlanner.weather.rainChance', { percent: rainChance })}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '500' },
});
