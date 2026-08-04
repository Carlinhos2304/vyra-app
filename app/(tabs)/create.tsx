import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  Platform,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeInUp,
  FadeOutDown,
  Layout,
  ZoomIn,
  ZoomOut,
  SlideInRight,
  SlideOutRight,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme';
import { useLanguage } from '../../i18n';

// Supabase client instance integration
import { supabase } from '../../lib/supabase';
import { OUTFIT_OCCASIONS } from '../../constants/garmentTaxonomy';

// Enable layout animations natively for Android target instances
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const CANVAS_ITEM_SIZE = 76;

// Strong Typing Strategy for Database Wardrobe Entities
interface Garment {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  category: string;
  color: string | null;
  image_url: string | null;
  is_favorite: boolean;
  ai_description?: string | null;
  tags?: string[] | null;
}

const CATEGORY_ORDER = [
  'Bottoms',
  'Tops',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
  'Jewelry',
  'Hats',
  'Swimwear',
  'Activewear',
];

// OCCASIONS now comes from constants/garmentTaxonomy.ts (OUTFIT_OCCASIONS) —
// single source of truth also consumed by the generate-outfit Edge Function,
// so AI-generated outfits and manually-created ones use the same occasion
// vocabulary that's already stored in real `outfits.occasion` rows.
const OCCASIONS = OUTFIT_OCCASIONS;

