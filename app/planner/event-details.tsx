import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, ActivityIndicator, Animated, Platform, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

const CATEGORIES = ['Work', 'Formal', 'Casual', 'Party', 'Travel', 'Sport', 'Other'];
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export default function EventDetailsScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Soft-tinted error banner — computed locally per theme, matching the pattern
  // established on create.tsx's success/error feedback banners.
  const dangerBannerBg = theme.dark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2';
  const dangerBannerBorder = theme.dark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2';

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Management Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Edit Fields State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Casual');

  // Date picker view control states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rawDate, setRawDate] = useState<Date>(new Date());

  const placesRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isFormValid =
    name.trim().length > 0 &&
    date.trim().length > 0 &&
    selectedCategory.length > 0 &&
    location.trim().length > 0 &&
    description.trim().length > 0;

  const fetchEventMetaGraph = async () => {
    try {
      setIsLoading(true);
      const { data, error: queryErr } = await supabase
        .from('events')
        // Fixed a malformed embedded-select string (one extra closing parenthesis after
        // image_url) — the same bug found and corrected in home.tsx's dashboard query.
        .select('id, name, event_date, category, location, description, outfit_id, outfits(name, occasion, outfit_items(clothing_items(image_url)))')
        .eq('id', id)
        .single();

      if (queryErr) throw queryErr;
      setEvent(data);

      setName(data.name || '');
      setDate(data.event_date || '');
      setLocation(data.location || '');
      setDescription(data.description || '');
      setSelectedCategory(data.category || 'Casual');
      if (data.event_date) {
        setRawDate(new Date(data.event_date));
      }
    } catch (err: any) {
      setError(err.message || t('planner.eventDetails.fetchError'));
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) fetchEventMetaGraph();
    }, [id])
  );

  useEffect(() => {
    if (validationError) setValidationError(null);
  }, [name, date, location, description, selectedCategory]);

  useEffect(() => {
    if (validationError) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [validationError]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setRawDate(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
    }
  };

  const handleUpdateEvent = async () => {
    if (!name.trim()) return setValidationError(t('planner.eventDetails.validation.nameRequired'));
    if (!date.trim()) return setValidationError(t('planner.eventDetails.validation.dateRequired'));
    if (!selectedCategory) return setValidationError(t('planner.eventDetails.validation.categoryRequired'));
    if (!location.trim()) return setValidationError(t('planner.eventDetails.validation.locationRequired'));
    if (!description.trim()) return setValidationError(t('planner.eventDetails.validation.descriptionRequired'));

    setValidationError(null);
    setIsSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          name: name.trim(),
          event_date: date,
          category: selectedCategory,
          location: location.trim(),
          description: description.trim(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setIsEditing(false);
      await fetchEventMetaGraph();
    } catch (err: any) {
      setValidationError(err.message || t('planner.eventDetails.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
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
              const { error: deleteError } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

              if (deleteError) throw deleteError;
              router.back();
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message || t('planner.eventDetails.deleteError'));
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) return <PremiumScreen><ActivityIndicator size="small" color={theme.colors.textPrimary} style={{ marginTop: 40 }} /></PremiumScreen>;
  if (error || !event) return <PremiumScreen><Text style={{ padding: 20, color: theme.colors.danger }}>{error || t('planner.eventDetails.missingEvent')}</Text></PremiumScreen>;

  const items = event.outfits?.outfit_items || [];
  const lookCoverImage = items.length > 0 && items[0].clothing_items ? items[0].clothing_items.image_url : null;

  const formattedEventDateLabel = event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <PremiumScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>

        {!isEditing ? (
          <>
            <SectionHeader title={event.name} subtitle={`${event.category ? t(`planner.eventDetails.categories.${event.category.toLowerCase()}`) : ''} • ${event.event_date}`} />

            <View style={[styles.metaSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
            </View>

            <View style={styles.outfitAssignmentBlock}>
              <SectionTitle withBottomMargin>{t('planner.eventDetails.assignedOutfitHeading')}</SectionTitle>
              {event.outfit_id ? (
                <PremiumCard style={styles.plannedOutfitCard} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: event.outfit_id } })}>
                  <View style={[styles.cardImageContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    {lookCoverImage ? <Image source={{ uri: lookCoverImage }} style={styles.outfitCoverImage} /> : <View style={styles.assetImageBlankContainer}><MaterialCommunityIcons name="hanger" size={24} color={theme.colors.textTertiary} /></View>}
                  </View>
                  <View style={styles.cardDetailsPane}>
                    <View style={styles.cardMetadataRow}>
                      <Text style={[styles.outfitTitleText, { color: theme.colors.textPrimary }]} numberOfLines={1}>{event.outfits?.name}</Text>
                      {event.outfits?.occasion && (
                        <View style={[styles.categoryBadge, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                          <Text style={[styles.categoryBadgeText, { color: theme.colors.textSecondary }]}>{event.outfits.occasion}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardScheduleTimelineText, { color: theme.colors.textSecondary }]}>{formattedEventDateLabel}</Text>
                    <View style={styles.actionRowContainerHorizontal}>
                      <PremiumTouchable style={styles.inlineActionTextButton} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: event.outfit_id } })}>
                        <Text style={[styles.actionButtonText, { color: theme.colors.textPrimary }]}>{t('planner.eventDetails.viewLookButton')}</Text>
                      </PremiumTouchable>
                      <PremiumTouchable style={styles.inlineActionTextButtonSecondary} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { eventId: event.id } })}>
                        <Text style={[styles.actionButtonTextSecondary, { color: theme.colors.textSecondary }]}>{t('planner.eventDetails.changeButton')}</Text>
                      </PremiumTouchable>
                    </View>
                  </View>
                </PremiumCard>
              ) : (
                <View style={[styles.emptyStateCardContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.emptyStateHeading, { color: theme.colors.textPrimary }]}>{t('planner.eventDetails.noOutfitAssigned')}</Text>
                  <PremiumTouchable style={[styles.assignOutfitActionBtn, { backgroundColor: theme.colors.accent }]} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { eventId: event.id } })}>
                    <Text style={[styles.assignActionBtnLabel, { color: theme.colors.accentForeground }]}>{t('planner.eventDetails.selectOutfitButton')}</Text>
                  </PremiumTouchable>
                </View>
              )}
            </View>

            <View style={styles.actionControlToolbar}>
              <PremiumTouchable style={[styles.editActionButton, { backgroundColor: theme.colors.accent }]} onPress={() => setIsEditing(true)}>
                <Text style={[styles.editActionText, { color: theme.colors.accentForeground }]}>{t('planner.eventDetails.editButton')}</Text>
              </PremiumTouchable>
              <PremiumTouchable style={[styles.deleteActionButton, { borderColor: theme.colors.danger }]} onPress={handleDeleteEvent} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator size="small" color={theme.colors.danger} /> : <Text style={[styles.deleteActionText, { color: theme.colors.danger }]}>{t('planner.eventDetails.deleteButton')}</Text>}
              </PremiumTouchable>
            </View>
          </>
        ) : (
          <>
            <SectionHeader title={t('planner.eventDetails.editTitle')} subtitle={t('planner.eventDetails.editSubtitle')} />

            {validationError && (
              <Animated.View style={[styles.errorInlineBanner, { backgroundColor: dangerBannerBg, borderColor: dangerBannerBorder }, { opacity: fadeAnim }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                <Text style={[styles.errorBannerText, { color: theme.colors.danger }]}>{validationError}</Text>
              </Animated.View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.eventDetails.fields.eventName')}</Text>
              <TextInput style={[styles.inputField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]} placeholder={t('planner.eventDetails.placeholders.eventName')} placeholderTextColor={theme.colors.textTertiary} value={name} onChangeText={setName} />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.eventDetails.fields.date')}</Text>
              <TouchableOpacity activeOpacity={0.9} onPress={() => setShowDatePicker(true)}>
                <View pointerEvents="none">
                  <TextInput style={[styles.inputField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]} placeholder={t('planner.eventDetails.placeholders.date')} placeholderTextColor={theme.colors.textTertiary} value={date} editable={false} />
                </View>
                <MaterialCommunityIcons name="calendar-month-outline" size={18} color={theme.colors.textSecondary} style={styles.calendarInlineIcon} />
              </TouchableOpacity>

              {showDatePicker && (
                Platform.OS === 'ios' ? (
                  <View style={[styles.iosPickerWrapper, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <View style={[styles.iosPickerHeaderRow, { backgroundColor: theme.colors.border }]}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={[styles.iosPickerDoneText, { color: theme.colors.textPrimary }]}>{t('common.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker value={rawDate} mode="date" display="spinner" onChange={handleDateChange} />
                  </View>
                ) : (
                  <DateTimePicker value={rawDate} mode="date" display="default" onChange={handleDateChange} />
                )
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.eventDetails.fields.category')}</Text>
              <View style={styles.chipsRowLayout}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <PremiumTouchable
                      key={cat}
                      style={[
                        styles.chip,
                        { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
                        isSelected && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[styles.chipText, { color: theme.colors.textSecondary }, isSelected && { color: theme.colors.accentForeground }]}>{t(`planner.eventDetails.categories.${cat.toLowerCase()}`)}</Text>
                    </PremiumTouchable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.formGroup, { zIndex: 1000, position: 'relative' }]}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.eventDetails.fields.location')}</Text>
              <GooglePlacesAutocomplete
                ref={placesRef}
                placeholder={t('planner.eventDetails.placeholders.location')}
                minLength={2}
                fetchDetails={false}
                debounce={400}
                disableScroll={true}
                onPress={(data) => setLocation(data.description)}
                textInputProps={{
                  placeholderTextColor: theme.colors.textTertiary,
                  style: [styles.inputField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }],
                  onChangeText: (text) => setLocation(text),
                  defaultValue: location
                }}
                query={{
                  key: GOOGLE_PLACES_API_KEY,
                  language: 'en',
                  type: 'geocode',
                }}
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
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.eventDetails.fields.description')}</Text>
              <TextInput style={[styles.inputField, styles.textAreaField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]} placeholder={t('planner.eventDetails.placeholders.description')} placeholderTextColor={theme.colors.textTertiary} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
            </View>

            <View style={styles.editActionConfirmationRow}>
              <PremiumTouchable style={[styles.actionSaveButton, { flex: 1, backgroundColor: theme.colors.accent }, (!isFormValid || isSaving) && { opacity: 0.5 }]} onPress={handleUpdateEvent} disabled={!isFormValid || isSaving}>
                {isSaving ? <ActivityIndicator size="small" color={theme.colors.accentForeground} /> : <Text style={[styles.saveBtnText, { color: theme.colors.accentForeground }]}>{t('planner.eventDetails.saveChangesButton')}</Text>}
              </PremiumTouchable>

              <PremiumTouchable style={[styles.cancelEditButton, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]} onPress={() => setIsEditing(false)} disabled={isSaving}>
                <Text style={[styles.cancelEditText, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
              </PremiumTouchable>
            </View>
          </>
        )}
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  metaSection: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 24, gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, fontWeight: '400' },
  outfitAssignmentBlock: { marginTop: 8 },

  // Exact replication matching the Calendar screen components
  plannedOutfitCard: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', padding: 0, width: '100%' },
  cardImageContainer: { width: 100, height: 135 },
  outfitCoverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  assetImageBlankContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardDetailsPane: { flex: 1, padding: 16, justifyContent: 'center' },
  cardMetadataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  outfitTitleText: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  categoryBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  categoryBadgeText: { fontSize: 10, fontWeight: '500' },
  cardScheduleTimelineText: { fontSize: 13, marginBottom: 12 },
  actionRowContainerHorizontal: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  inlineActionTextButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
  inlineActionTextButtonSecondary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonTextSecondary: { fontSize: 12, fontWeight: '400' },

  emptyStateCardContainer: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyStateHeading: { fontSize: 14, fontWeight: '500', marginBottom: 16 },
  assignOutfitActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  assignActionBtnLabel: { fontSize: 12, fontWeight: '600' },

  actionControlToolbar: { marginTop: 28, gap: 12 },
  editActionButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  editActionText: { fontSize: 14, fontWeight: '600' },
  deleteActionButton: { backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  deleteActionText: { fontSize: 14, fontWeight: '600' },

  errorBannerText: { fontSize: 13, fontWeight: '500', letterSpacing: -0.2, flex: 1 },
  errorInlineBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, gap: 8 },
  formGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  inputField: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textAreaField: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  chipsRowLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  editActionConfirmationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  actionSaveButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600' },
  cancelEditButton: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cancelEditText: { fontSize: 14, fontWeight: '500' },

  calendarInlineIcon: { position: 'absolute', right: 16, bottom: 14 },
  iosPickerWrapper: { borderRadius: 14, marginTop: 8, overflow: 'hidden', borderWidth: 1 },
  iosPickerHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10 },
  iosPickerDoneText: { fontWeight: '600', fontSize: 14 },
  googleAutocompleteListView: { borderRadius: 12, borderWidth: 1, marginTop: 6, elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, position: 'absolute', top: 45, left: 0, right: 0, zIndex: 5000 },
  googleAutocompleteRow: { padding: 14 },
  googleAutocompleteDescription: { fontSize: 13 },
  googleAutocompleteSeparator: { height: 0.5 }
});
