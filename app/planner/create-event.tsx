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

const CATEGORIES = ['Work', 'Formal', 'Casual', 'Party', 'Travel', 'Sport', 'Other'];
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export default function CreateEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  
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
      setValidationError('Please enter an event name.');
      return;
    }
    if (!date.trim()) {
      setValidationError('Please select a date.');
      return;
    }
    if (!selectedCategory) {
      setValidationError('Please choose a category.');
      return;
    }
    if (!location.trim()) {
      setValidationError('Please select a location.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Please enter a description.');
      return;
    }
    
    setValidationError(null);
    setIsSaving(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Session signature invalid.');

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
      setValidationError(err.message || 'An error obstructed event persistence layout.');
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
        <SectionHeader title="Create Event" subtitle="Schedule an upcoming social fixture" />
        
        {validationError && (
          <Animated.View style={[styles.errorInlineBanner, { opacity: fadeAnim }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.errorBannerText}>{validationError}</Text>
          </Animated.View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>EVENT NAME *</Text>
          <TextInput style={styles.inputField} placeholder="e.g. Gallery Exhibition Opening" placeholderTextColor="#A8A29E" value={name} onChangeText={setName} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>DATE *</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => !isSaving && setShowDatePicker(true)}>
            <View pointerEvents="none">
              <TextInput style={styles.inputField} placeholder="Select event date" placeholderTextColor="#A8A29E" value={date} editable={false} />
            </View>
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#78716C" style={styles.calendarInlineIcon} />
          </TouchableOpacity>

          {showDatePicker && (
            Platform.OS === 'ios' ? (
              <View style={styles.iosPickerWrapper}>
                <View style={styles.iosPickerHeaderRow}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.iosPickerDoneText}>Done</Text>
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
          <Text style={styles.fieldLabel}>CATEGORY *</Text>
          <View style={styles.chipsRowLayout}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <PremiumTouchable key={cat} style={[styles.chip, isSelected && styles.chipActive]} onPress={() => setSelectedCategory(cat)}>
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cat}</Text>
                </PremiumTouchable>
              );
            })}
          </View>
        </View>

        {/* Location Dropdown - Configured to run inside a ScrollView container */}
        <View style={[styles.formGroup, { zIndex: 1000, position: 'relative' }]}>
          <Text style={styles.fieldLabel}>LOCATION *</Text>
          <GooglePlacesAutocomplete
            ref={placesRef}
            placeholder="e.g. Somerset House, London"
            minLength={2}
            fetchDetails={false}
            debounce={400}
            disableScroll={true} // Bypasses internal sub-scrolling properties entirely
            onPress={(data) => {
              setLocation(data.description);
            }}
            textInputProps={{
              placeholderTextColor: '#A8A29E',
              style: styles.inputField,
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
              listView: styles.googleAutocompleteListView,
              row: styles.googleAutocompleteRow,
              description: styles.googleAutocompleteDescription,
              separator: styles.googleAutocompleteSeparator,
            }}
            enablePoweredByContainer={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>DESCRIPTION *</Text>
          <TextInput style={[styles.inputField, styles.textAreaField]} placeholder="Add context notes..." placeholderTextColor="#A8A29E" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        </View>

        <PremiumTouchable 
          style={[styles.actionSaveButton, (!isFormValid || isSaving) && { opacity: 0.5 }]} 
          onPress={handleSaveEvent} 
          disabled={!isFormValid || isSaving}
        >
          {isSaving ? <ActivityIndicator size="small" color="#FAFAF9" /> : <Text style={styles.saveBtnText}>Save Event</Text>}
        </PremiumTouchable>
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  errorBannerText: { fontSize: 13, color: '#EF4444', fontWeight: '500', letterSpacing: -0.2, flex: 1 },
  errorInlineBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, gap: 8 },
  formGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#78716C', marginBottom: 8, letterSpacing: 0.5 },
  inputField: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1C1917' },
  textAreaField: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  chipsRowLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F5F5F4', borderWidth: 1, borderColor: '#E7E5E4' },
  chipActive: { backgroundColor: '#1C1917', borderColor: '#1C1917' },
  chipText: { fontSize: 12, color: '#78716C', fontWeight: '500' },
  chipTextActive: { color: '#FAFAF9' },
  actionSaveButton: { backgroundColor: '#1C1917', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  saveBtnText: { color: '#FAFAF9', fontSize: 14, fontWeight: '600' },
  
  // Date Picker Overrides
  calendarInlineIcon: { position: 'absolute', right: 16, bottom: 14 },
  iosPickerWrapper: { backgroundColor: '#F5F5F4', borderRadius: 14, marginTop: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E7E5E4' },
  iosPickerHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#E7E5E4' },
  iosPickerDoneText: { color: '#1C1917', fontWeight: '600', fontSize: 14 },

  // Google Places Sub-list Overrides with explicit layout locking
  googleAutocompleteListView: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E7E5E4', marginTop: 6, elevation: 4, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, position: 'absolute', top: 45, left: 0, right: 0, zIndex: 5000 },
  googleAutocompleteRow: { padding: 14, backgroundColor: '#FFFFFF' },
  googleAutocompleteDescription: { color: '#44403C', fontSize: 13 },
  googleAutocompleteSeparator: { height: 0.5, backgroundColor: '#E7E5E4' }
});