export default function CreateOutfitScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { mode, outfitId } = useLocalSearchParams<{ mode: string; outfitId: string }>();
  const isEditMode = mode === 'edit' && !!outfitId;

  // Animation Hooks
  const saveButtonScale = useSharedValue(1);

  const [outfitName, setOutfitName] = useState('');
  const [occasion, setOccasion] = useState<string | null>(null);

  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedItems, setSelectedItems] = useState<Garment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOutfitLoading, setIsOutfitLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Inline Premium Feedback Banner States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Animate the Save button on press
  const saveButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveButtonScale.value }],
  }));

  // Dedicated workflow to scrub inputs and runtime selection cache
  const resetFormState = useCallback(() => {
    setOutfitName('');
    setOccasion(null);
    setSelectedItems([]);
    setErrorMessage(null);
    setError(null);
  }, []);

  // Dismiss error and success banners automatically when user modifies parameters
  useEffect(() => {
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);
  }, [outfitName, selectedItems]);

  // Dual-mode integration logic pipeline
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchInitialDataFlow = async () => {
        try {
          if (isActive) setIsLoading(true);
          setError(null);

          // 1. Resolve Secure Context Profile
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            console.error('[Outfit Form Error] User token evaluation failed:', authError);
            if (isActive) {
              setError(t('tabs.create.noCredentials'));
              setIsLoading(false);
            }
            return;
          }

          // 2. Load Worldwide Catalogued Items Block
          const { data: clothingData, error: queryError } = await supabase
            .from('clothing_items')
            .select('*')
            .eq('user_id', user.id);

          if (queryError) throw queryError;
          if (isActive) setGarments(clothingData || []);

          // 3. Conditional Graph Node Pull: Edit Mode Sequence Pre-load
          if (isEditMode && isActive) {
            try {
              setIsOutfitLoading(true);

              const { data: currentOutfit, error: outfitErr } = await supabase
                .from('outfits')
                .select(`
                  id,
                  name,
                  occasion,
                  outfit_items (
                    clothing_items (
                      id,
                      user_id,
                      name,
                      brand,
                      category,
                      color,
                      image_url,
                      is_favorite,
                      ai_description,
                      tags
                    )
                  )
                `)
                .eq('id', outfitId)
                .single();

              if (outfitErr) throw outfitErr;

              if (currentOutfit) {
                setOutfitName(currentOutfit.name || '');
                setOccasion(currentOutfit.occasion);

                const rawJunctionItems = currentOutfit.outfit_items || [];
                const deepParsedGarments: Garment[] = rawJunctionItems
                  .map((junction: any) => junction.clothing_items)
                  .filter(Boolean);

                setSelectedItems(deepParsedGarments);
              }
            } catch (editFetchErr: any) {
              console.error('[Outfit Edit Engine Error] Query processing collapsed:', editFetchErr);
              setErrorMessage(t('tabs.create.prepopulateFailed'));
            } finally {
              setIsOutfitLoading(false);
            }
          } else if (!isEditMode && isActive) {
            // Clean slate configuration check if swapping context directly from edit to setup
            resetFormState();
          }
        } catch (err: any) {
          console.error('[Outfit Form Matrix Failure]:', err);
          if (isActive) {
            setError(err.message || t('tabs.create.unhandledException'));
          }
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchInitialDataFlow();
      return () => {
        isActive = false;
      };
    }, [isEditMode, outfitId, resetFormState])
  );

  // Grouped and sorted structure initialization preferred layout matrixes
  const groupedGarments = useMemo(() => {
    const groups: { [key: string]: Garment[] } = {};
    garments.forEach((item) => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    const orderedSections: { title: string; data: Garment[] }[] = [];

    CATEGORY_ORDER.forEach((catName) => {
      if (groups[catName] && groups[catName].length > 0) {
        orderedSections.push({ title: catName, data: groups[catName] });
        delete groups[catName];
      }
    });

    Object.keys(groups).forEach((catName) => {
      if (groups[catName].length > 0) {
        orderedSections.push({ title: catName, data: groups[catName] });
      }
    });

    return orderedSections;
  }, [garments]);

  const toggleGarmentSelection = (item: Garment) => {
    setSelectedItems((current) => {
      const isAlreadySelected = current.some((selected) => selected.id === item.id);
      if (isAlreadySelected) {
        return current.filter((selected) => selected.id !== item.id);
      } else {
        return [...current, item];
      }
    });
  };

  const handleSaveOutfitWorkflow = async () => {
    if (isSaving) return;

    // Trigger button animation
    saveButtonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    setErrorMessage(null);
    setSuccessMessage(null);

    // 1) Outfit name verification block
    const sanitizedName = outfitName.trim();
    if (!sanitizedName) {
      setErrorMessage(t('tabs.create.nameRequired'));
      return;
    }

    // 2) Capsule collection requirement assessment logic
    const hasTop = selectedItems.some((item) => item.category === 'Tops');
    const hasBottom = selectedItems.some((item) => item.category === 'Bottoms');
    const hasShoes = selectedItems.some((item) => item.category === 'Shoes');

    if (!hasTop || !hasBottom || !hasShoes) {
      setErrorMessage(t('tabs.create.missingPieces'));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setErrorMessage(t('tabs.create.sessionExpired'));
        return;
      }

      let activeOutfitId = outfitId;

      if (isEditMode) {
        // Step 1: Patch parent record parameters
        const { error: outfitUpdateErr } = await supabase
          .from('outfits')
          .update({
            name: sanitizedName,
            occasion: occasion,
          })
          .eq('id', activeOutfitId);

        if (outfitUpdateErr) throw outfitUpdateErr;

        // Step 2: Clear historical children relational intersections
        const { error: relationalPurgeErr } = await supabase
          .from('outfit_items')
          .delete()
          .eq('outfit_id', activeOutfitId)
          .select(); // Added .select() to ensure execution block commits

        if (relationalPurgeErr) throw relationalPurgeErr;

      } else {
        const { data: newOutfit, error: outfitCreateErr } = await supabase
          .from('outfits')
          .insert({
            user_id: user.id,
            name: sanitizedName,
            occasion: occasion,
          })
          .select('id')
          .single();

        if (outfitCreateErr) throw outfitCreateErr;
        activeOutfitId = newOutfit.id;
      }

      // Step 3: Insert look composition grid entries mapping public relational indices keys
      if (selectedItems.length > 0 && activeOutfitId) {
        const payloadJunctionRows = selectedItems.map((item) => ({
          outfit_id: activeOutfitId,
          clothing_item_id: item.id,
        }));

        const { error: junctionInsertErr } = await supabase
          .from('outfit_items')
          .insert(payloadJunctionRows);

        if (junctionInsertErr) throw junctionInsertErr;
      }

      setSuccessMessage(isEditMode ? t('tabs.create.updatedSuccess') : t('tabs.create.createdSuccess'));

      setTimeout(() => {
        if (isEditMode) {
          router.back();
        } else {
          resetFormState();
          router.replace('/closet');
        }
      }, 1200);

    } catch (err: any) {
      console.error('[Form Execution Pipeline Aborted Exception]:', err);
      setErrorMessage(err.message || t('tabs.create.criticalException'));
    } finally {
      setIsSaving(false);
    }
  };

  // Soft-tinted banner colors: computed from the status tokens rather than
  // their own global tokens, since this alert-banner treatment is a
  // one-off composite (base color + tinted background + tinted border),
  // not a cross-cutting page-chrome color like text/surface/border.
  const dangerBannerBg = theme.dark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2';
  const dangerBannerBorder = theme.dark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2';
  const successBannerBg = theme.dark ? 'rgba(74, 222, 128, 0.15)' : '#F0FDF4';
  const successBannerBorder = theme.dark ? 'rgba(74, 222, 128, 0.35)' : '#DCFCE7';

  if (isLoading || isOutfitLoading) {
    return (
      <PremiumScreen>
        <View style={styles.centeredLoadingFrame}>
          <PremiumLoader label={isOutfitLoading ? t('tabs.create.syncingLook') : t('tabs.create.assemblingWardrobe')} />
        </View>
      </PremiumScreen>
    );
  }

  if (error) {
    return (
      <PremiumScreen>
        <View style={styles.centeredLoadingFrame}>
          <MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.colors.danger} />
          <Text style={[styles.errorHeaderTypography, { color: theme.colors.textPrimary }]}>{t('tabs.create.errorTitle')}</Text>
          <Text style={[styles.errorSubTypography, { color: theme.colors.textSecondary }]}>{error}</Text>
        </View>
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      <ScrollView contentContainerStyle={styles.scrollCanvasContainer} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInUp.duration(600).springify()} style={styles.formHeaderSection}>
          <SectionHeader
            title={isEditMode ? t('tabs.create.editTitle') : t('tabs.create.createTitle')}
            style={styles.headerFlexLayoutReset}
          />
          <Text style={[styles.formSubtitleTypography, { color: theme.colors.textSecondary }]}>
            {isEditMode
              ? t('tabs.create.editSubtitle')
              : t('tabs.create.createSubtitle')
            }
          </Text>
        </Animated.View>

        {/* Dynamic Display Layer: Animated Interactive Context Messages */}
        {errorMessage && (
          <Animated.View entering={SlideInRight.springify()} exiting={SlideOutRight} style={[styles.inlineFeedbackBannerFrame, { backgroundColor: dangerBannerBg, borderColor: dangerBannerBorder }]}>
            <MaterialCommunityIcons name="alert-rhombus-outline" size={16} color={theme.colors.danger} />
            <Text style={[styles.inlineFeedbackBannerTypography, { color: theme.colors.danger }]}>{errorMessage}</Text>
          </Animated.View>
        )}

        {successMessage && (
          <Animated.View entering={SlideInRight.springify()} exiting={SlideOutRight} style={[styles.inlineFeedbackBannerFrame, { backgroundColor: successBannerBg, borderColor: successBannerBorder }]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />
            <Text style={[styles.inlineFeedbackBannerTypography, { color: theme.colors.success }]}>{successMessage}</Text>
          </Animated.View>
        )}

        {/* Input Block Core Parameters */}
        <Animated.View entering={FadeInUp.delay(100).duration(600).springify()} style={styles.cardInputBlockWrapper}>
          <PremiumCard style={styles.interactiveDataCardElement}>
            <Text style={[styles.inputTitleContextLabel, { color: theme.colors.textSecondary }]}>{t('tabs.create.nameLabel')}</Text>
            <TextInput
              style={[styles.premiumFormInputFieldString, { borderColor: theme.colors.border, color: theme.colors.textPrimary, backgroundColor: theme.colors.background }]}
              placeholder={isEditMode ? t('tabs.create.namePlaceholderEdit') : t('tabs.create.namePlaceholderNew')}
              placeholderTextColor={theme.colors.textTertiary}
              value={outfitName}
              onChangeText={setOutfitName}
              maxLength={50}
            />

            <Text style={[styles.inputTitleContextLabelSpacerOverride, { color: theme.colors.textSecondary }]}>{t('tabs.create.occasionLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipsViewportSpacing}>
              {OCCASIONS.map((occ) => {
                const isSelected = occasion === occ;
                return (
                  <OccasionChip key={occ} label={occ} isSelected={isSelected} onPress={() => setOccasion(isSelected ? null : occ)} />
                );
              })}
            </ScrollView>
          </PremiumCard>
        </Animated.View>

        {/* Outfit Canvas Assembly Stage View */}
        <Animated.View entering={FadeInUp.delay(200).duration(600).springify()} style={styles.architecturalContentSection}>
          <View style={styles.inlineHeaderTitleSection}>
            <SectionTitle>{t('tabs.create.canvasTitle')}</SectionTitle>
            <Animated.View style={[styles.countBadgeNode, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]} layout={Layout.springify()}>
              <Text style={[styles.countBadgeText, { color: theme.colors.textSecondary }]}>{t('tabs.create.layeredCount', { count: selectedItems.length })}</Text>
            </Animated.View>
          </View>

          <View style={[styles.outfitCanvasPreviewStageFrame, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            {selectedItems.length === 0 ? (
              <View style={styles.emptyCanvasCenterFrameFallback}>
                <MaterialCommunityIcons name="layers-triple-outline" size={32} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyCanvasTypographyFallback, { color: theme.colors.textTertiary }]}>
                  {t('tabs.create.canvasEmptyHint')}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.canvasItemsRowSpacedLayout}>
                {selectedItems.map((item, index) => (
                  <Animated.View key={`${item.id}-${index}`} entering={ZoomIn.springify()} exiting={ZoomOut} layout={Layout.springify()}>
                    <PremiumTouchable
                      style={[styles.canvasAssetWrapperCircle, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}
                      onPress={() => toggleGarmentSelection(item)}
                    >
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.canvasTargetAssetImageSquare} />
                      ) : (
                        <View style={styles.canvasFallbackAssetCenterFrame}>
                          <MaterialCommunityIcons name="hanger" size={18} color={theme.colors.textSecondary} />
                        </View>
                      )}
                      <View style={[styles.removeAssetIndicatorBadgeMini, { backgroundColor: theme.colors.accent, borderColor: theme.colors.surface }]}>
                        <Ionicons name="close" size={10} color={theme.colors.accentForeground} />
                      </View>
                    </PremiumTouchable>
                  </Animated.View>
                ))}
              </ScrollView>
            )}
          </View>
        </Animated.View>

        {/* Grid Selector Core Relational Node Rows Grouped by Category */}
        <Animated.View entering={FadeInUp.delay(300).duration(600).springify()} style={styles.architecturalContentSectionSpacerOverride}>
          <SectionTitle withBottomMargin>{t('tabs.create.availablePiecesTitle')}</SectionTitle>

          {groupedGarments.length === 0 ? (
            <View style={[styles.emptyStateContainerBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <MaterialCommunityIcons name="hanger" size={36} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStatePrimaryText, { color: theme.colors.textPrimary }]}>{t('tabs.create.catalogEmptyTitle')}</Text>
              <Text style={[styles.emptyStateSecondaryText, { color: theme.colors.textSecondary }]}>{t('tabs.create.catalogEmptySubtitle')}</Text>
            </View>
          ) : (
            groupedGarments.map((section) => (
              <View key={section.title} style={styles.categorySubdivisionContainerBlock}>
                <Text style={[styles.categorySubdivisionSectionHeaderTitleText, { color: theme.colors.textPrimary }]}>{section.title}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryHorizontalSwiperViewportSpacing}>
                  {section.data.map((item) => {
                    const isSelected = selectedItems.some((selected) => selected.id === item.id);
                    return (
                      <GarmentCard key={item.id} item={item} isSelected={isSelected} onPress={() => toggleGarmentSelection(item)} />
                    );
                  })}
                </ScrollView>
              </View>
            ))
          )}
        </Animated.View>

        {/* Submission Control Action Block Node */}
        <View style={styles.submissionTerminalBlockActionSection}>
          <Animated.View style={saveButtonStyle}>
            <PremiumTouchable
              disabled={isSaving}
              style={[styles.submissionTerminalTriggerButtonPrimary, { backgroundColor: theme.colors.accent, shadowColor: theme.colors.shadow }]}
              onPress={handleSaveOutfitWorkflow}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.accentForeground} />
              ) : (
                <Text style={[styles.submissionTerminalTriggerLabelTextString, { color: theme.colors.accentForeground }]}>
                  {isEditMode ? t('tabs.create.saveChanges') : t('tabs.create.createOutfitButton')}
                </Text>
              )}
            </PremiumTouchable>
          </Animated.View>
        </View>

      </ScrollView>
    </PremiumScreen>
  );
}

