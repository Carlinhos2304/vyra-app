/**
 * EventForm — shared event form extracted from create-event.tsx and
 * event-details.tsx's edit mode, which had re-implemented almost the exact
 * same form (name/date/category chips/location autocomplete/description,
 * iOS vs Android date-picker branching) independently — one of the
 * duplication issues the Planner audit flagged. Both screens now render
 * this single component; behavioral differences (recurrence only offered
 * on create, since editing a single occurrence of an existing series is out
 * of scope for this pass) are controlled via props, not by forking the form.
 *
 * Also fixes a UX issue the audit flagged: location and description used to
 * be required fields, blocking a quick "just get this on the calendar"
 * save. They're optional now — only name, date, and category are required.
 *
 * Adds the two new optional fields the Smart Planner's Day Timeline needs:
 * start time / end time (added by the 2026-08-04 migration). Leaving both
 * empty is completely valid — the event simply renders in the Timeline's
 * "no time set" bucket instead of a fabricated slot.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { PremiumTouchable } from '../ui/PremiumTouchable';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import { EVENT_CATEGORIES } from '../../constants/eventCategories';
import { RecurrenceSelector } from './RecurrenceSelector';
import type { RecurrenceRule } from '../../lib/services/recurringEventService';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export interface EventFormValues {
  name: string;
  date: string;
  rawDate: Date;
  startTime: string | null;
  endTime: string | null;
  location: string;
  description: string;
  category: string;
}

interface EventFormProps {
  values: EventFormValues;
  onChange: (values: EventFormValues) => void;
  showRecurrence?: boolean;
  recurrence?: RecurrenceRule | null;
  onRecurrenceChange?: (rule: RecurrenceRule | null) => void;
  /** i18n namespace prefix for field labels — 'planner.eventForm' for both
   * create and edit now that the form itself is shared. */
  translationNamespace?: string;
}

function toTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function EventForm({
  values,
  onChange,
  showRecurrence = false,
  recurrence = null,
  onRecurrenceChange,
  translationNamespace = 'planner.eventForm',
}: EventFormProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const placesRef = useRef<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    if (placesRef.current && values.location === '') {
      placesRef.current.setAddressText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.location]);

  const update = (patch: Partial<EventFormValues>) => onChange({ ...values, ...patch });

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      update({ rawDate: selectedDate, date: `${year}-${month}-${day}` });
    }
  };

  const handleStartTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowStartTimePicker(false);
    if (selectedDate) update({ startTime: toTimeString(selectedDate) });
  };

  const handleEndTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEndTimePicker(false);
    if (selectedDate) update({ endTime: toTimeString(selectedDate) });
  };

  const fields = (key: string) => t(`${translationNamespace}.fields.${key}`);
  const placeholders = (key: string) => t(`${translationNamespace}.placeholders.${key}`);

  return (
    <>
      <View style={styles.formGroup}>
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{fields('eventName')}</Text>
        <TextInput
          style={[styles.inputField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
          placeholder={placeholders('eventName')}
          placeholderTextColor={theme.colors.textTertiary}
          value={values.name}
          onChangeText={(name) => update({ name })}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{fields('date')}</Text>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setShowDatePicker(true)}>
          <View pointerEvents="none">
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
              placeholder={placeholders('date')}
              placeholderTextColor={theme.colors.textTertiary}
              value={values.date}
              editable={false}
            />
          </View>
          <MaterialCommunityIcons name="calendar-month-outline" size={18} color={theme.colors.textSecondary} style={styles.calendarInlineIcon} />
        </TouchableOpacity>

        {showDatePicker &&
          (Platform.OS === 'ios' ? (
            <View style={[styles.iosPickerWrapper, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
              <View style={[styles.iosPickerHeaderRow, { backgroundColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.iosPickerDoneText, { color: theme.colors.textPrimary }]}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={values.rawDate} mode="date" display="spinner" onChange={handleDateChange} />
            </View>
          ) : (
            <DateTimePicker value={values.rawDate} mode="date" display="default" onChange={handleDateChange} />
          ))}
      </View>

      <View style={styles.timeRow}>
        <View style={[styles.formGroup, styles.timeField]}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{fields('startTime')}</Text>
          <TouchableOpacity
            style={[styles.timeButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setShowStartTimePicker(true)}
          >
            <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.timeButtonText, { color: values.startTime ? theme.colors.textPrimary : theme.colors.textTertiary }]}>
              {values.startTime || placeholders('startTime')}
            </Text>
            {values.startTime && (
              <TouchableOpacity onPress={() => update({ startTime: null })} hitSlop={8}>
                <Ionicons name="close-circle" size={15} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showStartTimePicker && (
            <DateTimePicker value={new Date()} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleStartTimeChange} />
          )}
        </View>

        <View style={[styles.formGroup, styles.timeField]}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{fields('endTime')}</Text>
          <TouchableOpacity
            style={[styles.timeButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.timeButtonText, { color: values.endTime ? theme.colors.textPrimary : theme.colors.textTertiary }]}>
              {values.endTime || placeholders('endTime')}
            </Text>
            {values.endTime && (
              <TouchableOpacity onPress={() => update({ endTime: null })} hitSlop={8}>
                <Ionicons name="close-circle" size={15} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showEndTimePicker && (
            <DateTimePicker value={new Date()} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleEndTimeChange} />
          )}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{fields('category')}</Text>
        <View style={styles.chipsRowLayout}>
          {EVENT_CATEGORIES.map((cat) => {
            const isSelected = values.category === cat;
            return (
              <PremiumTouchable
                key={cat}
                style={[
                  styles.chip,
                  { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
                  isSelected && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
                ]}
                onPress={() => update({ category: cat })}
              >
                <Text style={[styles.chipText, { color: theme.colors.textSecondary }, isSelected && { color: theme.colors.accentForeground }]}>
                  {t(`${translationNamespace}.categories.${cat.toLowerCase()}`)}
                </Text>
              </PremiumTouchable>
            );
          })}
        </View>
      </View>

      <View style={[styles.formGroup, { zIndex: 1000, position: 'relative' }]}>
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{fields('location')}</Text>
        <GooglePlacesAutocomplete
          ref={placesRef}
          placeholder={placeholders('location')}
          minLength={2}
          fetchDetails={false}
          debounce={400}
          disableScroll={true}
          onPress={(data) => update({ location: data.description })}
          textInputProps={{
            placeholderTextColor: theme.colors.textTertiary,
            style: [styles.inputField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }],
            onChangeText: (text: string) => update({ location: text }),
            defaultValue: values.location,
          }}
          query={{ key: GOOGLE_PLACES_API_KEY, language: 'en', type: 'geocode' }}
          styles={{
            container: { flex: 0 },
            listView: [styles.googleAutocompleteListView, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }],
            row: [styles.googleAutocompleteRow, { backgroundColor: theme.colors.surface }],
            description: [styles.googleAutocompleteDescription, { color: theme.colors.textPrimary }],
            separator: [styles.googleAutocompleteSeparator, { backgroundColor: theme.colors.divider }],
          }}
          enablePoweredByContainer={false}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{fields('description')}</Text>
        <TextInput
          style={[styles.inputField, styles.textAreaField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
          placeholder={placeholders('description')}
          placeholderTextColor={theme.colors.textTertiary}
          value={values.description}
          onChangeText={(description) => update({ description })}
          multiline
          numberOfLines={3}
        />
      </View>

      {showRecurrence && onRecurrenceChange && <RecurrenceSelector value={recurrence} onChange={onRecurrenceChange} />}
    </>
  );
}

export function isEventFormValid(values: EventFormValues): boolean {
  return values.name.trim().length > 0 && values.date.trim().length > 0 && values.category.length > 0;
}

const styles = StyleSheet.create({
  formGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  inputField: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textAreaField: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  chipsRowLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },

  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  timeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  timeButtonText: { fontSize: 13, flex: 1 },

  calendarInlineIcon: { position: 'absolute', right: 16, bottom: 14 },
  iosPickerWrapper: { borderRadius: 14, marginTop: 8, overflow: 'hidden', borderWidth: 1 },
  iosPickerHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10 },
  iosPickerDoneText: { fontWeight: '600', fontSize: 14 },

  googleAutocompleteListView: { borderRadius: 12, borderWidth: 1, marginTop: 6, elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, position: 'absolute', top: 45, left: 0, right: 0, zIndex: 5000 },
  googleAutocompleteRow: { padding: 14 },
  googleAutocompleteDescription: { fontSize: 13 },
  googleAutocompleteSeparator: { height: 0.5 },
});
