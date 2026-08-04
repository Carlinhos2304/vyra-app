import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, ActivityIndicator, Animated, Platform, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import * as NotificationsService from '../../services/notificationService';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

const CATEGORIES = ['Work', 'Formal', 'Casual', 'Party', 'Travel', 'Sport', 'Other'];
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export default function CreateEventScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();

  // Soft-tinted error banner — computed locally per theme, matching the pattern
  // established on create.tsx's success/error feedback banners.
  const dangerBannerBg = theme.dark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2';
  const dangerBannerBorder = theme.dark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2';

  const [name, setName] = useState('');
  const [date, setDate] = useState(params.date || new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Casual');

  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const placesRef = useRef<any>(null);

  // Form Validation State
  const isFormValid =
    name.trim().length > 0 &&
    date.trim().length > 0 &&
    selectedCategory.length > 0 &&
    location.trim().length > 0 &&
    description.trim().length > 0;

  useEffect(() => {
    if (placesRef.current && location === '') {
      placesRef.current.setAddressText('');
    }
  }, [location]);

  // 1. Validation Animation Opacity Tracker & Edit Listener
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (validationError) setValidationError(null);
  }, [name, date, location, description, selectedCategory]);

  // 2. Date Picker State and Handlers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rawDate, setRawDate] = useState<Date>(params.date ? new Date(params.date) : new Date());

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

  const handleSaveEvent = async () => {
    if (!name.trim()) {
      setValidationError(t('planner.createEvent.validation.nameRequired'));
      return;
    }
    if (!date.trim()) {
      setValidationError(t('planner.createEvent.validation.dateRequired'));
      return;
    }
    if (!selectedCategory) {
      setValidationError(t('planner.createEvent.validation.categoryRequired'));
      return;
    }
    if (!location.trim()) {
      setValidationError(t('planner.createEvent.validation.locationRequired'));
      return;
    }
    if (!description.trim()) {
      setValidationError(t('planner.createEvent.validation.descriptionRequired'));
      return;
    }

    setValidationError(null);
    setIsSaving(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error(t('planner.createEvent.sessionInvalid'));

      const { data: profile } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', user.id)
        .single();

      const { data: event, error: insertError } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
        name: name.trim(),
        event_date: date,
        location: location.trim(),
        description: description.trim(),
        category: selectedCategory,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      if (profile?.notifications_enabled && event) {
        await NotificationsService.schedulePlannedOutfitReminder(event.id, new Date(event.event_date));
      }

      router.back();
    } catch (err: any) {
      setValidationError(err.message || t('planner.createEvent.genericSaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PremiumScreen>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <SectionHeader title={t('planner.createEvent.title')} subtitle={t('planner.createEvent.subtitle')} />

        {validationError && (
          <Animated.View style={[styles.errorInlineBanner, { backgroundColor: dangerBannerBg, borderColor: dangerBannerBorder }, { opacity: fadeAnim }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.colors.danger} />
            <Text style={[styles.errorBannerText, { color: theme.colors.danger }]}>{validationError}</Text>
          </Animated.View>
        )}

        <View style={styles.formGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.createEvent.fields.eventName')}</Text>
          <TextInput style={[styles.inputField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]} placeholder={t('planner.createEvent.placeholders.eventName')} placeholderTextColor={theme.colors.textTertiary} value={name} onChangeText={setName} />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.createEvent.fields.date')}</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => !isSaving && setShowDatePicker(true)}>
            <View pointerEvents="none">
              <TextInput style={[styles.inputField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]} placeholder={t('planner.createEvent.placeholders.date')} placeholderTextColor={theme.colors.textTertiary} value={date} editable={false} />
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
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.createEvent.fields.category')}</Text>
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
                  <Text style={[styles.chipText, { color: theme.colors.textSecondary }, isSelected && { color: theme.colors.accentForeground }]}>{t(`planner.createEvent.categories.${cat.toLowerCase()}`)}</Text>
                </PremiumTouchable>
              );
            })}
          </View>
        </View>

        {/* Location Dropdown - Configured to run inside a ScrollView container */}
        <View style={[styles.formGroup, { zIndex: 1000, position: 'relative' }]}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.createEvent.fields.location')}</Text>
          <GooglePlacesAutocomplete
            ref={placesRef}
            placeholder={t('planner.createEvent.placeholders.location')}
            minLength={2}
            fetchDetails={false}
            debounce={400}
            disableScroll={true} // Bypasses internal sub-scrolling properties entirely
            onPress={(data) => {
              setLocation(data.description);
            }}
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
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{t('planner.createEvent.fields.description')}</Text>
          <TextInput style={[styles.inputField, styles.textAreaField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]} placeholder={t('planner.createEvent.placeholders.description')} placeholderTextColor={theme.colors.textTertiary} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        </View>

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
  errorBannerText: { fontSize: 13, fontWeight: '500', letterSpacing: -0.2, flex: 1 },
  errorInlineBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, gap: 8 },
  formGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  inputField: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textAreaField: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  chipsRowLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  actionSaveButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  saveBtnText: { fontSize: 14, fontWeight: '600' },

  // Date Picker Overrides
  calendarInlineIcon: { position: 'absolute', right: 16, bottom: 14 },
  iosPickerWrapper: { borderRadius: 14, marginTop: 8, overflow: 'hidden', borderWidth: 1 },
  iosPickerHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10 },
  iosPickerDoneText: { fontWeight: '600', fontSize: 14 },

  // Google Places Sub-list Overrides with explicit layout locking
  googleAutocompleteListView: { borderRadius: 12, borderWidth: 1, marginTop: 6, elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, position: 'absolute', top: 45, left: 0, right: 0, zIndex: 5000 },
  googleAutocompleteRow: { padding: 14 },
  googleAutocompleteDescription: { fontSize: 13 },
  googleAutocompleteSeparator: { height: 0.5 }
});
