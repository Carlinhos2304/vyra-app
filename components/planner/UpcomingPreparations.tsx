/**
 * UpcomingPreparations — Smart Planner spec item 7. Renders the tips from
 * eventPreparationService.generatePreparationTips (via
 * useUpcomingPreparations) as a compact list. Shows nothing (returns null)
 * when there are no tips — an empty "nothing to prepare" state, matching
 * the rest of the Planner's honest-empty-state convention (e.g.
 * calendar.tsx's "clear" empty state) rather than always taking up space.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import type { PreparationTip } from '../../lib/services/eventPreparationService';

interface UpcomingPreparationsProps {
  tips: PreparationTip[];
}

const TIP_ICON: Record<PreparationTip['type'], keyof typeof Ionicons.glyphMap> = {
  'review-outfit': 'eye-outline',
  'assign-outfit': 'add-circle-outline',
  laundry: 'water-outline',
};

export function UpcomingPreparations({ tips }: UpcomingPreparationsProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (tips.length === 0) return null;

  return (
    <View style={styles.container}>
      {tips.map((tip) => (
        <View key={tip.id} style={[styles.row, { borderColor: theme.colors.border }]}>
          <Ionicons name={TIP_ICON[tip.type]} size={15} color={theme.colors.textSecondary} />
          <Text style={[styles.text, { color: theme.colors.textPrimary }]}>
            {t(`planner.smartPlanner.preparations.${tip.messageKey}`, tip.messageParams)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8 },
  text: { fontSize: 13, flex: 1, lineHeight: 18 },
});
