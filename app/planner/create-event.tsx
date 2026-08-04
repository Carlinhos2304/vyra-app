import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { BackButton } from '../../components/ui/BackButton';
import { EventForm, EventFormValues, isEventFormValid } from '../../components/planner/EventForm';
import { getNotificationPreferences } from '../../lib/services/notificationPreferences';
import { scheduleEventReminders } from '../../lib/services/notificationPlanner';
import { createRecurringEvent, type RecurrenceRule } from '../../lib/services/recurringEventService';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

export default function CreateEventScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();

  // Soft-tinted error banner — computed locally per theme, matching the pattern
  // established on create.tsx's success/error feedback banners.
  const dangerBannerBg = theme.dark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2';
  const dangerBannerBorder = theme.dark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2';

  const initialDate = params.date ? new Date(params.date) : new Date();
  const [values, setValues] = useState<EventFormValues>({
    name: '',
    date: params.date || `${initialDate.getFullYear()}-${String(initialDate.getMonth() + 1).padStart(2, '0')}-${String(initialDate.getDate()).padStart(2, '0')}`,
    rawDate: initialDate,
    startTime: null,
    endTime: null,
    location: '',
    description: '',
    category: 'Casual',
  });
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isFormValid = isEventFormValid(values);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showValidationError = (message: string) => {
    setValidationError(message);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const handleSaveEvent = async () => {
    if (!values.name.trim()) return showValidationError(t('planner.eventForm.validation.nameRequired'));
    if (!values.date.trim()) return showValidationError(t('planner.eventForm.validation.dateRequired'));
    if (!values.category) return showValidationError(t('planner.eventForm.validation.categoryRequired'));

    setValidationError(null);
    fadeAnim.setValue(0);
    setIsSaving(true);

    // --- Critical path: persist the event. This is the ONLY thing that can
    // surface as a save error to the user. ---
    let savedEventId: string | null = null;
    let savedUserId: string | null = null;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error(t('planner.createEvent.sessionInvalid'));
      savedUserId = user.id;

      if (recurrence) {
        const result = await createRecurringEvent(
          {
            name: values.name.trim(),
            category: values.category,
            location: values.location.trim(),
            description: values.description.trim(),
            startTime: values.startTime,
            endTime: values.endTime,
          },
          values.date,
          recurrence
        );
        savedEventId = result.parentEventId;
      } else {
        const { data: event, error: insertError } = await supabase
          .from('events')
          .insert({
            user_id: user.id,
            name: values.name.trim(),
            event_date: values.date,
            location: values.location.trim(),
            description: values.description.trim(),
            category: values.category,
            start_time: values.startTime,
            end_time: values.endTime,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        savedEventId = event?.id ?? null;
      }
    } catch (err: any) {
      setIsSaving(false);
      showValidationError(err.message || t('planner.createEvent.genericSaveError'));
      return;
    }

    // --- Non-critical path: schedule a local reminder. Deliberately its own
    // try/catch, separate from the insert above — this is the exact fix for
    // "the event saves but sometimes shows an error": scheduling a
    // reminder used to share the insert's try/catch, so any failure here
    // (missing OS notification permission, Android restrictions, etc.)
    // incorrectly surfaced as a save error even though the event had
    // already been persisted successfully. notificationService itself is
    // now defensive too (never throws), but this is kept isolated on
    // purpose so a future change to that service can't reintroduce the bug. ---
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', savedUserId)
        .single();

      // Schedules the full Planner Notifications default set (day-before,
      // 1-hour, 30-minute reminders — see notificationPlanner.ts) for the
      // saved event. For a recurring series this only covers the parent
      // occurrence immediately; the rest of the series gets its reminders
      // topped up by the next daily notification sweep (see
      // notificationService.runNotificationSweep -> resyncPlannerReminders),
      // which re-scans upcoming events rather than needing this screen to
      // know every generated occurrence id.
      if (profile?.notifications_enabled && savedEventId) {
        const prefs = await getNotificationPreferences();
        await scheduleEventReminders(
          {
            id: savedEventId,
            name: values.name.trim(),
            event_date: values.date,
            start_time: values.startTime ?? null,
            end_time: values.endTime ?? null,
            category: values.category,
            location: values.location.trim(),
            outfit_id: null,
          },
          prefs,
          language
        );
      }
    } catch (notifyErr) {
      console.warn('[create-event] Reminder scheduling failed — event was already saved successfully:', notifyErr);
    }

    setIsSaving(false);
    router.back();
  };

  return (
    <PremiumScreen>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={styles.headerRow}>
          <BackButton />
          <SectionHeader title={t('planner.createEvent.title')} subtitle={t('planner.createEvent.subtitle')} style={styles.headerFlexOverride} />
        </View>

        {validationError && (
          <Animated.View style={[styles.errorInlineBanner, { backgroundColor: dangerBannerBg, borderColor: dangerBannerBorder }, { opacity: fadeAnim }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.colors.danger} />
            <Text style={[styles.errorBannerText, { color: theme.colors.danger }]}>{validationError}</Text>
          </Animated.View>
        )}

        <EventForm values={values} onChange={setValues} showRecurrence recurrence={recurrence} onRecurrenceChange={setRecurrence} />

        <PremiumTouchable
          style={[styles.actionSaveButton, { backgroundColor: theme.colors.accent }, (!isFormValid || isSaving) && { opacity: 0.5 }]}
          onPress={handleSaveEvent}
          disabled={!isFormValid || isSaving}
        >
          {isSaving ? <ActivityIndicator size="small" color={theme.colors.accentForeground} /> : <Text style={[styles.saveBtnText, { color: theme.colors.accentForeground }]}>{t('planner.createEvent.saveButton')}</Text>}
        </PremiumTouchable>
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerFlexOverride: { flex: 1, paddingVertical: 0, paddingHorizontal: 0 },
  errorBannerText: { fontSize: 13, fontWeight: '500', letterSpacing: -0.2, flex: 1 },
  errorInlineBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, gap: 8 },
  actionSaveButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  saveBtnText: { fontSize: 14, fontWeight: '600' },
});
