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

const CATEGORIES = ['Work', 'Formal', 'Casual', 'Party', 'Travel', 'Sport', 'Other'];
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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
        .select('id, name, event_date, category, location, description, outfit_id, outfits(name, occasion, outfit_items(clothing_items(image_url))))')
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
      setError(err.message || 'Error processing structural event payload.');
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
    if (!name.trim()) return setValidationError('Please enter an event name.');
    if (!date.trim()) return setValidationError('Please select a date.');
    if (!selectedCategory) return setValidationError('Please choose a category.');
    if (!location.trim()) return setValidationError('Please select a location.');
    if (!description.trim()) return setValidationError('Please enter a description.');

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
      setValidationError(err.message || 'An error obstructed event persistence layout.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      'Delete Event?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
              Alert.alert('Error', err.message || 'Failed to remove the target event.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) return <PremiumScreen><ActivityIndicator size="small" color="#1C1917" style={{ marginTop: 40 }} /></PremiumScreen>;
  if (error || !event) return <PremiumScreen><Text style={{ padding: 20, color: '#EF4444' }}>{error || 'Event context missing.'}</Text></PremiumScreen>;

  const items = event.outfits?.outfit_items || [];
  const lookCoverImage = items.length > 0 && items[0].clothing_items ? items[0].clothing_items.image_url : null;
  
  const formattedEventDateLabel = event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <PremiumScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
        
        {!isEditing ? (
          <>
            <SectionHeader title={event.name} subtitle={`${event.category} • ${event.event_date}`} />

            <View style={styles.metaSection}>
              {event.location && (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={16} color="#78716C" />
                  <Text style={styles.metaText}>{event.location}</Text>
                </View>
              )}
              {event.description && (
                <View style={styles.metaRow}>
                  <Ionicons name="document-text-outline" size={16} color="#78716C" />
                  <Text style={styles.metaText}>{event.description}</Text>
                </View>
              )}
            </View>

            <View style={styles.outfitAssignmentBlock}>
              <SectionTitle withBottomMargin>Assigned Wardrobe Look</SectionTitle>
              {event.outfit_id ? (
                <PremiumCard style={styles.plannedOutfitCard} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: event.outfit_id } })}>
                  <View style={styles.cardImageContainer}>
                    {lookCoverImage ? <Image source={{ uri: lookCoverImage }} style={styles.outfitCoverImage} /> : <View style={styles.assetImageBlankContainer}><MaterialCommunityIcons name="hanger" size={24} color="#A8A29E" /></View>}
                  </View>
                  <View style={styles.cardDetailsPane}>
                    <View style={styles.cardMetadataRow}>
                      <Text style={styles.outfitTitleText} numberOfLines={1}>{event.outfits?.name}</Text>
                      {event.outfits?.occasion && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{event.outfits.occasion}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardScheduleTimelineText}>{formattedEventDateLabel}</Text>
                    <View style={styles.actionRowContainerHorizontal}>
                      <PremiumTouchable style={styles.inlineActionTextButton} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: event.outfit_id } })}>
                        <Text style={styles.actionButtonText}>View Look</Text>
                      </PremiumTouchable>
                      <PremiumTouchable style={styles.inlineActionTextButtonSecondary} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { eventId: event.id } })}>
                        <Text style={styles.actionButtonTextSecondary}>Change</Text>
                      </PremiumTouchable>
                    </View>
                  </View>
                </PremiumCard>
              ) : (
                <View style={styles.emptyStateCardContainer}>
                  <Text style={styles.emptyStateHeading}>No outfit customized for this event context</Text>
                  <PremiumTouchable style={styles.assignOutfitActionBtn} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { eventId: event.id } })}>
                    <Text style={styles.assignActionBtnLabel}>Select Outfit</Text>
                  </PremiumTouchable>
                </View>
              )}
            </View>

            <View style={styles.actionControlToolbar}>
              <PremiumTouchable style={styles.editActionButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.editActionText}>Edit Event</Text>
              </PremiumTouchable>
              <PremiumTouchable style={styles.deleteActionButton} onPress={handleDeleteEvent} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.deleteActionText}>Delete Event</Text>}
              </PremiumTouchable>
            </View>
          </>
        ) : (
          <>
            <SectionHeader title="Edit Event Details" subtitle="Modify your scheduled fixture context metrics" />

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
              <TouchableOpacity activeOpacity={0.9} onPress={() => setShowDatePicker(true)}>
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

            <View style={[styles.formGroup, { zIndex: 1000, position: 'relative' }]}>
              <Text style={styles.fieldLabel}>LOCATION *</Text>
              <GooglePlacesAutocomplete
                ref={placesRef}
                placeholder="e.g. Somerset House, London"
                minLength={2}
                fetchDetails={false}
                debounce={400}
                disableScroll={true}
                onPress={(data) => setLocation(data.description)}
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

            <View style={styles.editActionConfirmationRow}>
              <PremiumTouchable style={[styles.actionSaveButton, { flex: 1 }, (!isFormValid || isSaving) && { opacity: 0.5 }]} onPress={handleUpdateEvent} disabled={!isFormValid || isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#FAFAF9" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </PremiumTouchable>

              <PremiumTouchable style={styles.cancelEditButton} onPress={() => setIsEditing(false)} disabled={isSaving}>
                <Text style={styles.cancelEditText}>Cancel</Text>
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
  metaSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E7E5E4', marginBottom: 24, gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: '#1C1917', fontWeight: '400' },
  outfitAssignmentBlock: { marginTop: 8 },
  
  // Exact replication matching the Calendar screen components
  plannedOutfitCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4', overflow: 'hidden', padding: 0, width: '100%' },
  cardImageContainer: { width: 100, height: 135, backgroundColor: '#F5F5F4' },
  outfitCoverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  assetImageBlankContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardDetailsPane: { flex: 1, padding: 16, justifyContent: 'center' },
  cardMetadataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  outfitTitleText: { fontSize: 15, fontWeight: '600', color: '#1C1917', flex: 1, marginRight: 8 },
  categoryBadge: { borderWidth: 1, borderColor: '#E7E5E4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#FAFAF9' },
  categoryBadgeText: { fontSize: 10, fontWeight: '500', color: '#78716C' },
  cardScheduleTimelineText: { fontSize: 13, color: '#78716C', marginBottom: 12 },
  actionRowContainerHorizontal: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  inlineActionTextButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#1C1917' },
  inlineActionTextButtonSecondary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonTextSecondary: { fontSize: 12, fontWeight: '400', color: '#78716C' },
  
  emptyStateCardContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4', borderStyle: 'dashed', padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyStateHeading: { fontSize: 14, fontWeight: '500', color: '#1C1917', marginBottom: 16 },
  assignOutfitActionBtn: { backgroundColor: '#1C1917', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  assignActionBtnLabel: { color: '#FAFAF9', fontSize: 12, fontWeight: '600' },

  actionControlToolbar: { marginTop: 28, gap: 12 },
  editActionButton: { backgroundColor: '#1C1917', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  editActionText: { color: '#FAFAF9', fontSize: 14, fontWeight: '600' },
  deleteActionButton: { backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  deleteActionText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },

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
  editActionConfirmationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  actionSaveButton: { backgroundColor: '#1C1917', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FAFAF9', fontSize: 14, fontWeight: '600' },
  cancelEditButton: { backgroundColor: '#F5F5F4', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7E5E4' },
  cancelEditText: { color: '#78716C', fontSize: 14, fontWeight: '500' },

  calendarInlineIcon: { position: 'absolute', right: 16, bottom: 14 },
  iosPickerWrapper: { backgroundColor: '#F5F5F4', borderRadius: 14, marginTop: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E7E5E4' },
  iosPickerHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#E7E5E4' },
  iosPickerDoneText: { color: '#1C1917', fontWeight: '600', fontSize: 14 },
  googleAutocompleteListView: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E7E5E4', marginTop: 6, elevation: 4, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, position: 'absolute', top: 45, left: 0, right: 0, zIndex: 5000 },
  googleAutocompleteRow: { padding: 14, backgroundColor: '#FFFFFF' },
  googleAutocompleteDescription: { color: '#44403C', fontSize: 13 },
  googleAutocompleteSeparator: { height: 0.5, backgroundColor: '#E7E5E4' }
});