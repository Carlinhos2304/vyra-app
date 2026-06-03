import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';

import { supabase } from '../../lib/supabase';

const CREATION_CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Outerwear', 'Accessories'];

const PALETTE_COLORS = [
  { label: 'White', hex: '#FFFFFF' },
  { label: 'Black', hex: '#000000' },
  { label: 'Blue', hex: '#1E3A8A' },
  { label: 'Red', hex: '#DC2626' },
  { label: 'Green', hex: '#16A34A' },
  { label: 'Brown', hex: '#78350F' },
  { label: 'Gray', hex: '#4B5563' },
  { label: 'Beige', hex: '#F5F5DC' },
];

export default function AddGarmentScreen() {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Request media library permissions and open image gallery
  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Vyra needs access to your camera roll to fetch photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Request camera permissions and snap photo
  const capturePhotoFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Vyra needs hardware camera activation permissions to snap wardrobe frames.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleFormSubmission = async () => {
    // Structural client validation gates
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please provide a unique title naming definition for this piece.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Missing Field', 'Please select an architectural garment class categorization.');
      return;
    }
    if (!imageUri) {
      Alert.alert('Missing Image', 'Please capture or attach a visual digital profile render of the garment.');
      return;
    }

    try {
      setIsSaving(true);

      // 1. Parse file extension and set robust fallback types
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const cleanExtension = ['jpg', 'jpeg', 'png', 'heic'].includes(fileExtension) ? fileExtension : 'jpg';
      const mimeType = cleanExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      const storageFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${cleanExtension}`;

      // 2. Build standard native multi-platform FormData payload
      const formData = new FormData();
      
      // We append a pseudo file object mapping the file system URI directly
      formData.append('file', {
        uri: imageUri,
        name: storageFileName,
        type: mimeType,
      } as any);

      // 3. Execute binary upload over native bridges directly to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('garments')
        .upload(storageFileName, formData, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 4. Extract fully accessible absolute remote bucket resource paths
      const { data: publicUrlData } = supabase.storage
        .from('garments')
        .getPublicUrl(storageFileName);

      const finalStoragePublicUrl = publicUrlData.publicUrl;

      // 5. Commit relational row attributes directly into Postgres
      const { error: databaseInsertError } = await supabase
        .from('clothing_items')
        .insert([
          {
            name: name.trim(),
            brand: brand.trim() || 'Unbranded',
            category: selectedCategory,
            color: selectedColor,
            image_url: finalStoragePublicUrl,
          },
        ]);

      if (databaseInsertError) throw databaseInsertError;

      // 6. Route back and trigger refresh via cache breaking query strings
      router.replace({
        pathname: '/(tabs)/closet',
        params: { refresh: `${Date.now()}` },
      });

    } catch (error: any) {
      console.error('Add Garment Flow Breakdown Error:', error);
      Alert.alert('Transaction Failure', error.message || 'An unexpected database error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.safeContainer} edges={['top']}>
        {/* Customized Elegant Top Navigation Block Header */}
        <View style={styles.navigationRow}>
          <PremiumTouchable style={styles.backTouchTarget} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#1C1917" />
          </PremiumTouchable>
          <SectionHeader 
            title="Add Garment" 
            subtitle="Catalog new wardrobe assets" 
            style={styles.headerTitleSpacing}
          />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBodyContainer}
        >
          {/* Media Interactive Framing Capture Box */}
          <Text style={styles.fieldSectionLabel}>Garment Visual Profile</Text>
          <View style={styles.mediaContainerBox}>
            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImageRender} />
                <PremiumTouchable style={styles.clearMediaIndicator} onPress={() => setImageUri(null)}>
                  <Feather name="trash-2" size={16} color="#FAFAF9" />
                </PremiumTouchable>
              </View>
            ) : (
              <View style={styles.emptyMediaTriggerFrame}>
                <PremiumTouchable style={styles.mediaContextButton} onPress={pickImageFromGallery}>
                  <Feather name="image" size={20} color="#1C1917" />
                  <Text style={styles.mediaContextText}>Gallery</Text>
                </PremiumTouchable>
                
                <View style={styles.mediaSplitDivider} />

                <PremiumTouchable style={styles.mediaContextButton} onPress={capturePhotoFromCamera}>
                  <Feather name="camera" size={20} color="#1C1917" />
                  <Text style={styles.mediaContextText}>Camera</Text>
                </PremiumTouchable>
              </View>
            )}
          </View>

          {/* Form Context Area Elements */}
          <Text style={styles.fieldSectionLabel}>Garment Title</Text>
          <View style={styles.textInputWrapperBox}>
            <TextInput 
              placeholder="e.g., Silk Linen Drape Blouse"
              placeholderTextColor="#78716C"
              style={styles.formInputCore}
              value={name}
              onChangeText={setName}
              editable={!isSaving}
            />
          </View>

          <Text style={styles.fieldSectionLabel}>Brand Reference</Text>
          <View style={styles.textInputWrapperBox}>
            <TextInput 
              placeholder="e.g., Maison Margiela"
              placeholderTextColor="#78716C"
              style={styles.formInputCore}
              value={brand}
              onChangeText={setBrand}
              editable={!isSaving}
            />
          </View>

          {/* Selection Grid Loops for Category Chips */}
          <Text style={styles.fieldSectionLabel}>Category Classification</Text>
          <View style={styles.chipsContainerRow}>
            {CREATION_CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <PremiumTouchable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.categoricalChip,
                    isSelected ? styles.chipSelected : styles.chipUnselected
                  ]}
                  disabled={isSaving}
                >
                  <Text style={[
                    styles.chipTextLabel,
                    isSelected ? styles.chipTextSelected : styles.chipTextUnselected
                  ]}>
                    {category}
                  </Text>
                </PremiumTouchable>
              );
            })}
          </View>

          {/* Color Selection Swatch Block Arrays */}
          <Text style={styles.fieldSectionLabel}>Dominant Tone Profile</Text>
          <View style={styles.swatchPaletteRow}>
            {PALETTE_COLORS.map((colorItem) => {
              const isSelected = selectedColor === colorItem.hex;
              const isWhiteVariant = colorItem.hex === '#FFFFFF';
              return (
                <PremiumTouchable
                  key={colorItem.hex}
                  onPress={() => setSelectedColor(colorItem.hex)}
                  style={[
                    styles.swatchCircleCircle,
                    { backgroundColor: colorItem.hex },
                    isWhiteVariant && styles.whiteSwatchBorderOverride,
                    isSelected && styles.swatchCircleActiveOutline
                  ]}
                  disabled={isSaving}
                >
                  {isSelected && (
                    <Feather 
                      name="check" 
                      size={14} 
                      color={isWhiteVariant ? '#1C1917' : '#FAFAF9'} 
                    />
                  )}
                </PremiumTouchable>
              );
            })}
          </View>

          {/* Execution Submission Action Callout */}
          <PremiumTouchable
            onPress={handleFormSubmission}
            style={[styles.saveExecutionButton, isSaving && styles.saveExecutionDisabled]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FAFAF9" />
            ) : (
              <Text style={styles.saveExecutionText}>Save to Wardrobe</Text>
            )}
          </PremiumTouchable>
        </ScrollView>
      </SafeAreaView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1 },
  navigationRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  backTouchTarget: { padding: 8, marginLeft: -8, marginRight: 8 },
  headerTitleSpacing: { flex: 1, paddingVertical: 0 },
  scrollBodyContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  fieldSectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', color: '#78716C', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  mediaContainerBox: { width: '100%', height: 200, backgroundColor: '#F5F5F4', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E7E5E4', overflow: 'hidden' },
  emptyMediaTriggerFrame: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  mediaContextButton: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', gap: 6 },
  mediaContextText: { fontSize: 13, fontWeight: '500', color: '#1C1917' },
  mediaSplitDivider: { width: 1, height: '40%', backgroundColor: '#E7E5E4' },
  previewContainer: { flex: 1, position: 'relative' },
  previewImageRender: { width: '100%', height: '100%', resizeMode: 'cover' },
  clearMediaIndicator: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(28, 25, 23, 0.75)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  textInputWrapperBox: { backgroundColor: '#F5F5F4', borderRadius: 12, height: 48, paddingHorizontal: 14, justifyContent: 'center' },
  formInputCore: { fontSize: 14, color: '#1C1917' },
  chipsContainerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoricalChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipSelected: { backgroundColor: '#1C1917', borderColor: '#1C1917' },
  chipUnselected: { backgroundColor: 'transparent', borderColor: '#E7E5E4' },
  chipTextLabel: { fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#FAFAF9' },
  chipTextUnselected: { color: '#1C1917' },
  swatchPaletteRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingVertical: 4 },
  swatchCircleCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  whiteSwatchBorderOverride: { borderWidth: 1, borderColor: '#E7E5E4' },
  swatchCircleActiveOutline: { borderWidth: 2, borderColor: '#1C1917', scaleX: 1.05, scaleY: 1.05 },
  saveExecutionButton: { backgroundColor: '#1C1917', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowColor: '#1C1917', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  saveExecutionDisabled: { opacity: 0.7 },
  saveExecutionText: { color: '#FAFAF9', fontSize: 15, fontWeight: '600' },
});