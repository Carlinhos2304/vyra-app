/**
 * DayTimeline — Smart Planner spec item 3. Replaces the old Planner's flat
 * "Events on X" list with a vertical timeline: events with a real
 * start_time (added by the 2026-08-04 migration) render chronologically
 * with their time; events without one (every event created before that
 * migration, or created without a time) render in a separate "no time set"
 * bucket underneath rather than being sorted in arbitrarily or given a
 * fabricated slot.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumTouchable } from '../ui/PremiumTouchable';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import type { PlannerEvent } from '../../lib/services/plannerTypes';
import type { WeatherSnapshot, ForecastDay } from '../../lib/services/weatherService';
import { EVENT_CATEGORY_ICONS, type EventCategory } from '../../constants/eventCategories';
import { useEventWeather } from '../../hooks/planner/useEventWeather';
import { EventWeatherBadge } from './EventWeatherBadge';

interface DayTimelineProps {
  timed: PlannerEvent[];
  untimed: PlannerEvent[];
  todayLocalISO: string;
  currentWeather: WeatherSnapshot | null;
  forecast: ForecastDay[];
  onPressEvent: (eventId: string) => void;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = Number(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${period}`;
}

function TimelineRow({
  event,
  timeLabel,
  todayLocalISO,
  currentWeather,
  forecast,
  onPress,
  delay,
}: {
  event: PlannerEvent;
  timeLabel: string | null;
  todayLocalISO: string;
  currentWeather: WeatherSnapshot | null;
  forecast: ForecastDay[];
  onPress: () => void;
  delay: number;
}) {
  const { theme } = useTheme();
  const weather = useEventWeather(event.event_date, todayLocalISO, currentWeather, forecast);
  const icon = EVENT_CATEGORY_ICONS[event.category as EventCategory] || EVENT_CATEGORY_ICONS.Other;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(delay).easing(Easing.out(Easing.cubic))}>
      <PremiumTouchable onPress={onPress} style={styles.row}>
        <View style={styles.timeColumn}>
          <Text style={[styles.timeText, { color: theme.colors.textSecondary }, !timeLabel && styles.timeTextMuted]}>
            {timeLabel || '—'}
          </Text>
          <View style={[styles.timelineDot, { backgroundColor: theme.colors.accent }]} />
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <Ionicons name={icon} size={16} color={theme.colors.textPrimary} />
          </View>
          <View style={styles.infoBlock}>
            <Text style={[styles.eventName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {event.name}
            </Text>
            <View style={styles.metaRow}>
              <EventWeatherBadge weather={weather} />
              {event.outfit_id ? (
                <MaterialCommunityIcons name="hanger" size={14} color={theme.colors.accent} />
              ) : (
                <Ionicons name="alert-circle-outline" size={14} color={theme.colors.textTertiary} />
              )}
            </View>
          </View>
        </View>
      </PremiumTouchable>
    </Animated.View>
  );
}

export function DayTimeline({ timed, untimed, todayLocalISO, currentWeather, forecast, onPressEvent }: DayTimelineProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (timed.length === 0 && untimed.length === 0) {
    return <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('planner.smartPlanner.timeline.empty')}</Text>;
  }

  return (
    <View>
      {timed.map((event, index) => (
        <TimelineRow
          key={event.id}
          event={event}
          timeLabel={event.start_time ? formatTime(event.start_time) : null}
          todayLocalISO={todayLocalISO}
          currentWeather={currentWeather}
          forecast={forecast}
          onPress={() => onPressEvent(event.id)}
          delay={index * 40}
        />
      ))}

      {untimed.length > 0 && (
        <>
          {timed.length > 0 && (
            <Text style={[styles.sectionDivider, { color: theme.colors.textTertiary }]}>{t('planner.smartPlanner.timeline.noTimeSet')}</Text>
          )}
          {untimed.map((event, index) => (
            <TimelineRow
              key={event.id}
              event={event}
              timeLabel={null}
              todayLocalISO={todayLocalISO}
              currentWeather={currentWeather}
              forecast={forecast}
              onPress={() => onPressEvent(event.id)}
              delay={(timed.length + index) * 40}
            />
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  timeColumn: { width: 56, alignItems: 'center' },
  timeText: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  timeTextMuted: { fontStyle: 'italic' },
  timelineDot: { width: 6, height: 6, borderRadius: 3 },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoBlock: { flex: 1, gap: 4 },
  eventName: { fontSize: 14, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDivider: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, marginLeft: 68 },
  emptyText: { fontSize: 13, fontStyle: 'italic', paddingLeft: 4 },
});
