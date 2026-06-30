import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionTitle } from '../../components/ui/SectionTitle';

// Supabase client instance integration
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const HERO_IMAGE_HEIGHT = width * 1.25; // 4:5 Portrait golden fashion ratio
const GARMENT_CARD_WIDTH = width * 0.42;

interface Garment {
  id: string;
  name: string;
  brand: string;
  category: string;
  image_url: string | null;
}

interface OutfitDetail {
  id: string;
  name: string;
  occasion: string | null;
  created_at: string;
  coverImage: string | null;
  garments: Garment[];
}

export default function OutfitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [outfit, setOutfit] = useState<OutfitDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Secure Relational Core Single Query Fetch Engine
  const fetchOutfitExtendedDetails = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      console.log(`[Outfit Detail Pipeline] Fetching extended graph mapping for Outfit UUID: ${id}`);

      // Single-trip execution pulling parent attributes combined with child table inner rows
      const { data, error: queryErr } = await supabase
        .from('outfits')
        .select(`
          id,
          name,
          occasion,
          created_at,
          outfit_items (
            clothing_items (
              id,
              name,
              brand,
              category,
              image_url
            )
          )
        `)
        .eq('id', id)
        .single();

      if (queryErr) {
        console.error('[Outfit Detail Error] Supabase execution collapsed:', queryErr);
        throw queryErr;
      }

      if (!data) {
        setOutfit(null);
        return;
      }

      // Unpack nested response and parse securely into the clean domain target interface structure
      const rawItems = data.outfit_items || [];
      const parsedGarments: Garment[] = rawItems
        .map((junction: any) => junction.clothing_items)
        .filter(Boolean);

      // Rule: Set cover image as first available piece image path array string
      const resolvedCoverImage = parsedGarments.length > 0 ? parsedGarments[0].image_url : null;

      const formattedDetail: OutfitDetail = {
        id: data.id,
        name: data.name,
        occasion: data.occasion,
        created_at: data.created_at,
        coverImage: resolvedCoverImage,
        garments: parsedGarments,
      };

      setOutfit(formattedDetail);
    } catch (err: any) {
      console.error('[Outfit Detail Error Exception]:', err);
      setError(err.message || 'An unhandled exception blocked outfit sync parsing profiles.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOutfitExtendedDetails();
    }, [id])
  );

  // Filter and deduplicate nested children parameters natively at client calculation level
  const uniqueGarments = useMemo(() => {
    if (!outfit?.garments) return [];
    return Array.from(
      new Map(outfit.garments.map((item) => [item.id, item])).values()
    );
  }, [outfit?.garments]);

  console.log('[Outfit Detail Debug] Pipeline parsed data successfully:', {
    name: outfit?.name || 'Empty',
    itemsCount: uniqueGarments.length,
  });

  // Business Logic Interaction Methods
  const handleShareLookbookOutfit = async () => {
    if (!outfit) return;
    try {
      console.log('[Outfit Action] Spawning device default system share layer sheets...');
      const summaryText = `Check out my look "${outfit.name}" on Vyra. A curated mix of ${uniqueGarments.length} wardrobe pieces tailored for ${outfit.occasion || 'any setting'}.`;
      await Share.share({ message: summaryText });
    } catch (err) {
      console.error('[Outfit Share Error Alert]', err);
    }
  };

  const handleDeleteOutfitConfirmation = () => {
    if (!outfit) return;
    
    Alert.alert(
      'Deconstruct Outfit',
      'Are you sure you want to permanently delete this lookbook combination? This won\'t remove your individual garments.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              console.log(`[Outfit Delete Workflow] Purging records attached to ID: ${outfit.id}`);
              
              // Cascade Execution Step A: Erase junction entries linked to the Lookbook identity 
              const { error: cascadeError } = await supabase
                .from('outfit_items')
                .delete()
                .eq('outfit_id', outfit.id)
                .select(); // Added .select() to ensure execution block commits

              if (cascadeError) {
                console.error('[Outfit Delete Failure] Error generated running Cascade Row Purge:', cascadeError);
                throw cascadeError;
              }

              // Cascade Execution Step B: Clear parent identity footprint completely 
              const { error: deleteError } = await supabase
                .from('outfits')
                .delete()
                .eq('id', outfit.id);

              if (deleteError) {
                console.error('[Outfit Delete Failure] Error generated wiping Parent Table Node:', deleteError);
                throw deleteError;
              }

              console.log('[Outfit Delete Workflow] Successfully wiped record elements across nodes.');
              router.replace('/closet');
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'An operational error dropped execution tasks.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <PremiumScreen>
        <View style={styles.centeredStateShell}>
          <ActivityIndicator size="small" color="#1C1917" />
          <Text style={styles.stateSubtitleTypography}>Retrieving Lookbook Matrix...</Text>
        </View>
      </PremiumScreen>
    );
  }

  if (error || !outfit) {
    return (
      <PremiumScreen>
        <View style={styles.centeredStateShell}>
          <MaterialCommunityIcons name="comment-question-outline" size={32} color="#EF4444" />
          <Text style={styles.stateHeaderTitleTypography}>Lookbook Entry Unresolved</Text>
          <Text style={styles.stateSubtitleTypography}>
            {error || 'The requested look combination metadata record profile is missing from your secure database.'}
          </Text>
          <PremiumTouchable style={styles.fallbackNavigationAction} onPress={() => router.back()}>
            <Text style={styles.fallbackActionText}>Return to Wardrobe</Text>
          </PremiumTouchable>
        </View>
      </PremiumScreen>
    );
  }

  const creationTimestampDate = outfit.created_at
    ? new Date(outfit.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Undated creation profile';

  return (
    <PremiumScreen>
      <View style={styles.floatingHeaderActionBar}>
        <PremiumTouchable style={styles.roundBarIconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#1C1917" />
        </PremiumTouchable>
        <PremiumTouchable style={styles.roundBarIconButton} onPress={handleShareLookbookOutfit}>
          <Feather name="share-2" size={16} color="#1C1917" />
        </PremiumTouchable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollCanvasTrack} showsVerticalScrollIndicator={false}>
        
        {/* Requirement 1 & 3: High-Fashion Minimalist Hero Viewport Layer */}
        <View style={styles.heroMagazineStage}>
          {outfit.coverImage ? (
            <Image source={{ uri: outfit.coverImage }} style={styles.heroParallaxAssetImage} />
          ) : (
            <View style={styles.heroPlaceholderGraphicBase}>
              <MaterialCommunityIcons name="hanger" size={56} color="#78716C" />
              <Text style={styles.heroPlaceholderLabelText}>No Silhouette Image Linked</Text>
            </View>
          )}
          <View style={styles.heroLinearGradientScrimOverlay}>
            <View style={styles.heroMetaCardLabelRow}>
              <View style={styles.heroCapsuleWrapper}>
                <Text style={styles.heroOccasionCapsuleTagText}>
                  {outfit.occasion || 'UNRESTRICTED'}
                </Text>
              </View>
              <Text style={styles.heroHeaderTitleTypography}>{outfit.name}</Text>
              <Text style={styles.heroHeaderSubscriptTypography}>
                {uniqueGarments.length} curated pieces assembled
              </Text>
            </View>
          </View>
        </View>

        {/* Requirement 4, 5 & 6: Horizontal Multi-Asset Garments Swipe Collection Track */}
        <View style={styles.architecturalContentSection}>
          <View style={styles.inlineHeaderTitleSection}>
            <SectionTitle>Garments Included</SectionTitle>
            <View style={styles.countBadgeNode}>
              <Text style={styles.countBadgeText}>{uniqueGarments.length}</Text>
            </View>
          </View>

          {uniqueGarments.length === 0 ? (
            <View style={styles.emptyItemsTrackPlaceholderBox}>
              <Text style={styles.emptyTrackTypography}>No garments linked to this composition canvas yet.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalSwiperViewportSpacing}
            >
              {uniqueGarments.map((garment, index) => (
                <PremiumTouchable
                  key={`garment-card-${garment.id}-${index}`} // Composite dynamic unique safe-key structure
                  style={styles.garmentMagazineCardElement}
                  onPress={() => router.push({
                    pathname: '/clothing/[id]',
                    params: { id: garment.id }
                  })}
                >
                  <View style={styles.garmentImageContainerBoundingBox}>
                    {garment.image_url ? (
                      <Image source={{ uri: garment.image_url }} style={styles.garmentCardTargetImage} />
                    ) : (
                      <View style={styles.garmentFallbackAssetCenterFrame}>
                        <MaterialCommunityIcons name="hanger" size={24} color="#A8A29E" />
                      </View>
                    )}
                  </View>
                  <View style={styles.garmentMetaFooterBlockText}>
                    <Text style={styles.garmentLabelBrandHeader} numberOfLines={1}>
                      {garment.brand || 'UNBRANDED'}
                    </Text>
                    <Text style={styles.garmentLabelNameSubscript} numberOfLines={1}>
                      {garment.name}
                    </Text>
                    <Text style={styles.garmentLabelCategoryTag} numberOfLines={1}>
                      {garment.category}
                    </Text>
                  </View>
                </PremiumTouchable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Requirement 8: Technical Specs Metadata Block */}
        <View style={styles.architecturalContentSection}>
          <SectionTitle withBottomMargin>Outfit Information</SectionTitle>
          <View style={styles.premiumDataGridMetricsSheet}>
            <View style={styles.metadataMetricDataRow}>
              <Text style={styles.metricRowAttributeKeyText}>Occasion Setting</Text>
              <Text style={styles.metricRowValueLabelText}>{outfit.occasion || 'General Wardrobe'}</Text>
            </View>
            <View style={styles.metadataMetricDataRow}>
              <Text style={styles.metricRowAttributeKeyText}>Total Components</Text>
              <Text style={styles.metricRowValueLabelText}>{uniqueGarments.length} Items</Text>
            </View>
            <View style={styles.metadataMetricDataRowLineOverride}>
              <Text style={styles.metricRowAttributeKeyText}>Assembled On</Text>
              <Text style={styles.metricRowValueLabelText}>{creationTimestampDate}</Text>
            </View>
          </View>
        </View>

        {/* Requirement 9: Functional Premium Operations Interface Controls */}
        <View style={styles.architecturalContentSection}>
          <SectionTitle withBottomMargin>Actions</SectionTitle>
          <View style={styles.actionsLinearControlStack}>
            <PremiumTouchable 
              style={styles.actionRowInteractiveButton}
              onPress={() => router.push({ pathname: '/create', params: { mode: 'edit', outfitId: outfit.id } })}
            >
              <View style={styles.actionRowLeftGroupSymbolLayout}>
                <Feather name="edit-3" size={15} color="#1C1917" />
                <Text style={styles.actionButtonLabelTextString}>Edit Outfit Structure</Text>
              </View>
              <Feather name="chevron-right" size={14} color="#A8A29E" />
            </PremiumTouchable>

            <PremiumTouchable style={styles.actionRowInteractiveButton} onPress={handleShareLookbookOutfit}>
              <View style={styles.actionRowLeftGroupSymbolLayout}>
                <Feather name="share" size={15} color="#1C1917" />
                <Text style={styles.actionButtonLabelTextString}>Share Combination Profile</Text>
              </View>
              <Feather name="chevron-right" size={14} color="#A8A29E" />
            </PremiumTouchable>

            <PremiumTouchable 
              disabled={isDeleting}
              style={[styles.actionRowInteractiveButtonLineOverride]} 
              onPress={handleDeleteOutfitConfirmation}
            >
              <View style={styles.actionRowLeftGroupSymbolLayout}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" style={styles.deletingSpinnerFix} />
                ) : (
                  <Feather name="trash-2" size={15} color="#EF4444" />
                )}
                <Text style={styles.actionButtonLabelTextStringDestructive}>Deconstruct Look permanently</Text>
              </View>
            </PremiumTouchable>
          </View>
        </View>

      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  scrollCanvasTrack: {
    paddingBottom: 48,
  },
  centeredStateShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  stateHeaderTitleTypography: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
    marginTop: 16,
    marginBottom: 6,
  },
  stateSubtitleTypography: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  fallbackNavigationAction: {
    marginTop: 20,
    backgroundColor: '#1C1917',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  fallbackActionText: {
    color: '#FAFAF9',
    fontSize: 12,
    fontWeight: '600',
  },
  floatingHeaderActionBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 56,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundBarIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#E7E5E4',
  },
  heroMagazineStage: {
    width: width,
    height: HERO_IMAGE_HEIGHT,
    backgroundColor: '#F5F5F4',
    position: 'relative',
  },
  heroParallaxAssetImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholderGraphicBase: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7E5E4',
  },
  heroPlaceholderLabelText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
    marginTop: 12,
  },
  heroLinearGradientScrimOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: 'rgba(28, 25, 23, 0.02)',
  },
  heroMetaCardLabelRow: {
    alignItems: 'flex-start',
  },
  heroCapsuleWrapper: {
    backgroundColor: '#1C1917',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  heroOccasionCapsuleTagText: {
    color: '#FAFAF9',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  heroHeaderTitleTypography: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroHeaderSubscriptTypography: {
    fontSize: 13,
    color: '#44403C',
    marginTop: 4,
    fontWeight: '400',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  architecturalContentSection: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  inlineHeaderTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  countBadgeNode: {
    backgroundColor: '#F5F5F4',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },
  emptyItemsTrackPlaceholderBox: {
    backgroundColor: '#F5F5F4',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyTrackTypography: {
    fontSize: 12,
    color: '#78716C',
  },
  horizontalSwiperViewportSpacing: {
    gap: 12,
    paddingRight: 16,
    paddingVertical: 4,
  },
  garmentMagazineCardElement: {
    width: GARMENT_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F5F5F4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  garmentImageContainerBoundingBox: {
    width: '100%',
    height: GARMENT_CARD_WIDTH * 1.25,
    backgroundColor: '#F5F5F4',
  },
  garmentCardTargetImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  garmentFallbackAssetCenterFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentMetaFooterBlockText: {
    padding: 10,
  },
  garmentLabelBrandHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  garmentLabelNameSubscript: {
    fontSize: 12,
    color: '#44403C',
    fontWeight: '400',
    marginBottom: 4,
  },
  garmentLabelCategoryTag: {
    fontSize: 10,
    color: '#A8A29E',
    fontWeight: '500',
  },
  premiumDataGridMetricsSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingHorizontal: 16,
  },
  metadataMetricDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: '#E7E5E4',
  },
  metadataMetricDataRowLineOverride: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  metricRowAttributeKeyText: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '400',
  },
  metricRowValueLabelText: {
    fontSize: 13,
    color: '#1C1917',
    fontWeight: '500',
  },
  actionsLinearControlStack: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingHorizontal: 16,
  },
  actionRowInteractiveButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: '#E7E5E4',
  },
  actionRowInteractiveButtonLineOverride: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionRowLeftGroupSymbolLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtonLabelTextString: {
    fontSize: 13,
    color: '#1C1917',
    fontWeight: '400',
  },
  actionButtonLabelTextStringDestructive: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  deletingSpinnerFix: {
    marginRight: -4,
  },
});