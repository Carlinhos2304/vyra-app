/**
 * DaySummaryCard — Smart Planner spec item 1 (Day Summary on open). Editorial,
 * compact: event count, next event, the day's assigned/recommended outfit,
 * and today's temperature when the selected day is today. Reuses
 * PremiumCard's visual language via a plain View (see the note in
 * WardrobeInsightsGrid.tsx — PremiumCard's outer Pressable forces flex:1,
 * which is irrelevant here since this card isn't part of a wrap grid, but
 * kept as a plain View anyway for consistency with the rest of the new
 * Planner components and to avoid an unnecessary Pressable wrapper around
 * content that isn't a single tappable action).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import type { DaySummary } from '../../hooks/planner/useDaySummary';

interface DaySummaryCardProps {
  summary: DaySummary;
  delay?: number;
}

export function DaySummaryCard({ summary, delay = 0 }: DaySummaryCardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(delay).easing(Easing.out(Easing.cubic))}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>{t('planner.smartPlanner.daySummary.heading')}</Text>
        {summary.temperatureCelsius !== null ? (
          <View style={styles.weatherPill}>
            <Ionicons name="partly-sunny-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.weatherText, { color: theme.colors.textSecondary }]}>{Math.round(summary.temperatureCelsius)}°</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.eventsCount, { color: theme.colors.textPrimary }]}>
        {summary.eventCount > 0
          ? t('planner.smartPlanner.daySummary.eventsToday', { count: summary.eventCount })
          : t('planner.smartPlanner.daySummary.noEvents')}
      </Text>

      {summary.nextEvent && (
        <View style={styles.row}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.rowText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {t('planner.smartPlanner.daySummary.nextEventLabel', { name: summary.nextEvent.name })}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <MaterialCommunityIcons name="hanger" size={14} color={theme.colors.textSecondary} />
        <Text style={[styles.rowText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {summary.plan
            ? summary.plan.sourceEventName
              ? t('planner.smartPlanner.daySummary.outfitReadyForEvent', { name: summary.plan.outfitName, eventName: summary.plan.sourceEventName })
              : t('planner.smartPlanner.daySummary.outfitReady', { name: summary.plan.outfitName })
            : t('planner.smartPlanner.daySummary.noOutfitYet')}
        </Text>
      </View>

      {!!summary.plan?.additionalOutfitCount && (
        <Text style={[styles.additionalOutfitsText, { color: theme.colors.textTertiary }]}>
          {t('planner.smartPlanner.daySummary.additionalOutfits', { count: summary.plan.additionalOutfitCount })}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  weatherPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weatherText: { fontSize: 12, fontWeight: '500' },
  eventsCount: { fontSize: 20, fontWeight: '400', letterSpacing: -0.3, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rowText: { fontSize: 13, flex: 1 },
  additionalOutfitsText: { fontSize: 11, marginLeft: 20 },
});
