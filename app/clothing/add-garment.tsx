import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';

import { supabase } from '../../lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CREATION_CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Outerwear', 'Accessories'];

const PALETTE_COLORS = [
  { label: 'Black', hex: '#000000' },
  { label: 'Charcoal', hex: '#374151' },
  { label: 'Gray', hex: '#4B5563' },
  { label: 'Light Gray', hex: '#D1D5DB' },
  { label: 'White', hex: '#FFFFFF' },
  { label: 'Cream', hex: '#FFFDD0' },
  { label: 'Beige', hex: '#F5F5DC' },
  { label: 'Camel', hex: '#C19A6B' },
  { label: 'Brown', hex: '#78350F' },
  { label: 'Navy', hex: '#1E3A8A' },
  { label: 'Blue', hex: '#3B82F6' },
  { label: 'Sky Blue', hex: '#93C5FD' },
  { label: 'Teal', hex: '#0D9488' },
  { label: 'Turquoise', hex: '#2DD4BF' },
  { label: 'Olive', hex: '#556B2F' },
  { label: 'Green', hex: '#16A34A' },
  { label: 'Mint', hex: '#A7F3D0' },
  { label: 'Lime', hex: '#84CC16' },
  { label: 'Burgundy', hex: '#800020' },
  { label: 'Red', hex: '#DC2626' },
  { label: 'Coral', hex: '#FF7F50' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Mustard', hex: '#CA8A04' },
  { label: 'Yellow', hex: '#FACC15' },
  { label: 'Violet', hex: '#4C1D95' },
  { label: 'Purple', hex: '#8B5CF6' },
  { label: 'Lavender', hex: '#E9D5FF' },
  { label: 'Rose', hex: '#FDA4AF' },
  { label: 'Pink', hex: '#F43F5E' },
];

// Pure Mathematical Core Conversion Helpers (HSV to HEX Engine)
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { [r, g, b] = [c, x, 0]; }
  else if (h >= 60 && h < 120) { [r, g, b] = [x, c, 0]; }
  else if (h >= 120 && h < 180) { [r, g, b] = [0, c, x]; }
  else if (h >= 180 && h < 240) { [r, g, b] = [0, x, c]; }
  else if (h >= 240 && h < 300) { [r, g, b] = [x, 0, c]; }
  else if (h >= 300 && h <= 360) { [r, g, b] = [c, 0, x]; }

  const toHexStr = (num: number) => {
    const hex = Math.round((num + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHexStr(r)}${toHexStr(g)}${toHexStr(b)}`.toUpperCase();
}

export default function AddGarmentScreen() {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Picker Overlay Geometry and Metrics
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [customColor, setCustomColor] = useState('#7C3AED');
  
  // Track continuous updates locally using discrete structural states
  const [hue, setHue] = useState(265); 
  const [saturation, setSaturation] = useState(1);
  const [brightness, setBrightness] = useState(1);

  const containerWidthRef = useRef(280); 
  const computedTempColor = hsvToHex(hue, saturation, brightness);
  const isCustomColorActive = !PALETTE_COLORS.some(item => item.hex.toUpperCase() === selectedColor.toUpperCase());

  // Responder handling logic for the 2D Saturation/Brightness canvas
  const saturationSaturationPanelResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => handleCanvasTouch(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e, gestureState) => handleCanvasTouch(e.nativeEvent.locationX, e.nativeEvent.locationY),
    })
  ).current;

  // Responder handling logic for the linear Hue slider track
  const hueTrackResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => handleHueTouch(e.nativeEvent.locationX),
      onPanResponderMove: (e, gestureState) => handleHueTouch(e.nativeEvent.locationX),
    })
  ).current;

  const handleCanvasTouch = (x: number, y: number) => {
    const width = containerWidthRef.current;
    const height = 160; 
    const clampedX = Math.max(0, Math.min(x, width));
    const clampedY = Math.max(0, Math.min(y, height));

    setSaturation(clampedX / width);
    setBrightness(1 - clampedY / height);
  };

  const handleHueTouch = (x: number) => {
    const width = containerWidthRef.current;
    const clampedX = Math.max(0, Math.min(x, width));
    setHue((clampedX / width) * 360);
  };

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

  const handleCustomColorConfirmation = () => {
    setCustomColor(computedTempColor);
    setSelectedColor(computedTempColor);
    setIsPickerVisible(false);
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

          {/* Hybrid Swatch Palette Row */}
          <Text style={styles.fieldSectionLabel}>Dominant Tone Profile</Text>
          <View style={styles.swatchPaletteRow}>
            {PALETTE_COLORS.map((colorItem) => {
              const isSelected = selectedColor.toUpperCase() === colorItem.hex.toUpperCase();
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

            {/* Custom Interactive Color Trigger Node */}
            <PremiumTouchable
              onPress={() => setIsPickerVisible(true)}
              style={[
                styles.swatchCircleCircle,
                { backgroundColor: customColor },
                customColor.toUpperCase() === '#FFFFFF' && styles.whiteSwatchBorderOverride,
                isCustomColorActive && styles.swatchCircleActiveOutline
              ]}
              disabled={isSaving}
            >
              {isCustomColorActive ? (
                <Feather name="check" size={14} color="#FAFAF9" style={styles.blendIconShadow} />
              ) : (
                <Feather name="plus" size={14} color="#1C1917" style={styles.blendIconShadow} />
              )}
            </PremiumTouchable>
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

      {/* Cross-Platform Pure Layout Native Modal Overlay Component */}
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <View style={styles.modalBackdropOverlay}>
          <SafeAreaView style={styles.modalSafeBoundary} edges={['bottom']}>
            <View style={styles.bottomSheetFrame}>
              <View style={styles.bottomSheetDraggerBar} />
              
              {/* HEADER VIEW: Fixed Top */}
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeadingTitle}>Custom Palette Curator</Text>
                <PremiumTouchable onPress={() => setIsPickerVisible(false)} style={styles.modalCloseTouchTarget}>
                  <Feather name="x" size={20} color="#78716C" />
                </PremiumTouchable>
              </View>

              {/* CENTRAL SCROLL CONTENT: Dynamic midsection */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollBody}
                bounces={false}
              >
                {/* Real-time Tonal Preview */}
                <View style={styles.livePreviewContainer}>
                  <View style={[styles.livePreviewColorBlock, { backgroundColor: computedTempColor }]} />
                  <View style={styles.livePreviewMetaBlock}>
                    <Text style={styles.livePreviewLabel}>HEX Parameter Code</Text>
                    <Text style={styles.livePreviewHexValue}>{computedTempColor}</Text>
                  </View>
                </View>

                {/* 2D Brightness and Saturation Gradient Canvas Grid */}
                <Text style={styles.pickerSectionLabel}>Saturation & Brightness</Text>
                <View 
                  style={styles.canvasContainerFrame}
                  onLayout={(e) => { containerWidthRef.current = e.nativeEvent.layout.width; }}
                  {...saturationSaturationPanelResponder.panHandlers}
                >
                  <LinearGradient
                    colors={[hsvToHex(hue, 1, 1), '#FFFFFF']}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  >
                    <LinearGradient
                      colors={['transparent', '#000000']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </LinearGradient>

                  {/* Canvas Selection Thumb Cursor */}
                  <View 
                    style={[
                      styles.canvasThumbCursor, 
                      {
                        left: saturation * containerWidthRef.current - 9,
                        top: (1 - brightness) * 160 - 9,
                        backgroundColor: computedTempColor
                      }
                    ]} 
                  />
                </View>

                {/* Pure Linear Hue Gradient Slider Track */}
                <Text style={styles.pickerSectionLabel}>Hue Spectrum</Text>
                <View 
                  style={styles.sliderTrackFrame}
                  {...hueTrackResponder.panHandlers}
                >
                  <LinearGradient
                    colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sliderGradientFill}
                  />
                  {/* Linear Track Selection Thumb Indicator */}
                  <View 
                    style={[
                      styles.sliderThumbCursor, 
                      {
                        left: (hue / 360) * containerWidthRef.current - 10,
                        backgroundColor: hsvToHex(hue, 1, 1)
                      }
                    ]} 
                  />
                </View>
              </ScrollView>

              {/* FOOTER VIEW: Fixed Bottom */}
              <View style={styles.modalActionButtonsRow}>
                <PremiumTouchable 
                  onPress={() => setIsPickerVisible(false)} 
                  style={styles.modalSecondaryButton}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </PremiumTouchable>
                
                <PremiumTouchable 
                  onPress={handleCustomColorConfirmation} 
                  style={styles.modalPrimaryButton}
                >
                  <Text style={styles.modalPrimaryButtonText}>Apply Color</Text>
                </PremiumTouchable>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
  swatchPaletteRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', paddingVertical: 4 },
  swatchCircleCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, marginBottom: 4 },
  whiteSwatchBorderOverride: { borderWidth: 1, borderColor: '#E7E5E4' },
  swatchCircleActiveOutline: { borderWidth: 2, borderColor: '#1C1917', scaleX: 1.05, scaleY: 1.05 },
  saveExecutionButton: { backgroundColor: '#1C1917', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowColor: '#1C1917', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  saveExecutionDisabled: { opacity: 0.7 },
  saveExecutionText: { color: '#FAFAF9', fontSize: 15, fontWeight: '600' },
  blendIconShadow: { textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },

  // Standard-Compliant Modular Bottom Sheet Specifications
  modalBackdropOverlay: { flex: 1, backgroundColor: 'rgba(28, 25, 23, 0.4)', justifyContent: 'flex-end' },
  modalSafeBoundary: { width: '100%' },
  bottomSheetFrame: { 
    backgroundColor: '#FAFAF9', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    paddingHorizontal: 24, 
    paddingTop: 12,
    paddingBottom: 16,
    maxHeight: SCREEN_HEIGHT * 0.82, 
    shadowColor: '#1C1917', 
    shadowOffset: { width: 0, height: -4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 8 
  },
  bottomSheetDraggerBar: { width: 36, height: 4, backgroundColor: '#E7E5E4', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 },
  modalHeadingTitle: { fontSize: 16, fontWeight: '600', color: '#1C1917', letterSpacing: -0.2 },
  modalCloseTouchTarget: { padding: 4 },
  
  modalScrollBody: { paddingVertical: 2 },
  pickerSectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', color: '#78716C', letterSpacing: 0.5, marginBottom: 8 },
  
  livePreviewContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 14 },
  livePreviewColorBlock: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4' },
  livePreviewMetaBlock: { marginLeft: 12, flex: 1 },
  livePreviewLabel: { fontSize: 10, fontWeight: '600', color: '#78716C', textTransform: 'uppercase', letterSpacing: 0.5 },
  livePreviewHexValue: { fontSize: 14, fontWeight: '700', color: '#1C1917', marginTop: 2, fontFamily: 'monospace' },
  
  // Custom Gradient Canvas Grid Layouts
  canvasContainerFrame: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 16, backgroundColor: '#E7E5E4' },
  canvasThumbCursor: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#FAFAF9', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  
  // Custom Slider Controls 
  sliderTrackFrame: { width: '100%', height: 14, marginBottom: 20, justifyContent: 'center' },
  sliderGradientFill: { width: '100%', height: '100%', borderRadius: 7 },
  sliderThumbCursor: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FAFAF9', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  
  modalActionButtonsRow: { flexDirection: 'row', gap: 12, paddingTop: 14, borderTopWidth: 1, borderColor: '#E7E5E4', marginTop: 4 },
  modalSecondaryButton: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E7E5E4', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  modalSecondaryButtonText: { color: '#78716C', fontSize: 14, fontWeight: '600' },
  modalPrimaryButton: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#1C1917', justifyContent: 'center', alignItems: 'center' },
  modalPrimaryButtonText: { color: '#FAFAF9', fontSize: 14, fontWeight: '600' },
});