/**
 * CalendarDayCell — extracted from app/(tabs)/calendar.tsx's old inline
 * CalendarDayItem, so the week-strip cell is reusable/testable on its own
 * and calendar.tsx doesn't carry its rendering logic inline (part of the
 * "no quiero un planner gigantesco" architecture cleanup).
 *
 * Smart Planner spec item 2 (Enhanced calendar): extends the original
 * single "has a planned outfit" dot with a small indicator row — a neutral
 * dot for "has an event", an accent dot for "has an assigned outfit" — plus
 * a small warning glyph in the corner for "conflict or difficult-weather
 * day", instead of adding a wall of dots that wouldn't fit a 7-day strip.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PremiumTouchable } from '../ui/PremiumTouchable';
import { useTheme } from '../../theme';

export interface CalendarDayCellModel {
  isoString: string;
  dayNameLabel: string;
  dayNumberLabel: string;
}

export interface CalendarDayIndicators {
  hasEvent: boolean;
  hasOutfit: boolean;
  hasConflict: boolean;
  hasDifficultWeather: boolean;
}

interface CalendarDayCellProps {
  day: CalendarDayCellModel;
  isSelected: boolean;
  indicators: CalendarDayIndicators;
  onPress: () => void;
}

export function CalendarDayCell({ day, isSelected, indicators, onPress }: CalendarDayCellProps) {
  const { theme } = useTheme();
  const animatedScale = useSharedValue(1);
  const bgColor = useSharedValue(0);

  useEffect(() => {
    // Kept as-is from the original CalendarDayItem — this is a pre-existing
    // "selected day" scale bump, not new bounce added by this rebuild, and
    // it's small enough (1.0 -> 1.1) that it reads as a snap, not a bounce.
    animatedScale.value = isSelected ? withSpring(1.1) : withSpring(1);
    bgColor.value = isSelected ? 1 : 0;
  }, [isSelected]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: animatedScale.value }],
    backgroundColor: interpolateColor(bgColor.value, [0, 1], ['transparent', theme.colors.accent]),
  }));

  const showWarning = indicators.hasConflict || indicators.hasDifficultWeather;

  return (
    <PremiumTouchable onPress={onPress}>
      <Animated.View style={[styles.cell, style]}>
        {showWarning && (
          <View style={[styles.warningBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="alert" size={8} color={theme.colors.danger} />
          </View>
        )}
        <Text style={[styles.dayName, { color: theme.colors.textSecondary }, isSelected && { color: theme.colors.accentForeground }]}>
          {day.dayNameLabel}
        </Text>
        <Text style={[styles.dayNumber, { color: theme.colors.textPrimary }, isSelected && { color: theme.colors.accentForeground }]}>
          {day.dayNumberLabel}
        </Text>
        <View style={styles.dotsRow}>
          {indicators.hasEvent && (
            <View
              style={[styles.dot, { backgroundColor: isSelected ? theme.colors.accentForeground : theme.colors.textTertiary }]}
            />
          )}
          {indicators.hasOutfit && (
            <View style={[styles.dot, { backgroundColor: isSelected ? theme.colors.accentForeground : theme.colors.accent }]} />
          )}
        </View>
      </Animated.View>
    </PremiumTouchable>
  );
}

const styles = StyleSheet.create({
  cell: { paddingVertical: 10, borderRadius: 12, alignItems: 'center', position: 'relative', width: '100%' },
  dayName: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  dayNumber: { fontSize: 14, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', gap: 3, marginTop: 5, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  warningBadge: {
    position: 'absolute',
    top: -4,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
