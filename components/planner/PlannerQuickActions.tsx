/**
 * PlannerQuickActions — Smart Planner spec item 10. A single row of four
 * shortcuts (New Event, Generate Outfit, Today, Closet) so the most common
 * Planner actions don't require scrolling to find the right button.
 * "Generate Outfit" routes to the existing AI Outfit Generator screen
 * (app/(tabs)/create.tsx's flow) rather than duplicating that UI here.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumTouchable } from '../ui/PremiumTouchable';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

interface PlannerQuickActionsProps {
  selectedDateISO: string;
  onPressToday: () => void;
}

export function PlannerQuickActions({ selectedDateISO, onPressToday }: PlannerQuickActionsProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const actions = [
    {
      key: 'newEvent',
      icon: 'add-circle-outline' as const,
      label: t('planner.smartPlanner.quickActions.newEvent'),
      onPress: () => router.push({ pathname: '/planner/create-event', params: { date: selectedDateISO } }),
    },
    {
      key: 'generateOutfit',
      icon: 'sparkles-outline' as const,
      label: t('planner.smartPlanner.quickActions.generateOutfit'),
      onPress: () => router.push('/(tabs)/create'),
    },
    {
      key: 'today',
      icon: 'today-outline' as const,
      label: t('planner.smartPlanner.quickActions.today'),
      onPress: onPressToday,
    },
    {
      key: 'closet',
      icon: 'shirt-outline' as const,
      label: t('planner.smartPlanner.quickActions.closet'),
      onPress: () => router.push('/(tabs)/closet'),
    },
  ];

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <PremiumTouchable key={action.key} style={styles.action} onPress={action.onPress}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <Ionicons name={action.icon} size={18} color={theme.colors.textPrimary} />
          </View>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {action.label}
          </Text>
        </PremiumTouchable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', gap: 6, flex: 1 },
  iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
});
