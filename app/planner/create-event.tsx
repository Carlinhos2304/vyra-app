import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { supabase } from '../../lib/supabase';

const CATEGORIES = ['Work', 'Formal', 'Casual', 'Party', 'Travel', 'Sport', 'Other'];

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

  const handleSaveEvent = async () => {
    if (!name.trim() || !date.trim()) {
      setValidationError('Event name and formatted date are explicitly required.');
      return;
    }
    setValidationError(null);
    setIsSaving(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Session signature invalid.');

      const { error: insertError } = await supabase.from('events').insert({
        user_id: user.id,
        name: name.trim(),
        event_date: date,
        location: location.trim() || null,
        description: description.trim() || null,
        category: selectedCategory,
      });

      if (insertError) throw insertError;
      router.back();
    } catch (err: any) {
      setValidationError(err.message || 'An error obstructed event persistence layout.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PremiumScreen>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Create Event" subtitle="Schedule an upcoming social fixture" />
        
        {validationError && <Text style={styles.errorBannerText}>{validationError}</Text>}

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>EVENT NAME *</Text>
          <TextInput style={styles.inputField} placeholder="e.g. Gallery Exhibition Opening" placeholderTextColor="#A8A29E" value={name} onChangeText={setName} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>DATE (YYYY-MM-DD) *</Text>
          <TextInput style={styles.inputField} placeholder="YYYY-MM-DD" placeholderTextColor="#A8A29E" value={date} onChangeText={setDate} maxLength={10} />
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

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <TextInput style={styles.inputField} placeholder="e.g. Somerset House, London" placeholderTextColor="#A8A29E" value={location} onChangeText={setLocation} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <TextInput style={[styles.inputField, styles.textAreaField]} placeholder="Add context notes..." placeholderTextColor="#A8A29E" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        </View>

        <PremiumTouchable style={styles.actionSaveButton} onPress={handleSaveEvent} disabled={isSaving}>
          {isSaving ? <ActivityIndicator size="small" color="#FAFAF9" /> : <Text style={styles.saveBtnText}>Save Event</Text>}
        </PremiumTouchable>
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  errorBannerText: { color: '#EF4444', fontSize: 13, fontWeight: '500', marginBottom: 16, letterSpacing: -0.3 },
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
  saveBtnText: { color: '#FAFAF9', fontSize: 14, fontWeight: '600' }
});