import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  PanResponder,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, Easing } from 'react-native-reanimated';

import { AppAlert } from '../../lib/ui/appAlert';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';

import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import {
  CREATION_CATEGORIES,
  PALETTE_COLORS,
  STYLE_OPTIONS,
  OCCASION_OPTIONS,
  SEASON_OPTIONS,
  matchCategory,
  matchPaletteColor,
  matchFromList,
} from '../../constants/garmentTaxonomy';
import { analyzeGarmentPhoto, removeGarmentBackground, AIAnalysisError, GarmentAnalysisResult } from '../../lib/services/aiService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// CREATION_CATEGORIES / PALETTE_COLORS now come from constants/garmentTaxonomy.ts
// (single source of truth, also consumed by the analyze-garment Edge Function
// so AI output and manual entry always speak the same vocabulary).

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
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- AI Garment Analysis (Phase 1) state ---
  // The photo is uploaded to Storage on first "Analyze with AI" press (or on
  // final save, whichever happens first) and cached here so we never upload
  // the same local file twice.
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<GarmentAnalysisResult | null>(null);
  // Background removal (Whering-style) runs automatically right after a photo
  // is picked/captured — see processPickedPhoto(). This just tracks whether
  // that's in flight so the preview can show a "Removing background..."
  // overlay and other actions (Analyze/Save) can hold off until it settles.
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);

  // Fields the AI can suggest but the user always reviews/edits before saving.
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [materialsText, setMaterialsText] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');

  // Clears every cached upload/AI-derived value — called whenever the user
  // picks a different photo, so a stale analysis never gets attached to a new image.
  const resetImageDerivedState = () => {
    setUploadedImagePath(null);
    setUploadedImageUrl(null);
    setAiAnalysis(null);
  };

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

  // Locally-computed theme-dependent chip pairs (colors can't be static once theme-dependent)
  const chipSelected = { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent };
  const chipUnselected = { backgroundColor: 'transparent', borderColor: theme.colors.border };
  const chipTextSelected = { color: theme.colors.accentForeground };
  const chipTextUnselected = { color: theme.colors.textPrimary };

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
      AppAlert.alert(t('clothing.addGarment.permissions.deniedTitle'), t('clothing.addGarment.permissions.galleryMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      processPickedPhoto(result.assets[0].uri);
    }
  };

  const capturePhotoFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      AppAlert.alert(t('clothing.addGarment.permissions.deniedTitle'), t('clothing.addGarment.permissions.cameraMessage'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      processPickedPhoto(result.assets[0].uri);
    }
  };

  const handleCustomColorConfirmation = () => {
    setCustomColor(computedTempColor);
    setSelectedColor(computedTempColor);
    setIsPickerVisible(false);
  };

  // Uploads a local photo URI to Storage. Pure function of its argument
  // (does NOT read/write imageUri state) so it's safe to call with a
  // freshly-picked uri before React has re-rendered with it — see
  // processPickedPhoto(), which needs this BEFORE imageUri's state update
  // would be visible to a same-tick reader.
  const uploadImageToStorage = async (sourceUri: string): Promise<{ path: string; url: string }> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error(t('clothing.addGarment.errors.authExpiredShortMessage'));
    }

    const fileExtension = sourceUri.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanExtension = ['jpg', 'jpeg', 'png', 'heic'].includes(fileExtension) ? fileExtension : 'jpg';
    const mimeType = cleanExtension === 'png' ? 'image/png' : 'image/jpeg';

    const storageFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${cleanExtension}`;
    const parameterizedStoragePath = `${user.id}/${storageFileName}`;

    const formData = new FormData();
    formData.append('file', {
      uri: sourceUri,
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

    return { path: parameterizedStoragePath, url: publicUrlData.publicUrl };
  };

  // Uploads the currently selected local photo to Storage exactly once,
  // caching the result. Both "Analyze with AI" and the final save call this,
  // so re-pressing Analyze or saving after analyzing never re-uploads. In
  // practice this is almost always already cached by the time either of
  // those runs, since processPickedPhoto() below uploads eagerly the moment
  // a photo is picked/captured — this remains as the fallback path for the
  // rare case that eager upload failed (e.g. a network hiccup right after
  // picking a photo).
  const ensureImageUploaded = async (): Promise<{ path: string; url: string }> => {
    if (uploadedImagePath && uploadedImageUrl) {
      return { path: uploadedImagePath, url: uploadedImageUrl };
    }
    if (!imageUri) {
      throw new Error(t('clothing.addGarment.errors.missingImageMessage'));
    }

    const uploaded = await uploadImageToStorage(imageUri);
    setUploadedImagePath(uploaded.path);
    setUploadedImageUrl(uploaded.url);
    return uploaded;
  };

  // Runs the moment a photo is picked/captured — uploads it, then asks
  // remove-background to isolate the garment on a solid white background
  // (see lib/services/aiService.removeGarmentBackground), swapping the
  // preview over to the cutout the instant it's ready. Mirrors what apps
  // like Whering do automatically on capture, with no button to press.
  //
  // Deliberately swallows every failure here (upload OR background removal):
  // this is a polish step layered on top of a flow that worked fine before
  // it existed, so a remove.bg outage/quota limit or a network hiccup must
  // never block the user from using their original photo as-is. If the
  // upload itself fails, uploadedImagePath/Url simply stay null and
  // ensureImageUploaded() retries it later exactly as it always has.
  const processPickedPhoto = async (uri: string) => {
    resetImageDerivedState();
    setImageUri(uri);
    setIsRemovingBackground(true);
    try {
      const uploaded = await uploadImageToStorage(uri);
      setUploadedImagePath(uploaded.path);
      setUploadedImageUrl(uploaded.url);

      const cutout = await removeGarmentBackground(uploaded.path);
      setImageUri(cutout.cutoutUrl);
      setUploadedImagePath(cutout.cutoutPath);
      setUploadedImageUrl(cutout.cutoutUrl);
    } catch (error) {
      console.warn('[Add Garment] automatic background removal skipped (non-fatal):', error);
    } finally {
      setIsRemovingBackground(false);
    }
  };

  // Sends the (already or newly uploaded) photo to the analyze-garment Edge
  // Function and pre-fills the form with its structured suggestions. The
  // user can still change every field before saving — nothing is persisted
  // to clothing_items by this step.
  const handleAnalyzeWithAI = async () => {
    if (!imageUri || isAnalyzing || isRemovingBackground) return;

    try {
      setIsAnalyzing(true);
      const { path } = await ensureImageUploaded();
      const result = await analyzeGarmentPhoto(path);
      setAiAnalysis(result);

      // "name" is always populated by the AI (Color + Main Characteristic +
      // Garment Type, e.g. "White Oversized Cotton T-Shirt") — still fully
      // editable afterward. "brand" only comes back non-null when a logo/tag
      // was clearly legible, so we only overwrite the field when it's set —
      // never clear a brand the user already typed with a null guess.
      if (result.name) setName(result.name);
      if (result.brand) setBrand(result.brand);

      const matchedCategory = matchCategory(result.category);
      if (matchedCategory) setSelectedCategory(matchedCategory);

      const matchedColor = matchPaletteColor(result.colors.primary);
      if (matchedColor) setSelectedColor(matchedColor.hex);

      setSelectedStyle(matchFromList(STYLE_OPTIONS, result.style) || '');
      setSelectedOccasion(matchFromList(OCCASION_OPTIONS, result.occasion) || '');
      setSelectedSeason(matchFromList(SEASON_OPTIONS, result.season) || '');
      setMaterialsText(result.materials.join(', '));
      setDescription(result.description);
      setTagsText(result.tags.join(', '));
    } catch (error: any) {
      const message = error instanceof AIAnalysisError
        ? error.message
        : error?.message || t('clothing.addGarment.errors.aiUnavailableMessage');
      AppAlert.alert(t('clothing.addGarment.errors.aiUnavailableTitle'), message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFormSubmission = async () => {
    if (isRemovingBackground) return; // Let the cutout finish first — avoids saving/uploading a stale pre-cutout image.
    if (!name.trim()) {
      AppAlert.alert(t('clothing.addGarment.errors.missingFieldTitle'), t('clothing.addGarment.errors.missingNameMessage'));
      return;
    }
    if (!selectedCategory) {
      AppAlert.alert(t('clothing.addGarment.errors.missingFieldTitle'), t('clothing.addGarment.errors.missingCategoryMessage'));
      return;
    }
    if (!imageUri) {
      AppAlert.alert(t('clothing.addGarment.errors.missingImageTitle'), t('clothing.addGarment.errors.missingImageMessage'));
      return;
    }

    try {
      setIsSaving(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        AppAlert.alert(
          t('clothing.addGarment.errors.authRequiredTitle'),
          t('clothing.addGarment.errors.authExpiredMessage')
        );
        return;
      }

      const { url: finalStoragePublicUrl } = await ensureImageUploaded();

      const materialsArray = materialsText.split(',').map(s => s.trim()).filter(Boolean);
      const tagsArray = tagsText.split(',').map(s => s.trim()).filter(Boolean);

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
            // --- AI-analyzable fields (all additive columns, all optional) ---
            style: selectedStyle || null,
            occasion: selectedOccasion || null,
            season: selectedSeason || null,
            material: materialsArray.length > 0 ? materialsArray : null,
            ai_description: description.trim() || null,
            tags: tagsArray.length > 0 ? tagsArray : null,
            ai_analyzed: !!aiAnalysis,
            ai_analyzed_at: aiAnalysis ? new Date().toISOString() : null,
            ai_confidence_score: aiAnalysis?.confidence_score ?? null,
            ai_analysis_raw: aiAnalysis ?? null,
          },
        ]);

      if (databaseInsertError) throw databaseInsertError;

      router.replace({
        pathname: '/(tabs)/closet',
        params: { refresh: `${Date.now()}` },
      });

    } catch (error: any) {
      console.error('[Add Garment Flow Exception]:', error);
      AppAlert.alert(t('clothing.addGarment.errors.transactionFailureTitle'), error.message || t('clothing.addGarment.errors.transactionFailureMessage'));
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
            <Feather name="arrow-left" size={22} color={theme.colors.textPrimary} />
          </PremiumTouchable>
          <SectionHeader
            title={t('clothing.addGarment.header.title')}
            subtitle={t('clothing.addGarment.header.subtitle')}
            style={styles.headerTitleSpacing}
          />
        </View>

        <Animated.View style={styles.animatedFormBody} entering={FadeIn.duration(450).easing(Easing.out(Easing.cubic))}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBodyContainer}
        >
          {/* Media Interactive Capture Box */}
          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.visualProfile')}</Text>
          <View style={[styles.mediaContainerBox, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
            {imageUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImageRender} />
                {/* Automatic Whering-style background removal overlay — runs
                    the instant a photo is picked/captured, no button needed. */}
                {isRemovingBackground && (
                  <View style={styles.backgroundRemovalOverlay}>
                    <ActivityIndicator size="small" color="#FAFAF9" />
                    <Text style={styles.backgroundRemovalOverlayText}>
                      {t('clothing.addGarment.backgroundRemoval.removingLabel')}
                    </Text>
                  </View>
                )}
                {/* Delete control sits on top of the garment photo — kept fixed dark/light regardless of theme (photo-context) */}
                <PremiumTouchable
                  style={styles.clearMediaIndicator}
                  onPress={() => { resetImageDerivedState(); setImageUri(null); }}
                  disabled={isRemovingBackground}
                >
                  <Feather name="trash-2" size={16} color="#FAFAF9" />
                </PremiumTouchable>
              </View>
            ) : (
              <View style={styles.emptyMediaTriggerFrame}>
                <PremiumTouchable style={styles.mediaContextButton} onPress={pickImageFromGallery}>
                  <Feather name="image" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.mediaContextText, { color: theme.colors.textPrimary }]}>{t('clothing.addGarment.fields.gallery')}</Text>
                </PremiumTouchable>

                <View style={[styles.mediaSplitDivider, { backgroundColor: theme.colors.border }]} />

                <PremiumTouchable style={styles.mediaContextButton} onPress={capturePhotoFromCamera}>
                  <Feather name="camera" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.mediaContextText, { color: theme.colors.textPrimary }]}>{t('clothing.addGarment.fields.camera')}</Text>
                </PremiumTouchable>
              </View>
            )}
          </View>

          {/* AI Analysis Trigger — only shown once a photo exists. Purely
              additive: the user can always skip this and fill everything
              manually, exactly as before this feature existed. */}
          {imageUri && (
            <PremiumTouchable
              onPress={handleAnalyzeWithAI}
              disabled={isAnalyzing || isSaving || isRemovingBackground}
              style={[
                styles.aiAnalyzeButton,
                { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
                isAnalyzing && styles.saveExecutionDisabled,
              ]}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color={theme.colors.textPrimary} />
              ) : (
                <Feather name="zap" size={16} color={theme.colors.textPrimary} />
              )}
              <Text style={[styles.aiAnalyzeButtonText, { color: theme.colors.textPrimary }]}>
                {isAnalyzing
                  ? t('clothing.addGarment.aiAnalyze.analyzing')
                  : aiAnalysis
                  ? t('clothing.addGarment.aiAnalyze.reanalyze')
                  : t('clothing.addGarment.aiAnalyze.analyze')}
              </Text>
            </PremiumTouchable>
          )}

          {/* Form Context Fields */}
          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.title')}</Text>
          <View style={[styles.textInputWrapperBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <TextInput
              placeholder={t('clothing.addGarment.fields.titlePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.formInputCore, { color: theme.colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              editable={!isSaving}
            />
          </View>

          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.brand')}</Text>
          <View style={[styles.textInputWrapperBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <TextInput
              placeholder={t('clothing.addGarment.fields.brandPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.formInputCore, { color: theme.colors.textPrimary }]}
              value={brand}
              onChangeText={setBrand}
              editable={!isSaving}
            />
          </View>

          {/* Category Selection Array */}
          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.category')}</Text>
          <View style={styles.chipsContainerRow}>
            {CREATION_CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <PremiumTouchable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.categoricalChip,
                    isSelected ? chipSelected : chipUnselected
                  ]}
                  disabled={isSaving}
                >
                  <Text style={[
                    styles.chipTextLabel,
                    isSelected ? chipTextSelected : chipTextUnselected
                  ]}>
                    {category}
                  </Text>
                </PremiumTouchable>
              );
            })}
          </View>

          {/* Hybrid Swatch Palette Row */}
          <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.color')}</Text>
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
                  {isSelected && (
                    // Checkmark contrast is chosen against the swatch's own color, not the app theme
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
                { backgroundColor: customColor, shadowColor: theme.colors.shadow },
                customColor.toUpperCase() === '#FFFFFF' && { borderWidth: 1, borderColor: theme.colors.border },
                isCustomColorActive && { borderWidth: 2, borderColor: theme.colors.accent }
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

          {/* AI Suggestions Review Section — appears once analysis has run at
              least once. Every value here is fully editable; nothing is saved
              until "Save to Wardrobe" is pressed. */}
          {aiAnalysis && (
            <>
              <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.style')}</Text>
              <View style={styles.chipsContainerRow}>
                {STYLE_OPTIONS.map((style) => {
                  const isSelected = selectedStyle === style;
                  return (
                    <PremiumTouchable
                      key={style}
                      onPress={() => setSelectedStyle(style)}
                      style={[styles.categoricalChip, isSelected ? chipSelected : chipUnselected]}
                      disabled={isSaving}
                    >
                      <Text style={[styles.chipTextLabel, isSelected ? chipTextSelected : chipTextUnselected]}>{style}</Text>
                    </PremiumTouchable>
                  );
                })}
              </View>

              <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.occasion')}</Text>
              <View style={styles.chipsContainerRow}>
                {OCCASION_OPTIONS.map((occasion) => {
                  const isSelected = selectedOccasion === occasion;
                  return (
                    <PremiumTouchable
                      key={occasion}
                      onPress={() => setSelectedOccasion(occasion)}
                      style={[styles.categoricalChip, isSelected ? chipSelected : chipUnselected]}
                      disabled={isSaving}
                    >
                      <Text style={[styles.chipTextLabel, isSelected ? chipTextSelected : chipTextUnselected]}>{occasion}</Text>
                    </PremiumTouchable>
                  );
                })}
              </View>

              <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.season')}</Text>
              <View style={styles.chipsContainerRow}>
                {SEASON_OPTIONS.map((season) => {
                  const isSelected = selectedSeason === season;
                  return (
                    <PremiumTouchable
                      key={season}
                      onPress={() => setSelectedSeason(season)}
                      style={[styles.categoricalChip, isSelected ? chipSelected : chipUnselected]}
                      disabled={isSaving}
                    >
                      <Text style={[styles.chipTextLabel, isSelected ? chipTextSelected : chipTextUnselected]}>{season}</Text>
                    </PremiumTouchable>
                  );
                })}
              </View>

              <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.materials')}</Text>
              <View style={[styles.textInputWrapperBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <TextInput
                  placeholder={t('clothing.addGarment.fields.materialsPlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                  style={[styles.formInputCore, { color: theme.colors.textPrimary }]}
                  value={materialsText}
                  onChangeText={setMaterialsText}
                  editable={!isSaving}
                />
              </View>

              <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.description')}</Text>
              <View style={[styles.textInputWrapperBox, styles.descriptionInputWrapperBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <TextInput
                  placeholder={t('clothing.addGarment.fields.descriptionPlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                  style={[styles.formInputCore, { color: theme.colors.textPrimary }]}
                  value={description}
                  onChangeText={setDescription}
                  editable={!isSaving}
                  multiline
                />
              </View>

              <Text style={[styles.fieldSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.fields.tags')}</Text>
              <View style={[styles.textInputWrapperBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <TextInput
                  placeholder={t('clothing.addGarment.fields.tagsPlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                  style={[styles.formInputCore, { color: theme.colors.textPrimary }]}
                  value={tagsText}
                  onChangeText={setTagsText}
                  editable={!isSaving}
                />
              </View>
            </>
          )}

          {/* Action Callout */}
          <PremiumTouchable
            onPress={handleFormSubmission}
            style={[
              styles.saveExecutionButton,
              { backgroundColor: theme.colors.accent, shadowColor: theme.colors.shadow },
              (isSaving || isRemovingBackground) && styles.saveExecutionDisabled
            ]}
            disabled={isSaving || isRemovingBackground}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.accentForeground} />
            ) : (
              <Text style={[styles.saveExecutionText, { color: theme.colors.accentForeground }]}>{t('clothing.addGarment.saveButton')}</Text>
            )}
          </PremiumTouchable>
        </ScrollView>
        </Animated.View>
      </SafeAreaView>

      {/* Cross-Platform Pure Layout Native Modal Overlay Component */}
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent
        onRequestClose={() => setIsPickerVisible(false)}
      >
        {/* Backdrop scrim stays fixed regardless of theme, matching PremiumModal's convention */}
        <View style={styles.modalBackdropOverlay}>
          <SafeAreaView style={styles.modalSafeBoundary} edges={['bottom']}>
            <View style={[styles.bottomSheetFrame, { backgroundColor: theme.colors.surfaceElevated, shadowColor: theme.colors.shadow }]}>
              <View style={[styles.bottomSheetDraggerBar, { backgroundColor: theme.colors.border }]} />

              {/* HEADER VIEW: Fixed Top */}
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeadingTitle, { color: theme.colors.textPrimary }]}>{t('clothing.addGarment.colorPicker.title')}</Text>
                <PremiumTouchable onPress={() => setIsPickerVisible(false)} style={styles.modalCloseTouchTarget}>
                  <Feather name="x" size={20} color={theme.colors.textSecondary} />
                </PremiumTouchable>
              </View>

              {/* CENTRAL SCROLL CONTENT: Dynamic midsection */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollBody}
                bounces={false}
              >
                {/* Real-time Tonal Preview */}
                <View style={[styles.livePreviewContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={[styles.livePreviewColorBlock, { backgroundColor: computedTempColor, borderColor: theme.colors.border }]} />
                  <View style={styles.livePreviewMetaBlock}>
                    <Text style={[styles.livePreviewLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.colorPicker.hexLabel')}</Text>
                    <Text style={[styles.livePreviewHexValue, { color: theme.colors.textPrimary }]}>{computedTempColor}</Text>
                  </View>
                </View>

                {/* 2D Brightness and Saturation Gradient Canvas Grid — picker chrome, colors are HSV-driven not theme-driven */}
                <Text style={[styles.pickerSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.colorPicker.saturationBrightness')}</Text>
                <View
                  style={[styles.canvasContainerFrame, { backgroundColor: theme.colors.border }]}
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
                <Text style={[styles.pickerSectionLabel, { color: theme.colors.textSecondary }]}>{t('clothing.addGarment.colorPicker.hueSpectrum')}</Text>
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
              <View style={[styles.modalActionButtonsRow, { borderColor: theme.colors.border }]}>
                <Pressable
                  onPress={() => setIsPickerVisible(false)}
                  style={[styles.modalSecondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                >
                  <Text style={[styles.modalSecondaryButtonText, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
                </Pressable>

                <Pressable
                  onPress={handleCustomColorConfirmation}
                  style={[styles.modalPrimaryButton, { backgroundColor: theme.colors.accent }]}
                >
                  <Text style={[styles.modalPrimaryButtonText, { color: theme.colors.accentForeground }]}>{t('clothing.addGarment.colorPicker.applyColor')}</Text>
                </Pressable>
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
  // Fixed white (not theme-dependent): once background removal succeeds this
  // shows a transparent PNG cutout, which needs its own opaque backdrop
  // regardless of the active theme (see remove-background).
  previewContainer: { flex: 1, position: 'relative', backgroundColor: '#FFFFFF' },
  previewImageRender: { width: '100%', height: '100%', resizeMode: 'cover' },
  clearMediaIndicator: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(28, 25, 23, 0.75)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  backgroundRemovalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28, 25, 23, 0.55)', justifyContent: 'center', alignItems: 'center', gap: 8 },
  backgroundRemovalOverlayText: { color: '#FAFAF9', fontSize: 13, fontWeight: '600' },
  textInputWrapperBox: { borderRadius: 12, height: 48, paddingHorizontal: 14, justifyContent: 'center' },
  descriptionInputWrapperBox: { height: 72, paddingVertical: 12 },
  formInputCore: { fontSize: 14 },
  aiAnalyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 12,
  },
  aiAnalyzeButtonText: { fontSize: 13, fontWeight: '600' },
  chipsContainerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoricalChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTextLabel: { fontSize: 13, fontWeight: '500' },
  swatchPaletteRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', paddingVertical: 4 },
  swatchCircleCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, marginBottom: 4 },
  saveExecutionButton: { height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  saveExecutionDisabled: { opacity: 0.7 },
  saveExecutionText: { fontSize: 15, fontWeight: '600' },
  blendIconShadow: { textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },

  // Standard-Compliant Modular Bottom Sheet Specifications
  modalBackdropOverlay: { flex: 1, backgroundColor: 'rgba(28, 25, 23, 0.4)', justifyContent: 'flex-end' },
  modalSafeBoundary: { width: '100%' },
  bottomSheetFrame: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    maxHeight: SCREEN_HEIGHT * 0.82,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8
  },
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
  livePreviewHexValue: { fontSize: 14, fontWeight: '700', marginTop: 2, fontFamily: 'monospace' },

  // Custom Gradient Canvas Grid Layouts
  canvasContainerFrame: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  canvasThumbCursor: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#FAFAF9', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },

  // Custom Slider Controls
  sliderTrackFrame: { width: '100%', height: 14, marginBottom: 20, justifyContent: 'center' },
  sliderGradientFill: { width: '100%', height: '100%', borderRadius: 7 },
  sliderThumbCursor: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FAFAF9', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },

  modalActionButtonsRow: { flexDirection: 'row', gap: 12, paddingTop: 14, borderTopWidth: 1, marginTop: 4 },
  modalSecondaryButton: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  modalSecondaryButtonText: { fontSize: 14, fontWeight: '600' },
  modalPrimaryButton: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalPrimaryButtonText: { fontSize: 14, fontWeight: '600' },
});
