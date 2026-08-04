/**
 * RecurrenceSelector — Smart Planner spec item 9 (Recurring events: Daily /
 * Weekly / Monthly / Custom). Used inside EventForm, only during creation
 * (editing a single occurrence of an existing series is out of scope for
 * this pass — see the final report's architecture notes). Emits a
 * RecurrenceRule | null (null = "Never", i.e. a plain one-off event) that
 * create-event.tsx hands to recurringEventService.createRecurringEvent.
 */

import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumTouchable } from '../ui/PremiumTouchable';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import type { RecurrenceRule, RecurrenceType } from '../../lib/services/recurringEventService';

interface RecurrenceSelectorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const OPTIONS: Array<{ key: RecurrenceType | 'none'; labelKey: string }> = [
  { key: 'none', labelKey: 'none' },
  { key: 'daily', labelKey: 'daily' },
  { key: 'weekly', labelKey: 'weekly' },
  { key: 'monthly', labelKey: 'monthly' },
  { key: 'custom', labelKey: 'custom' },
];

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const selectedKey: RecurrenceType | 'none' = value?.type ?? 'none';

  const handleSelect = (key: RecurrenceType | 'none') => {
    if (key === 'none') {
      onChange(null);
      return;
    }
    onChange({ type: key, intervalDays: key === 'custom' ? value?.intervalDays ?? 2 : undefined, endDateISO: value?.endDateISO ?? null });
  };

  const handleEndDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEndDatePicker(false);
    if (selectedDate && value) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      onChange({ ...value, endDateISO: `${y}-${m}-${d}` });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('planner.eventForm.recurrence.title')}</Text>
      <View style={styles.chipsRow}>
        {OPTIONS.map((opt) => {
          const isSelected = selectedKey === opt.key;
          return (
            <PremiumTouchable
              key={opt.key}
              style={[
                styles.chip,
                { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
                isSelected && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
              ]}
              onPress={() => handleSelect(opt.key)}
            >
              <Text style={[styles.chipText, { color: theme.colors.textSecondary }, isSelected && { color: theme.colors.accentForeground }]}>
                {t(`planner.eventForm.recurrence.${opt.labelKey}`)}
              </Text>
            </PremiumTouchable>
          );
        })}
      </View>

      {value?.type === 'custom' && (
        <View style={styles.intervalRow}>
          <Text style={[styles.intervalLabel, { color: theme.colors.textSecondary }]}>{t('planner.eventForm.recurrence.intervalLabel')}</Text>
          <TextInput
            style={[styles.intervalInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            keyboardType="number-pad"
            value={String(value.intervalDays ?? 2)}
            onChangeText={(text) => {
              const n = parseInt(text, 10);
              onChange({ ...value, intervalDays: Number.isFinite(n) && n > 0 ? n : 1 });
            }}
          />
        </View>
      )}

      {value && (
        <View style={styles.endDateBlock}>
          <Text style={[styles.intervalLabel, { color: theme.colors.textSecondary }]}>{t('planner.eventForm.recurrence.endDateLabel')}</Text>
          <TouchableOpacity
            style={[styles.endDateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setShowEndDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar-month-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.endDateText, { color: value.endDateISO ? theme.colors.textPrimary : theme.colors.textTertiary }]}>
              {value.endDateISO || t('planner.eventForm.recurrence.endDateHint')}
            </Text>
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={value.endDateISO ? new Date(value.endDateISO) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  intervalLabel: { fontSize: 12 },
  intervalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: 60, fontSize: 14 },
  endDateBlock: { marginTop: 12 },
  endDateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  endDateText: { fontSize: 13 },
});
