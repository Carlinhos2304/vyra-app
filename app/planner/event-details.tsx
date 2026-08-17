import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { AppAlert } from '../../lib/ui/appAlert';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { BackButton } from '../../components/ui/BackButton';
import { EventForm, EventFormValues, isEventFormValid } from '../../components/planner/EventForm';
import { EventWeatherBadge } from '../../components/planner/EventWeatherBadge';
import { EventOutfitAssignment } from '../../components/planner/EventOutfitAssignment';
import { useEventWeather } from '../../hooks/planner/useEventWeather';
import { useWeather } from '../../hooks/useWeather';
import { supabase } from '../../lib/supabase';
import type { PlannerEvent } from '../../lib/services/plannerTypes';
import { getNotificationPreferences } from '../../lib/services/notificationPreferences';
import { cancelEventReminders, scheduleEventReminders } from '../../lib/services/notificationPlanner';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

const EVENT_SELECT =
  'id, name, event_date, start_time, end_time, category, location, description, outfit_id, recurrence_type, outfits(id, name, occasion, ai_confidence, outfit_items(clothing_items(id, name, image_url)))';

function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function EventDetailsScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { current: currentWeather, forecast } = useWeather();
  const todayLocalISO = toLocalISODate(new Date());

  const dangerBannerBg = theme.dark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2';
  const dangerBannerBorder = theme.dark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2';

  const [event, setEvent] = useState<PlannerEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<EventFormValues | null>(null);

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  const fetchEventMetaGraph = useCallback(async (isActiveRef: { current: boolean }) => {
    try {
      setIsLoading(true);
      const { data, error: queryErr } = await supabase.from('events').select(EVENT_SELECT).eq('id', id).single();
      if (queryErr) throw queryErr;

      if (!isActiveRef.current) return;
      setEvent(data as unknown as PlannerEvent);
      setFormValues({
        name: data.name || '',
        date: data.event_date || '',
        rawDate: data.event_date ? new Date(data.event_date) : new Date(),
        startTime: data.start_time || null,
        endTime: data.end_time || null,
        location: data.location || '',
        description: data.description || '',
        category: data.category || 'Casual',
      });
    } catch (err: any) {
      if (!isActiveRef.current) return;
      setError(err.message || t('planner.eventDetails.fetchError'));
    } finally {
      if (isActiveRef.current) setIsLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const isActiveRef = { current: true };
      fetchEventMetaGraph(isActiveRef);
      return () => {
        isActiveRef.current = false;
      };
    }, [id, fetchEventMetaGraph])
  );

  useEffect(() => {
    if (validationError) {
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [validationError, fadeAnim]);

  const handleUpdateEvent = async () => {
    if (!formValues) return;
    if (!isEventFormValid(formValues)) {
      if (!formValues.name.trim()) return setValidationError(t('planner.eventForm.validation.nameRequired'));
      if (!formValues.date.trim()) return setValidationError(t('planner.eventForm.validation.dateRequired'));
      return setValidationError(t('planner.eventForm.validation.categoryRequired'));
    }

    setValidationError(null);
    setIsSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          name: formValues.name.trim(),
          event_date: formValues.date,
          category: formValues.category,
          location: formValues.location.trim(),
          description: formValues.description.trim(),
          start_time: formValues.startTime,
          end_time: formValues.endTime,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setIsEditing(false);
      await fetchEventMetaGraph({ current: true });

      // Non-critical path, isolated from the update above for the same
      // reason create-event.tsx keeps reminder scheduling out of its save
      // try/catch — a notification-scheduling hiccup must never surface as
      // an "update failed" error on an update that actually succeeded.
      // scheduleEventReminders() always cancels this event's existing
      // reminders first, so calling it again here is the correct "the time
      // or name changed" reschedule.
      try {
        const {
          data: { user: sessionUser },
        } = await supabase.auth.getUser();
        const { data: profile } = sessionUser
          ? await supabase.from('profiles').select('notifications_enabled').eq('id', sessionUser.id).maybeSingle()
          : { data: null };
        if (profile?.notifications_enabled) {
          const prefs = await getNotificationPreferences();
          await scheduleEventReminders(
            {
              id: id as string,
              name: formValues.name.trim(),
              event_date: formValues.date,
              start_time: formValues.startTime ?? null,
              end_time: formValues.endTime ?? null,
              category: formValues.category,
              location: formValues.location.trim(),
              outfit_id: event?.outfit_id ?? null,
            },
            prefs,
            language
          );
        }
      } catch (notifyErr) {
        console.warn('[event-details] Reminder reschedule failed — event was already updated successfully:', notifyErr);
      }
    } catch (err: any) {
      setValidationError(err.message || t('planner.eventDetails.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = () => {
    AppAlert.alert(
      t('planner.eventDetails.deleteConfirmTitle'),
      t('planner.eventDetails.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { error: deleteError } = await supabase.from('events').delete().eq('id', id);
              if (deleteError) throw deleteError;

              // Non-critical, deliberately isolated — a cancellation hiccup
              // here must never make a successful delete look like it failed.
              try {
                await cancelEventReminders(id as string);
              } catch (notifyErr) {
                console.warn('[event-details] Reminder cancellation failed after delete (non-fatal):', notifyErr);
              }

              router.back();
            } catch (err: any) {
              AppAlert.alert(t('common.error'), err.message || t('planner.eventDetails.deleteError'));
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const eventWeather = useEventWeather(event?.event_date || todayLocalISO, todayLocalISO, currentWeather, forecast);

  if (isLoading) return <PremiumScreen><ActivityIndicator size="small" color={theme.colors.textPrimary} style={{ marginTop: 40 }} /></PremiumScreen>;
  if (error || !event) return <PremiumScreen><Text style={{ padding: 20, color: theme.colors.danger }}>{error || t('planner.eventDetails.missingEvent')}</Text></PremiumScreen>;

  const formattedEventDateLabel = event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <PremiumScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
        {!isEditing ? (
          <>
            <View style={styles.headerRow}>
              <BackButton />
              <SectionHeader
                title={event.name}
                subtitle={`${event.category ? t(`planner.eventDetails.categories.${event.category.toLowerCase()}`) : ''} • ${formattedEventDateLabel}`}
                style={styles.headerFlexOverride}
              />
            </View>

            <Animated.View style={styles.badgeRow} entering={FadeInDown.duration(500).delay(60).easing(Easing.out(Easing.cubic))}>
              <EventWeatherBadge weather={eventWeather} />
            </Animated.View>

            <Animated.View
              style={[styles.metaSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              entering={FadeInDown.duration(500).delay(120).easing(Easing.out(Easing.cubic))}
            >
              {event.start_time && (
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.colors.textPrimary }]}>
                    {event.start_time.slice(0, 5)}
                    {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ''}
                  </Text>
                </View>
              )}
              {event.location && (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.colors.textPrimary }]}>{event.location}</Text>
                </View>
              )}
              {event.description && (
                <View style={styles.metaRow}>
                  <Ionicons name="document-text-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.colors.textPrimary }]}>{event.description}</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View style={styles.outfitAssignmentBlock} entering={FadeInDown.duration(500).delay(180).easing(Easing.out(Easing.cubic))}>
              <SectionTitle withBottomMargin>{t('planner.smartPlanner.outfitAssignment.heading')}</SectionTitle>
              <EventOutfitAssignment
                event={event}
                weatherHint={
                  eventWeather.current
                    ? { temperatureCelsius: eventWeather.current.temperatureCelsius, condition: eventWeather.current.conditionLabel }
                    : eventWeather.forecastDay
                    ? { temperatureCelsius: eventWeather.forecastDay.highCelsius, condition: eventWeather.forecastDay.conditionLabel }
                    : null
                }
                onAssigned={() => fetchEventMetaGraph({ current: true })}
              />
            </Animated.View>

            <Animated.View style={styles.actionControlToolbar} entering={FadeInDown.duration(500).delay(240).easing(Easing.out(Easing.cubic))}>
              <PremiumTouchable style={[styles.editActionButton, { backgroundColor: theme.colors.accent }]} onPress={() => setIsEditing(true)}>
                <Text style={[styles.editActionText, { color: theme.colors.accentForeground }]}>{t('planner.eventDetails.editButton')}</Text>
              </PremiumTouchable>
              <PremiumTouchable style={[styles.deleteActionButton, { borderColor: theme.colors.danger }]} onPress={handleDeleteEvent} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator size="small" color={theme.colors.danger} /> : <Text style={[styles.deleteActionText, { color: theme.colors.danger }]}>{t('planner.eventDetails.deleteButton')}</Text>}
              </PremiumTouchable>
            </Animated.View>
          </>
        ) : (
          formValues && (
            <>
              <View style={styles.headerRow}>
                <BackButton onPress={() => setIsEditing(false)} />
                <SectionHeader title={t('planner.eventDetails.editTitle')} subtitle={t('planner.eventDetails.editSubtitle')} style={styles.headerFlexOverride} />
              </View>

              {validationError && (
                <RNAnimated.View style={[styles.errorInlineBanner, { backgroundColor: dangerBannerBg, borderColor: dangerBannerBorder }, { opacity: fadeAnim }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                  <Text style={[styles.errorBannerText, { color: theme.colors.danger }]}>{validationError}</Text>
                </RNAnimated.View>
              )}

              <Animated.View entering={FadeInDown.duration(500).delay(60).easing(Easing.out(Easing.cubic))}>
                <EventForm values={formValues} onChange={setFormValues} />
              </Animated.View>

              <Animated.View style={styles.editActionConfirmationRow} entering={FadeInDown.duration(500).delay(120).easing(Easing.out(Easing.cubic))}>
                <PremiumTouchable
                  style={[styles.actionSaveButton, { flex: 1, backgroundColor: theme.colors.accent }, (!isEventFormValid(formValues) || isSaving) && { opacity: 0.5 }]}
                  onPress={handleUpdateEvent}
                  disabled={!isEventFormValid(formValues) || isSaving}
                >
                  {isSaving ? <ActivityIndicator size="small" color={theme.colors.accentForeground} /> : <Text style={[styles.saveBtnText, { color: theme.colors.accentForeground }]}>{t('planner.eventDetails.saveChangesButton')}</Text>}
                </PremiumTouchable>

                <PremiumTouchable style={[styles.cancelEditButton, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]} onPress={() => setIsEditing(false)} disabled={isSaving}>
                  <Text style={[styles.cancelEditText, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
                </PremiumTouchable>
              </Animated.View>
            </>
          )
        )}
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerFlexOverride: { flex: 1, paddingVertical: 0, paddingHorizontal: 0 },
  badgeRow: { marginBottom: 12 },
  metaSection: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 24, gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, fontWeight: '400' },
  outfitAssignmentBlock: { marginTop: 8, marginBottom: 8 },

  actionControlToolbar: { marginTop: 28, gap: 12 },
  editActionButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  editActionText: { fontSize: 14, fontWeight: '600' },
  deleteActionButton: { backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  deleteActionText: { fontSize: 14, fontWeight: '600' },

  errorBannerText: { fontSize: 13, fontWeight: '500', letterSpacing: -0.2, flex: 1 },
  errorInlineBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, gap: 8 },
  editActionConfirmationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  actionSaveButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600' },
  cancelEditButton: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cancelEditText: { fontSize: 14, fontWeight: '500' },
});