// Sub-components for better animation control

const OccasionChip = ({ label, isSelected, onPress }: { label: string, isSelected: boolean, onPress: () => void }) => {
  const { theme } = useTheme();
  return (
    <PremiumTouchable
      style={[
        styles.chipNodeElement,
        isSelected
          ? { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
          : { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
      ]}
      onPress={onPress}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: isSelected ? theme.colors.accentForeground : theme.colors.textSecondary }}>
        {label}
      </Text>
    </PremiumTouchable>
  );
};

const GarmentCard = ({ item, isSelected, onPress }: { item: Garment, isSelected: boolean, onPress: () => void }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { scale.value = withSpring(0.95); };
  const handlePressOut = () => { scale.value = withSpring(1); };

  return (
    <Animated.View style={animatedStyle}>
      <PremiumTouchable
        style={[
          styles.garmentSwiperMagazineCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          isSelected && { borderColor: theme.colors.accent, borderWidth: 1.5 },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[styles.garmentSwiperImageContainerBoundingBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.garmentSwiperCardTargetImage} />
          ) : (
            <View style={styles.garmentSwiperFallbackAssetCenterFrame}>
              <MaterialCommunityIcons name="hanger" size={20} color={theme.colors.textTertiary} />
            </View>
          )}
          {isSelected && (
            <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)} style={[styles.selectionCheckmarkScrimOverlayMask, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.4)' : 'rgba(255, 255, 255, 0.4)' }]}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
            </Animated.View>
          )}
        </View>
        <View style={styles.garmentSwiperMetaFooterBlockText}>
          <Text style={[styles.garmentSwiperLabelBrandHeader, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {item.brand || t('tabs.create.unbrandedFallback')}
          </Text>
          <Text style={[styles.garmentSwiperLabelNameSubscript, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      </PremiumTouchable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  scrollCanvasContainer: {
    paddingBottom: 64,
  },
  centeredLoadingFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorHeaderTypography: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 4,
  },
  errorSubTypography: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  formHeaderSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  headerFlexLayoutReset: {
    paddingVertical: 0,
    marginBottom: 6,
  },
  formSubtitleTypography: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  inlineFeedbackBannerFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  inlineFeedbackBannerTypography: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  cardInputBlockWrapper: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  interactiveDataCardElement: {
    padding: 16,
  },
  inputTitleContextLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputTitleContextLabelSpacerOverride: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
  },
  premiumFormInputFieldString: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  horizontalChipsViewportSpacing: {
    gap: 8,
    paddingVertical: 2,
  },
  chipNodeElement: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  architecturalContentSection: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  architecturalContentSectionSpacerOverride: {
    paddingLeft: 16,
    marginBottom: 28,
  },
  inlineHeaderTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  countBadgeNode: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  outfitCanvasPreviewStageFrame: {
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyCanvasCenterFrameFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyCanvasTypographyFallback: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 6,
  },
  canvasItemsRowSpacedLayout: {
    gap: 14,
    alignItems: 'center',
  },
  canvasAssetWrapperCircle: {
    width: CANVAS_ITEM_SIZE,
    height: CANVAS_ITEM_SIZE,
    borderRadius: CANVAS_ITEM_SIZE / 2,
    borderWidth: 1,
    position: 'relative',
    overflow: 'visible',
  },
  canvasTargetAssetImageSquare: {
    width: '100%',
    height: '100%',
    borderRadius: CANVAS_ITEM_SIZE / 2,
    resizeMode: 'cover',
  },
  canvasFallbackAssetCenterFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAssetIndicatorBadgeMini: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  emptyStateContainerBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginRight: 16,
  },
  emptyStatePrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyStateSecondaryText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  categorySubdivisionContainerBlock: {
    marginBottom: 20,
  },
  categorySubdivisionSectionHeaderTitleText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  categoryHorizontalSwiperViewportSpacing: {
    gap: 12,
    paddingRight: 16,
  },
  garmentSwiperMagazineCard: {
    width: width * 0.3,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  garmentSwiperImageContainerBoundingBox: {
    width: '100%',
    height: width * 0.3 * 1.2,
    position: 'relative',
  },
  garmentSwiperCardTargetImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  garmentSwiperFallbackAssetCenterFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheckmarkScrimOverlayMask: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentSwiperMetaFooterBlockText: {
    padding: 8,
  },
  garmentSwiperLabelBrandHeader: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  garmentSwiperLabelNameSubscript: {
    fontSize: 11,
    fontWeight: '400',
  },
  submissionTerminalBlockActionSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  submissionTerminalTriggerButtonPrimary: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  submissionTerminalTriggerLabelTextString: {
    fontSize: 14,
    fontWeight: '600',
  },
});
