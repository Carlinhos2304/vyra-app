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
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';

import { supabase } from '../../lib/supabase';

const CREATION_CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Outerwear', 'Accessories'];

// Significantly expanded high-fidelity architectural palette matrix
const PALETTE_COLORS = [
  // Neutrals & Foundations
  { label: 'Black', hex: '#000000' },
  { label: 'Charcoal', hex: '#374151' },
  { label: 'Gray', hex: '#4B5563' },
  { label: 'Light Gray', hex: '#D1D5DB' },
  { label: 'White', hex: '#FFFFFF' },
  { label: 'Cream', hex: '#FFFDD0' },
  { label: 'Beige', hex: '#F5F5DC' },
  { label: 'Camel', hex: '#C19A6B' },
  { label: 'Brown', hex: '#78350F' },
  
  // Cool Tones & Depths
  { label: 'Navy', hex: '#1E3A8A' },
  { label: 'Blue', hex: '#3B82F6' },
  { label: 'Sky Blue', hex: '#93C5FD' },
  { label: 'Teal', hex: '#0D9488' },
  { label: 'Turquoise', hex: '#2DD4BF' },
  { label: 'Olive', hex: '#556B2F' },
  { label: 'Green', hex: '#16A34A' },
  { label: 'Mint', hex: '#A7F3D0' },
  { label: 'Lime', hex: '#84CC16' },
  
  // Warm Tones & Vibrants
  { label: 'Burgundy', hex: '#800020' },
  { label: 'Red', hex: '#DC2626' },
  { label: 'Coral', hex: '#FF7F50' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Mustard', hex: '#CA8A04' },
  { label: 'Yellow', hex: '#FACC15' },
  
  // Purples & Roses
  { label: 'Violet', hex: '#4C1D95' },
  { label: 'Purple', hex: '#8B5CF6' },
  { label: 'Lavender', hex: '#E9D5FF' },
  { label: 'Rose', hex: '#FDA4AF' },
  { label: 'Pink', hex: '#F43F5E' },
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert(
          'Authentication Required',
          'Your active security token has expired. Please log out and authenticate again to update your closet storage.'
        );
        return;
      }
      
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const cleanExtension = ['jpg', 'jpeg', 'png', 'heic'].includes(fileExtension) ? fileExtension : 'jpg';
      const mimeType = cleanExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      const storageFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${cleanExtension}`;
      const parameterizedStoragePath = `${user.id}/${storageFileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: storageFileName,
        type: mimeType,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('garments')
        .upload(parameterizedStoragePath, formData, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('garments')
        .getPublicUrl(parameterizedStoragePath);

      const finalStoragePublicUrl = publicUrlData.publicUrl;

      const { error: databaseInsertError } = await supabase
        .from('clothing_items')
        .insert([
          {
            user_id: user.id,
            name: name.trim(),
            brand: brand.trim() || 'Unbranded',
            category: selectedCategory,
            color: selectedColor,
            image_url: finalStoragePublicUrl,
            is_favorite: false,
          },
        ]);

      if (databaseInsertError) throw databaseInsertError;

      router.replace({
        pathname: '/(tabs)/closet',
        params: { refresh: `${Date.now()}` },
      });

    } catch (error: any) {
      console.error('[Add Garment Flow Exception]:', error);
      Alert.alert('Transaction Failure', error.message || 'An unexpected database error occurred while registering garment profiles.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.safeContainer} edges={['top']}>
        {/* Navigation Block Header */}
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
          {/* Media Interactive Capture Box */}
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

          {/* Form Context Fields */}
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

          {/* Category Selection Array */}
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

          {/* Scaled Swatch Palette Arrays */}
          <Text style={styles.fieldSectionLabel}>Dominant Tone Profile</Text>
          <View style={styles.swatchPaletteRow}>
            {PALETTE_COLORS.map((colorItem) => {
              const isSelected = selectedColor === colorItem.hex;
              // Detect white and cream variations cleanly to force border line edge rendering
              const isLightVariant = colorItem.hex === '#FFFFFF' || colorItem.hex === '#FFFDD0' || colorItem.hex === '#F5F5DC';
              return (
                <PremiumTouchable
                  key={colorItem.hex}
                  onPress={() => setSelectedColor(colorItem.hex)}
                  style={[
                    styles.swatchCircleCircle,
                    { backgroundColor: colorItem.hex },
                    isLightVariant && styles.whiteSwatchBorderOverride,
                    isSelected && styles.swatchCircleActiveOutline
                  ]}
                  disabled={isSaving}
                >
                  {isSelected && (
                    <Feather 
                      name="check" 
                      size={14} 
                      color={isLightVariant ? '#1C1917' : '#FAFAF9'} 
                    />
                  )}
                </PremiumTouchable>
              );
            })}
          </View>

          {/* Action Callout */}
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
  
  // FIXED: Adjusted button alignment distribution across horizontal space
  emptyMediaTriggerFrame: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
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
  
  // SCALED: Clean wrapping layout properties handling multi-row palette items safely
  swatchPaletteRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', paddingVertical: 4 },
  swatchCircleCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, marginBottom: 4 },
  
  whiteSwatchBorderOverride: { borderWidth: 1, borderColor: '#E7E5E4' },
  swatchCircleActiveOutline: { borderWidth: 2, borderColor: '#1C1917', scaleX: 1.05, scaleY: 1.05 },
  saveExecutionButton: { backgroundColor: '#1C1917', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowColor: '#1C1917', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  saveExecutionDisabled: { opacity: 0.7 },
  saveExecutionText: { color: '#FAFAF9', fontSize: 15, fontWeight: '600' },
});