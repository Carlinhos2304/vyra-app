/**
 * ConflictCard — Smart Planner spec item 8 (Conflict detection). Renders a
 * PlannerConflict from plannerConflictService as an "elegant card" — per
 * the spec, "never invasive alerts" — so this is a plain inline card in the
 * Planner's scroll flow, never an Alert.alert()/modal interruption.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import type { PlannerConflict } from '../../lib/services/plannerConflictService';

interface ConflictCardProps {
  conflict: PlannerConflict;
  onPress?: () => void;
}

const SEVERITY_ICON: Record<PlannerConflict['severity'], keyof typeof Ionicons.glyphMap> = {
  high: 'alert-circle-outline',
  medium: 'information-circle-outline',
  low: 'ellipse-outline',
};

export function ConflictCard({ conflict, onPress }: ConflictCardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const message = t(`planner.smartPlanner.conflicts.${conflict.messageKey}`, conflict.messageParams);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <Ionicons
        name={SEVERITY_ICON[conflict.severity]}
        size={16}
        color={conflict.severity === 'high' ? theme.colors.danger : theme.colors.textSecondary}
      />
      <Text style={[styles.message, { color: theme.colors.textPrimary }]}>{message}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  message: { fontSize: 13, flex: 1, lineHeight: 18 },
});
