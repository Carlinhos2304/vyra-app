import React, { useState, useEffect, useRef } from 'react';
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
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, Easing } from 'react-native-reanimated';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';

import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import { CREATION_CATEGORIES, PALETTE_COLORS } from '../../constants/garmentTaxonomy';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// CREATION_CATEGORIES / PALETTE_COLORS now come from constants/garmentTaxonomy.ts
// (previously duplicated here with a stale 6-item category list that had drifted
// out of sync with add-garment.tsx's 11-item list — unified to a single source of truth).

type EditGarmentSearchParams = {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  color: string;
};

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

export default function EditGarmentScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams<EditGarmentSearchParams>();
  const navigation = useNavigation();

  // Form Fields
  const [name, setName] = useState(params.name || '');
  const [brand, setBrand] = useState(params.brand === 'Unknown Brand' || params.brand === 'Unbranded' ? '' : params.brand || '');
  const [selectedCategory, setSelectedCategory] = useState(params.category || '');
  const [selectedColor, setSelectedColor] = useState(params.color || '#FFFFFF');
  const [imageUri, setImageUri] = useState<string | null>(params.image || null);
  const [isSaving, setIsSaving] = useState(false);

  // Custom Color Picker Layout States
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [customColor, setCustomColor] = useState('#7C3AED');
  const [hue, setHue] = useState(265);
  const [saturation, setSaturation] = useState(1);
  const [brightness, setBrightness] = useState(1);

  const containerWidthRef = useRef(280);
  const computedTempColor = hsvToHex(hue, saturation, brightness);
  const isCustomColorActive = !PALETTE_COLORS.some(item => item.hex.toUpperCase() === selectedColor.toUpperCase());

  // Locally-computed theme-dependent chip pairs (colors can't be static once theme-dependent)
  const chipSelected = { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent };
  const chipUnselected = { backgroundColor: 'transparent', borderColor: theme.colors.border };
  const chipTextSelected = { color: theme.colors.accentForeground };
  const chipTextUnselected = { color: theme.colors.textPrimary };

  // CRITICAL FIX FOR NAVIGATION DISCARD LOOP: Use a mutable Ref to safely disable the interceptor instantly
  const isSavedSuccess = useRef(false);

  // Dynamic state checks
  const hasUnsavedChanges =
    name.trim() !== (params.name || '').trim() ||
    brand.trim() !== (params.brand === 'Unknown Brand' || params.brand === 'Unbranded' ? '' : params.brand || '').trim() ||
    selectedCategory !== params.category ||
    selectedColor.toUpperCase() !== (params.color || '#FFFFFF').toUpperCase() ||
    imageUri !== (params.image || null);

  const isFormValid = name.trim().length > 0 && selectedCategory.length > 0 && imageUri !== null;
  const canSave = hasUnsavedChanges && isFormValid && !isSaving;

  // Intercepting hardware/software back navigation requests
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If the save pipeline completed successfully, completely bypass the confirmation modal
      if (isSavedSuccess.current) {
        return;
      }

      // If nothing has been modified, don't show the warning dialog
      if (!hasUnsavedChanges) {
        return;
      }

      e.preventDefault();
      Alert.alert(
        t('clothing.editGarment.discardChanges.title'),
        t('clothing.editGarment.discardChanges.message'),
        [
          { text: t('clothing.editGarment.discardChanges.stay'), style: 'cancel', onPress: () => {} },
          { text: t('clothing.editGarment.discardChanges.discard'), style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  useEffect(() => {
    if (params.color && isCustomColorActive) {
      setCustomColor(params.color);
    }
  }, [params.color]);

  // PanResponder Touch Interactions for Color Customizer Canvas
  const saturationBrightnessResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleCanvasTouch(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => handleCanvasTouch(e.nativeEvent.locationX, e.nativeEvent.locationY),
    })
  ).current;

  const hueTrackResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleHueTouch(e.nativeEvent.locationX),
      onPanResponderMove: (e) => handleHueTouch(e.nativeEvent.locationX),
    })
  ).current;

  const handleCanvasTouch = (x: number, y: number) => {
    const width = containerWidthRef.current;
    setSaturation(Math.max(0, Math.min(x, width)) / width);
    setBrightness(1 - Math.max(0, Math.min(y, 160)) / 160);
  };

  const handleHueTouch = (x: number) => {
    setHue((Math.max(0, Math.min(x, containerWidthRef.current)) / containerWidthRef.current) * 360);
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('clothing.editGarment.permissions.deniedTitle'), t('clothing.editGarment.permissions.galleryMessage'));
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
      Alert.alert(t('clothing.editGarment.permissions.deniedTitle'), t('clothing.editGarment.permissions.cameraMessage'));
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

  // Safe Core Save Changes Function Pipeline
  const handleSaveChanges = async () => {
    if (!canSave) return;

    try {
      setIsSaving(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert(t('clothing.editGarment.errors.sessionExpiredTitle'), t('clothing.editGarment.errors.sessionExpiredMessage'));
        return;
      }

      let finalImageUrl = params.image;
      const isImageChanged = imageUri !== params.image;

      if (isImageChanged && imageUri) {
        const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const cleanExtension = ['jpg', 'jpeg', 'png', 'heic'].includes(fileExtension) ? fileExtension : 'jpg';
        const mimeType = cleanExtension === 'png' ? 'image/png' : 'image/jpeg';

        const storageFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${cleanExtension}`;
        const targetStoragePath = `${user.id}/${storageFileName}`;

        const formData = new FormData();
        formData.append('file', { uri: imageUri, name: storageFileName, type: mimeType } as any);

        const { error: uploadError } = await supabase.storage
          .from('garments')
          .upload(targetStoragePath, formData, { contentType: mimeType, upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('garments').getPublicUrl(targetStoragePath);
        finalImageUrl = publicUrlData.publicUrl;

        if (params.image && params.image.includes('/storage/v1/object/public/garments/')) {
          const oldFileName = params.image.split('/garments/').pop();
          if (oldFileName) {
            await supabase.storage.from('garments').remove([oldFileName]);
          }
        }
      }

      // Execute SQL Update targeting table structure records
      const { error: databaseUpdateError } = await supabase
        .from('clothing_items')
        .update({
          name: name.trim(),
          brand: brand.trim() || 'Unbranded',
          category: selectedCategory,
          color: selectedColor,
          image_url: finalImageUrl,
        })
        .eq('id', params.id)
        .eq('user_id', user.id);

      if (databaseUpdateError) throw databaseUpdateError;

      // CRITICAL FIX: Flip the ref check to true BEFORE calling router displacement
      isSavedSuccess.current = true;

      // Return back to details viewport safely with an active refresh token
      router.replace({
        pathname: '/clothing/[id]',
        params: { id: params.id, refresh: `${Date.now()}` },
      });

    } catch (error: any) {
      console.error('[Edit Garment Pipeline Failure]:', error);
      Alert.alert(t('clothing.editGarment.errors.saveFailedTitle'), error.message || t('clothing.editGarment.errors.saveFailedMessage'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.safeContainer} edges={['top']}>
        {/* Navigation Row */}
        <View style={styles.navigationRow}>
          <PremiumTouchable style={styles.backTouchTarget} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={theme.colors.textPrimary} />
          </PremiumTouchable>
          <SectionHeader
            title={t('clothing.editGarment.header.title')}
            subtitle={t('clothing.editGarment.header.subtitle')}
            style={styles.headerTitleSpacing}
          />
        </View>

        <Animated.View style={styles.animatedFormBody} entering={FadeIn.duration(450).easing(Easing.out(Easing.cubic))}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBodyContainer}>
          {/* Media Profile Element Selector Container */}
          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.editGarment.fields.visualProfile')}</Text>
          <View style={[styles.mediaContainerBox, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImageRender} />
                {/* Delete control sits on top of the garment photo — kept fixed regardless of theme (photo-context) */}
                <PremiumTouchable style={styles.clearMediaIndicator} onPress={() => setImageUri(null)}>
                  <Feather name="trash-2" size={16} color="#FAFAF9" />
                </PremiumTouchable>
              </View>
            ) : (
              <View style={styles.emptyMediaTriggerFrame}>
                <PremiumTouchable style={styles.mediaContextButton} onPress={pickImageFromGallery}>
                  <Feather name="image" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.mediaContextText, { color: theme.colors.textPrimary }]}>{t('clothing.editGarment.fields.gallery')}</Text>
                </PremiumTouchable>

                <View style={[styles.mediaSplitDivider, { backgroundColor: theme.colors.border }]} />

                <PremiumTouchable style={styles.mediaContextButton} onPress={capturePhotoFromCamera}>
                  <Feather name="camera" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.mediaContextText, { color: theme.colors.textPrimary }]}>{t('clothing.editGarment.fields.camera')}</Text>
                </PremiumTouchable>
              </View>
            )}
          </View>

          {/* Form Context Inputs */}
          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.editGarment.fields.title')}</Text>
          <View style={[styles.textInputWrapperBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <TextInput
              placeholder={t('clothing.editGarment.fields.titlePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.formInputCore, { color: theme.colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              editable={!isSaving}
            />
          </View>

          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.editGarment.fields.brand')}</Text>
          <View style={[styles.textInputWrapperBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <TextInput
              placeholder={t('clothing.editGarment.fields.brandPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.formInputCore, { color: theme.colors.textPrimary }]}
              value={brand}
              onChangeText={setBrand}
              editable={!isSaving}
            />
          </View>

          {/* Category Section Selection Grid */}
          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.editGarment.fields.category')}</Text>
          <View style={styles.chipsContainerRow}>
            {CREATION_CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <PremiumTouchable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[styles.categoricalChip, isSelected ? chipSelected : chipUnselected]}
                  disabled={isSaving}
                >
                  <Text style={[styles.chipTextLabel, isSelected ? chipTextSelected : chipTextUnselected]}>
                    {category}
                  </Text>
                </PremiumTouchable>
              );
            })}
          </View>

          {/* Color Choices Palettes Swatches Layout Wrapper */}
          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.editGarment.fields.color')}</Text>
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
                    { backgroundColor: colorItem.hex, shadowColor: theme.colors.shadow },
                    isLightVariant && { borderWidth: 1, borderColor: theme.colors.border },
                    isSelected && { borderWidth: 2, borderColor: theme.colors.accent }
                  ]}
                  disabled={isSaving}
                >
                  {/* Checkmark contrast is chosen against the swatch's own color, not the app theme */}
                  {isSelected && <Feather name="check" size={14} color={isLightVariant ? '#1C1917' : '#FAFAF9'} />}
                </PremiumTouchable>
              );
            })}

            <PremiumTouchable
              onPress={() => setIsPickerVisible(true)}
              style={[
                styles.swatchCircleCircle,
                { backgroundColor: customColor, shadowColor: theme.colors.shadow },
                customColor.toUpperCase() === '#FFFFFF' && { borderWidth: 1, borderColor: theme.colors.border },
                isCustomColorActive && { borderWidth: 2, borderColor: theme.colors.accent }
              ]}
              disabled={isSaving}
            >
              <Feather name={isCustomColorActive ? "check" : "plus"} size={14} color={customColor.toUpperCase() === '#FFFFFF' ? '#1C1917' : '#FAFAF9'} />
            </PremiumTouchable>
          </View>

          {/* Complete Submission Core Execution Button */}
          <PremiumTouchable
            onPress={handleSaveChanges}
            style={[
              styles.saveExecutionButton,
              { backgroundColor: theme.colors.accent, shadowColor: theme.colors.shadow },
              !canSave && styles.saveExecutionDisabled
            ]}
            disabled={!canSave}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.accentForeground} />
            ) : (
              <Text style={[styles.saveExecutionText, { color: theme.colors.accentForeground }]}>{t('clothing.editGarment.saveButton')}</Text>
            )}
          </PremiumTouchable>
        </ScrollView>
        </Animated.View>
      </SafeAreaView>

      {/* Custom HSV Precision Mathematical Color Overlay BottomSheet Modal */}
      <Modal visible={isPickerVisible} animationType="slide" transparent={true} statusBarTranslucent onRequestClose={() => setIsPickerVisible(false)}>
        {/* Backdrop scrim stays fixed regardless of theme, matching PremiumModal's convention */}
        <View style={styles.modalBackdropOverlay}>
          <SafeAreaView style={styles.modalSafeBoundary} edges={['bottom']}>
            <View style={[styles.bottomSheetFrame, { backgroundColor: theme.colors.surfaceElevated, shadowColor: theme.colors.shadow }]}>
              <View style={[styles.bottomSheetDraggerBar, { backgroundColor: theme.colors.border }]} />

              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeadingTitle, { color: theme.colors.textPrimary }]}>{t('clothing.editGarment.colorPicker.title')}</Text>
                <PremiumTouchable onPress={() => setIsPickerVisible(false)} style={styles.modalCloseTouchTarget}>
                  <Feather name="x" size={20} color={theme.colors.textSecondary} />
                </PremiumTouchable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody} bounces={false}>
                <View style={[styles.livePreviewContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={[styles.livePreviewColorBlock, { backgroundColor: computedTempColor, borderColor: theme.colors.border }]} />
                  <View style={styles.livePreviewMetaBlock}>
                    <Text style={[styles.livePreviewLabel, { color: theme.colors.textSecondary }]}>{t('clothing.editGarment.colorPicker.hexLabel')}</Text>
                    <Text style={[styles.livePreviewHexValue, { color: theme.colors.textPrimary }]}>{computedTempColor}</Text>
                  </View>
                </View>

                <Text style={[styles.pickerSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.editGarment.colorPicker.saturationBrightness')}</Text>
                <View style={[styles.canvasContainerFrame, { backgroundColor: theme.colors.border }]} onLayout={(e) => { containerWidthRef.current = e.nativeEvent.layout.width; }} {...saturationBrightnessResponder.panHandlers}>
                  <LinearGradient colors={[hsvToHex(hue, 1, 1), '#FFFFFF']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill}>
                    <LinearGradient colors={['transparent', '#000000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
                  </LinearGradient>
                  <View style={[styles.canvasThumbCursor, { left: saturation * containerWidthRef.current - 9, top: (1 - brightness) * 160 - 9, backgroundColor: computedTempColor }]} />
                </View>

                <Text style={[styles.pickerSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.editGarment.colorPicker.hueSpectrum')}</Text>
                <View style={styles.sliderTrackFrame} {...hueTrackResponder.panHandlers}>
                  <LinearGradient colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sliderGradientFill} />
                  <View style={[styles.sliderThumbCursor, { left: (hue / 360) * containerWidthRef.current - 10, backgroundColor: hsvToHex(hue, 1, 1) }]} />
                </View>
              </ScrollView>

              <View style={[styles.modalActionButtonsRow, { borderColor: theme.colors.border }]}>
                <PremiumTouchable onPress={() => setIsPickerVisible(false)} style={[styles.modalSecondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.modalSecondaryButtonText, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
                </PremiumTouchable>

                <PremiumTouchable onPress={handleCustomColorConfirmation} style={[styles.modalPrimaryButton, { backgroundColor: theme.colors.accent }]}>
                  <Text style={[styles.modalPrimaryButtonText, { color: theme.colors.accentForeground }]}>{t('clothing.editGarment.colorPicker.applyColor')}</Text>
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
  animatedFormBody: { flex: 1 },
  scrollBodyContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  fieldSectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  mediaContainerBox: { width: '100%', height: 200, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, overflow: 'hidden' },
  emptyMediaTriggerFrame: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  mediaContextButton: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', gap: 6 },
  mediaContextText: { fontSize: 13, fontWeight: '500' },
  mediaSplitDivider: { width: 1, height: '40%' },
  previewContainer: { flex: 1, position: 'relative' },
  previewImageRender: { width: '100%', height: '100%', resizeMode: 'cover' },
  clearMediaIndicator: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(28, 25, 23, 0.75)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  textInputWrapperBox: { borderRadius: 12, height: 48, paddingHorizontal: 14, justifyContent: 'center', marginBottom: 4 },
  formInputCore: { fontSize: 14, width: '100%' },
  chipsContainerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoricalChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTextLabel: { fontSize: 13, fontWeight: '500' },
  swatchPaletteRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', paddingVertical: 4 },
  swatchCircleCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, marginBottom: 4 },
  saveExecutionButton: { height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  saveExecutionDisabled: { opacity: 0.4 },
  saveExecutionText: { fontSize: 15, fontWeight: '600' },

  modalBackdropOverlay: { flex: 1, backgroundColor: 'rgba(28, 25, 23, 0.4)', justifyContent: 'flex-end' },
  modalSafeBoundary: { width: '100%' },
  bottomSheetFrame: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, maxHeight: SCREEN_HEIGHT * 0.82, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
  bottomSheetDraggerBar: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 },
  modalHeadingTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  modalCloseTouchTarget: { padding: 4 },
  modalScrollBody: { paddingVertical: 2 },
  pickerSectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  livePreviewContainer: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 14 },
  livePreviewColorBlock: { width: 40, height: 40, borderRadius: 8, borderWidth: 1 },
  livePreviewMetaBlock: { marginLeft: 12, flex: 1 },
  livePreviewLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  livePreviewHexValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  canvasContainerFrame: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  canvasThumbCursor: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#FAFAF9', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  sliderTrackFrame: { width: '100%', height: 14, marginBottom: 20, justifyContent: 'center' },
  sliderGradientFill: { width: '100%', height: '100%', borderRadius: 7 },
  sliderThumbCursor: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FAFAF9', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  modalActionButtonsRow: { flexDirection: 'row', gap: 12, paddingTop: 14, borderTopWidth: 1, marginTop: 4 },
  modalSecondaryButton: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  modalSecondaryButtonText: { fontSize: 14, fontWeight: '600' },
  modalPrimaryButton: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalPrimaryButtonText: { fontSize: 14, fontWeight: '600' },
});
