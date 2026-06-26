import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';

// Supabase client instance integration
import { supabase } from '../../lib/supabase';

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

const OCCASIONS = [
  'Casual',
  'Formal',
  'Business Casual',
  'Night Out',
  'Sporty',
  'Vacation',
  'Special Event',
];

export default function CreateOutfitScreen() {
  const router = useRouter();
  const { mode, outfitId } = useLocalSearchParams<{ mode: string; outfitId: string }>();
  const isEditMode = mode === 'edit' && !!outfitId;

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
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successFadeAnim = useRef(new Animated.Value(0)).current;

  // Dedicated workflow to scrub inputs and runtime selection cache
  const resetFormState = useCallback(() => {
    setOutfitName('');
    setOccasion(null);
    setSelectedItems([]);
    setErrorMessage(null);
    setError(null);
  }, []);

  // Track error state transitions to fire smooth fade configurations
  useEffect(() => {
    if (errorMessage) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [errorMessage]);

  // Track success state transitions to fire smooth fade configurations
  useEffect(() => {
    if (successMessage) {
      Animated.timing(successFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      successFadeAnim.setValue(0);
    }
  }, [successMessage]);

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
              setError('No active credentials verified.');
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
              console.log(`[Outfit Edit Engine] Querying deep relations matching public.outfits.id = ${outfitId}`);
              
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
                console.log(`[Outfit Edit Engine] Hydrated details successfully for Lookbook ID: ${outfitId}`);
              }
            } catch (editFetchErr: any) {
              console.error('[Outfit Edit Engine Error] Query processing collapsed:', editFetchErr);
              setErrorMessage('Failed to pre-populate look profile configurations.');
            } finally {
              setIsOutfitLoading(false);
            }
          }
        } catch (err: any) {
          console.error('[Outfit Form Matrix Failure]:', err);
          if (isActive) {
            setError(err.message || 'An unhandled exception blocked layout parsing profiles.');
          }
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchInitialDataFlow();

      return () => {
        isActive = false;
      };
    }, [isEditMode, outfitId])
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1) Outfit name verification block
    const sanitizedName = outfitName.trim();
    if (!sanitizedName) {
      setErrorMessage('Please enter a name for your outfit.');
      return;
    }

    // 2) Capsule collection requirement assessment logic
    const hasTop = selectedItems.some((item) => item.category === 'Tops');
    const hasBottom = selectedItems.some((item) => item.category === 'Bottoms');
    const hasShoes = selectedItems.some((item) => item.category === 'Shoes');

    if (!hasTop || !hasBottom || !hasShoes) {
      setErrorMessage('Your outfit must include at least 1 top, 1 bottom, and 1 pair of shoes.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setErrorMessage('Session trace expired. Re-authenticate client endpoints.');
        return;
      }

      let activeOutfitId = outfitId;

      if (isEditMode) {
        console.log(`[Outfit Commit Mode: EDIT] Patching core public.outfits schema where ID = ${activeOutfitId}`);
        
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
          .eq('outfit_id', activeOutfitId);

        if (relationalPurgeErr) throw relationalPurgeErr;

      } else {
        console.log('[Outfit Commit Mode: CREATE] Generating root public.outfits database transaction sequence');
        
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

      setSuccessMessage(isEditMode ? 'Outfit modifications stored successfully.' : 'Outfit curated into lookbook.');
      
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
      setErrorMessage(err.message || 'Critical pipeline exception blocked persistence engines.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isOutfitLoading) {
    return (
      <PremiumScreen>
        <View style={styles.centeredLoadingFrame}>
          <PremiumLoader label={isOutfitLoading ? "Syncing look configurations..." : "Assembling curated wardrobe matrixes..."} />
        </View>
      </PremiumScreen>
    );
  }

  if (error) {
    return (
      <PremiumScreen>
        <View style={styles.centeredLoadingFrame}>
          <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errorHeaderTypography}>Operational Disruption</Text>
          <Text style={styles.errorSubTypography}>{error}</Text>
        </View>
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      <ScrollView contentContainerStyle={styles.scrollCanvasContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.formHeaderSection}>
          <SectionHeader 
            title={isEditMode ? "Edit Outfit" : "Curate Outfit"}
            style={styles.headerFlexLayoutReset}
          />
          <Text style={styles.formSubtitleTypography}>
            {isEditMode 
              ? "Refine your look and update its pieces" 
              : "Weave individual collection items into structured stylistic coordinates"
            }
          </Text>
        </View>

        {/* Dynamic Display Layer: Animated Interactive Context Messages */}
        {errorMessage && (
          <Animated.View style={[styles.inlineFeedbackBannerFrameError, { opacity: fadeAnim }]}>
            <MaterialCommunityIcons name="alert-rhombus-outline" size={16} color="#DC2626" />
            <Text style={styles.inlineFeedbackBannerTypographyError}>{errorMessage}</Text>
          </Animated.View>
        )}

        {successMessage && (
          <Animated.View style={[styles.inlineFeedbackBannerFrameSuccess, { opacity: successFadeAnim }]}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#15803D" />
            <Text style={styles.inlineFeedbackBannerTypographySuccess}>{successMessage}</Text>
          </Animated.View>
        )}

        {/* Input Block Core Parameters */}
        <View style={styles.cardInputBlockWrapper}>
          <PremiumCard style={styles.interactiveDataCardElement}>
            <Text style={styles.inputTitleContextLabel}>Designation Identity Name</Text>
            <TextInput
              style={styles.premiumFormInputFieldString}
              placeholder={isEditMode ? "e.g., Summer Yacht Silhouette (Updated)" : "e.g., Minimalist Monochrome Autumn"}
              placeholderTextColor="#A8A29E"
              value={outfitName}
              onChangeText={setOutfitName}
              maxLength={50}
            />

            <Text style={styles.inputTitleContextLabelSpacerOverride}>Target Occasion Context Setting</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipsViewportSpacing}>
              {OCCASIONS.map((occ) => {
                const isSelected = occasion === occ;
                return (
                  <PremiumTouchable
                    key={occ}
                    style={isSelected ? styles.chipNodeElementActive : styles.chipNodeElementInactive}
                    onPress={() => setOccasion(isSelected ? null : occ)}
                  >
                    <Text style={isSelected ? styles.chipTypographyActive : styles.chipTypographyInactive}>
                      {occ}
                    </Text>
                  </PremiumTouchable>
                );
              })}
            </ScrollView>
          </PremiumCard>
        </View>

        {/* Outfit Canvas Assembly Stage View */}
        <View style={styles.architecturalContentSection}>
          <View style={styles.inlineHeaderTitleSection}>
            <SectionTitle>Composition Grid Canvas</SectionTitle>
            <View style={styles.countBadgeNode}>
              <Text style={styles.countBadgeText}>{selectedItems.length} Layered</Text>
            </View>
          </View>
          
          <View style={styles.outfitCanvasPreviewStageFrame}>
            {selectedItems.length === 0 ? (
              <View style={styles.emptyCanvasCenterFrameFallback}>
                <MaterialCommunityIcons name="layers-triple-outline" size={32} color="#A8A29E" />
                <Text style={styles.emptyCanvasTypographyFallback}>
                  Select individual wardrobe cards below to construct combination lines.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.canvasItemsRowSpacedLayout}>
                {selectedItems.map((item) => (
                  <PremiumTouchable key={item.id} style={styles.canvasAssetWrapperCircle} onPress={() => toggleGarmentSelection(item)}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.canvasTargetAssetImageSquare} />
                    ) : (
                      <View style={styles.canvasFallbackAssetCenterFrame}>
                        <MaterialCommunityIcons name="hanger" size={18} color="#78716C" />
                      </View>
                    )}
                    <View style={styles.removeAssetIndicatorBadgeMini}>
                      <Ionicons name="close" size={10} color="#FFFFFF" />
                    </View>
                  </PremiumTouchable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Grid Selector Core Relational Node Rows Grouped by Category */}
        <View style={styles.architecturalContentSectionSpacerOverride}>
          <SectionTitle withBottomMargin>Available Wardrobe Pieces</SectionTitle>
          
          {groupedGarments.length === 0 ? (
            <View style={styles.emptyStateContainerBox}>
              <MaterialCommunityIcons name="hanger" size={36} color="#78716C" />
              <Text style={styles.emptyStatePrimaryText}>Wardrobe Catalog Empty</Text>
              <Text style={styles.emptyStateSecondaryText}>Add single clothing entries to generate look configurations.</Text>
            </View>
          ) : (
            groupedGarments.map((section) => (
              <View key={section.title} style={styles.categorySubdivisionContainerBlock}>
                <Text style={styles.categorySubdivisionSectionHeaderTitleText}>{section.title}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryHorizontalSwiperViewportSpacing}>
                  {section.data.map((item) => {
                    const isSelected = selectedItems.some((selected) => selected.id === item.id);
                    return (
                      <PremiumTouchable
                        key={item.id}
                        style={[styles.garmentSwiperMagazineCard, isSelected && styles.garmentSwiperMagazineCardActive]}
                        onPress={() => toggleGarmentSelection(item)}
                      >
                        <View style={styles.garmentSwiperImageContainerBoundingBox}>
                          {item.image_url ? (
                            <Image source={{ uri: item.image_url }} style={styles.garmentSwiperCardTargetImage} />
                          ) : (
                            <View style={styles.garmentSwiperFallbackAssetCenterFrame}>
                              <MaterialCommunityIcons name="hanger" size={20} color="#A8A29E" />
                            </View>
                          )}
                          {isSelected && (
                            <View style={styles.selectionCheckmarkScrimOverlayMask}>
                              <Ionicons name="checkmark-circle" size={24} color="#1C1917" />
                            </View>
                          )}
                        </View>
                        <View style={styles.garmentSwiperMetaFooterBlockText}>
                          <Text style={styles.garmentSwiperLabelBrandHeader} numberOfLines={1}>
                            {item.brand || 'UNBRANDED'}
                          </Text>
                          <Text style={styles.garmentSwiperLabelNameSubscript} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                      </PremiumTouchable>
                    );
                  })}
                </ScrollView>
              </View>
            ))
          )}
        </View>

        {/* Submission Control Action Block Node */}
        <View style={styles.submissionTerminalBlockActionSection}>
          <PremiumTouchable
            disabled={isSaving}
            style={styles.submissionTerminalTriggerButtonPrimary}
            onPress={handleSaveOutfitWorkflow}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FAFAF9" />
            ) : (
              <Text style={styles.submissionTerminalTriggerLabelTextString}>
                {isEditMode ? "Commit Structural Updates" : "Register Combination Look"}
              </Text>
            )}
          </PremiumTouchable>
        </View>

      </ScrollView>
    </PremiumScreen>
  );
}

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
    color: '#1C1917',
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 4,
  },
  errorSubTypography: {
    fontSize: 13,
    color: '#78716C',
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
    color: '#78716C',
    lineHeight: 18,
    fontWeight: '400',
  },
  inlineFeedbackBannerFrameError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  inlineFeedbackBannerTypographyError: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  inlineFeedbackBannerFrameSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  inlineFeedbackBannerTypographySuccess: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '500',
    flex: 1,
  },
  cardInputBlockWrapper: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  interactiveDataCardElement: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  inputTitleContextLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputTitleContextLabelSpacerOverride: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
  },
  premiumFormInputFieldString: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1C1917',
    backgroundColor: '#FAFAF9',
  },
  horizontalChipsViewportSpacing: {
    gap: 8,
    paddingVertical: 2,
  },
  chipNodeElementInactive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  chipNodeElementActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1917',
    borderWidth: 1,
    borderColor: '#1C1917',
  },
  chipTypographyInactive: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78716C',
  },
  chipTypographyActive: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FAFAF9',
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
    backgroundColor: '#F5F5F4',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },
  outfitCanvasPreviewStageFrame: {
    minHeight: 112,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 16,
    justifyContent: 'center',
    shadowColor: '#000000',
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
    color: '#A8A29E',
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
    backgroundColor: '#F5F5F4',
    borderWidth: 1,
    borderColor: '#E7E5E4',
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
    backgroundColor: '#1C1917',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  emptyStateContainerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 32,
    alignItems: 'center',
    marginRight: 16,
  },
  emptyStatePrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1917',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyStateSecondaryText: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 16,
  },
  categorySubdivisionContainerBlock: {
    marginBottom: 20,
  },
  categorySubdivisionSectionHeaderTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#44403C',
    marginBottom: 10,
  },
  categoryHorizontalSwiperViewportSpacing: {
    gap: 12,
    paddingRight: 16,
  },
  garmentSwiperMagazineCard: {
    width: width * 0.3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  garmentSwiperMagazineCardActive: {
    borderColor: '#1C1917',
    borderWidth: 1.5,
  },
  garmentSwiperImageContainerBoundingBox: {
    width: '100%',
    height: width * 0.3 * 1.2,
    backgroundColor: '#F5F5F4',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentSwiperMetaFooterBlockText: {
    padding: 8,
  },
  garmentSwiperLabelBrandHeader: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  garmentSwiperLabelNameSubscript: {
    fontSize: 11,
    color: '#44403C',
    fontWeight: '400',
  },
  submissionTerminalBlockActionSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  submissionTerminalTriggerButtonPrimary: {
    height: 48,
    backgroundColor: '#1C1917',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  submissionTerminalTriggerLabelTextString: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAF9',
  },
});