import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { PremiumCard } from '../ui/PremiumCard';
import { SectionHeader } from '../ui/SectionHeader';
import { useTheme } from '../../theme';
import { WeatherSnapshot } from '../../lib/services/weatherService';
import { getWeatherIconName } from '../../lib/utils/weatherIcon';
import { useLanguage } from '../../i18n';

interface WeatherCardProps {
  weather: WeatherSnapshot | null;
  isLoading: boolean;
  delay?: number;
}

/**
 * WeatherCard — real weather only (via weatherService → WeatherProvider →
 * Open-Meteo). When location isn't available (permission denied, or still
 * resolving), this shows an honest "not available" state rather than any
 * placeholder numbers.
 */
export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, isLoading, delay = 0 }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(delay).easing(Easing.out(Easing.cubic))}
      style={styles.section}
    >
      <SectionHeader title={t('home.weather.title')} subtitle={t('home.weather.subtitle')} style={styles.headerSpacing} />

      <PremiumCard style={styles.card} disabled>
        {weather ? (
          <View style={styles.row}>
            <View style={[styles.iconBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name={getWeatherIconName(weather.conditionKey)} size={30} color={theme.colors.accent} />
            </View>

            <View style={styles.mainReadout}>
              <Text style={[styles.temperature, { color: theme.colors.textPrimary }]}>
                {weather.temperatureCelsius}°C
              </Text>
              <Text style={[styles.condition, { color: theme.colors.textSecondary }]}>{weather.conditionLabel}</Text>
            </View>

            <View style={styles.detailsColumn}>
              <Text style={[styles.detailLine, { color: theme.colors.textSecondary }]}>
                {t('home.weather.feelsLike', { temp: weather.feelsLikeCelsius })}
              </Text>
              {weather.humidityPercent !== null && (
                <Text style={[styles.detailLine, { color: theme.colors.textSecondary }]}>
                  {t('home.weather.humidity', { percent: weather.humidityPercent })}
                </Text>
              )}
              {weather.chanceOfRainPercent !== null && (
                <Text style={[styles.detailLine, { color: theme.colors.textSecondary }]}>
                  {t('home.weather.rainChance', { percent: weather.chanceOfRainPercent })}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.unavailableRow}>
            <Ionicons name="location-outline" size={20} color={theme.colors.textTertiary} />
            <Text style={[styles.unavailableText, { color: theme.colors.textSecondary }]}>
              {isLoading ? t('home.weather.findingWeather') : t('home.weather.enableLocation')}
            </Text>
          </View>
        )}
      </PremiumCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  headerSpacing: {
    marginBottom: 12,
  },
  card: {
    width: '100%',
    padding: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainReadout: {
    marginLeft: 14,
    flex: 1,
  },
  temperature: {
    fontSize: 30,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  condition: {
    fontSize: 13,
    marginTop: 2,
  },
  detailsColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  detailLine: {
    fontSize: 11,
    fontWeight: '500',
  },
  unavailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  unavailableText: {
    fontSize: 13,
    flex: 1,
  },
});
