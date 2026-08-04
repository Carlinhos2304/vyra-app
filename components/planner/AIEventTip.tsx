/**
 * AIEventTip — Smart Planner spec item 6 (AI Event Suggestions). Renders the
 * `reasoning` string from a generate-outfit suggestion (the SAME Edge
 * Function/AI infra used everywhere else in the app — see
 * useEventOutfitAssignment.ts's header comment) as an editorial "AI note"
 * line, e.g. "Rain is expected before your meeting. Consider replacing
 * white sneakers." — exactly the kind of tip the spec asked for, without a
 * second AI call or prompt.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

interface AIEventTipProps {
  reasoning: string;
}

export function AIEventTip({ reasoning }: AIEventTipProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!reasoning) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceSecondary }]}>
      <Ionicons name="sparkles-outline" size={14} color={theme.colors.textPrimary} style={styles.icon} />
      <View style={styles.textBlock}>
        <Text style={[styles.label, { color: theme.colors.textTertiary }]}>{t('planner.smartPlanner.outfitAssignment.aiTipLabel')}</Text>
        <Text style={[styles.body, { color: theme.colors.textPrimary }]}>{reasoning}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: 14, padding: 12, gap: 10, alignItems: 'flex-start' },
  icon: { marginTop: 2 },
  textBlock: { flex: 1 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  body: { fontSize: 13, lineHeight: 18 },
});
