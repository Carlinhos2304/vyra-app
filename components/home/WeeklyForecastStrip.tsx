import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { SectionHeader } from '../ui/SectionHeader';
import { useTheme } from '../../theme';
import { ForecastDay } from '../../lib/services/weatherService';
import { getWeatherIconName } from '../../lib/utils/weatherIcon';
import { getOutfitRecommendation } from '../../lib/utils/weatherRecommendation';
import { useLanguage } from '../../i18n';

const { width } = Dimensions.get('window');

interface WeeklyForecastStripProps {
  forecast: ForecastDay[];
  isLoading: boolean;
  delay?: number;
}

function getDayLabel(dateISO: string, index: number, t: (key: string) => string, locale: string): string {
  if (index === 0) return t('common.today');
  const date = new Date(`${dateISO}T00:00:00`);
  return date.toLocaleDateString(locale, { weekday: 'short' });
}

/**
 * WeeklyForecastStrip — real forecast (weatherService) instead of the old
 * planned-outfit lookahead strip. Each day shows its high temperature and a
 * deterministic outfit-type recommendation (see lib/utils/weatherRecommendation.ts)
 * — "today's planned outfit" itself is already covered by TodayOutfitCard,
 * and the full week of planned outfits still lives on the Calendar tab.
 */
export const WeeklyForecastStrip: React.FC<WeeklyForecastStripProps> = ({ forecast, isLoading, delay = 0 }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  if (isLoading || forecast.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(delay).easing(Easing.out(Easing.cubic))}
      style={styles.section}
    >
      <SectionHeader title={t('home.forecast.title')} subtitle={t('home.forecast.subtitle')} style={styles.headerSpacing} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {forecast.map((day, index) => (
          <View
            key={day.date}
            style={[styles.dayCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.dayLabel, { color: theme.colors.textSecondary }]}>{getDayLabel(day.date, index, t, locale)}</Text>
            <Ionicons name={getWeatherIconName(day.conditionKey)} size={22} color={theme.colors.accent} style={styles.icon} />
            <Text style={[styles.highTemp, { color: theme.colors.textPrimary }]}>{day.highCelsius}°</Text>
            <Text style={[styles.recommendation, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {getOutfitRecommendation(day)}
            </Text>
          </View>
        ))}
      </ScrollView>
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
  scrollContent: {
    gap: 10,
  },
  dayCard: {
    width: (width - 78) / 3.2,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  icon: {
    marginTop: 8,
  },
  highTemp: {
    fontSize: 16,
    fontWeight: '400',
    marginTop: 6,
  },
  recommendation: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 13,
  },
});
