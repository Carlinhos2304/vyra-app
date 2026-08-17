import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { PremiumCard } from '../ui/PremiumCard';
import { PremiumTouchable } from '../ui/PremiumTouchable';
import { SectionHeader } from '../ui/SectionHeader';
import { useTheme } from '../../theme';
import { NextEvent } from '../../hooks/useNextEvent';
import { useLanguage } from '../../i18n';

interface TodayScheduleCardProps {
  nextEvent: NextEvent | null;
  /** Optional short note tied to nextEvent — omitted entirely since the AI
   * Daily Suggestion feature that used to populate this was removed
   * (2026-08-17, see Home's own comment). Kept as an optional prop rather
   * than deleted outright in case a future non-AI note source wants it. */
  scheduleNote?: string | null;
  onPress: () => void;
  delay?: number;
}

/** `events.event_date` is date-only — there's no time-of-day column in the
 * schema (confirmed against every real query in the app). Rather than show
 * a fabricated clock time, this renders a relative day label instead. */
function getRelativeDayLabel(eventDateISO: string, t: (key: string) => string, locale: string): string {
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (eventDateISO === todayISO) return t('common.today');

  const eventDate = new Date(`${eventDateISO}T00:00:00`);
  const todayDate = new Date(`${todayISO}T00:00:00`);
  const diffDays = Math.round((eventDate.getTime() - todayDate.getTime()) / 86_400_000);

  if (diffDays === 1) return t('common.tomorrow');
  return eventDate.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * TodayScheduleCard — replaces the old Home's raw calendar preview with just
 * the one thing that matters day-to-day: what's next. Full calendar
 * management still lives on the Calendar tab.
 */
export const TodayScheduleCard: React.FC<TodayScheduleCardProps> = ({ nextEvent, scheduleNote, onPress, delay = 0 }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(delay).easing(Easing.out(Easing.cubic))}
      style={styles.section}
    >
      <SectionHeader title={t('home.schedule.title')} style={styles.headerSpacing} />

      <PremiumCard style={styles.card} onPress={onPress}>
        {nextEvent ? (
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.eventName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {nextEvent.name}
              </Text>
              <Text style={[styles.dayLabel, { color: theme.colors.accent }]}>
                {getRelativeDayLabel(nextEvent.event_date, t, locale)}
              </Text>
            </View>

            {nextEvent.category && (
              <View style={[styles.categoryChip, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <Text style={[styles.categoryChipText, { color: theme.colors.textSecondary }]}>{nextEvent.category}</Text>
              </View>
            )}

            {scheduleNote && (
              <Text style={[styles.scheduleNote, { color: theme.colors.textSecondary }]}>{scheduleNote}</Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('home.schedule.emptyText')}</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
    marginRight: 10,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  scheduleNote: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
  },
});
