import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  Animated,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionTitle } from '../../components/ui/SectionTitle';

// Supabase client instance integration
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const HERO_IMAGE_HEIGHT = width * 1.35; // Elongated 3:4 portrait crop for editorial weight
const GARMENT_CARD_WIDTH = width * 0.44;

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

  // --- Premium Micro-interactions / Animation Drivers ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  // Press feedback scales for primary interaction groups
  const editScale = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const deleteScale = useRef(new Animated.Value(1)).current;

  const runEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 750,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressIn = (animatedValue: Animated.Value) => {
    Animated.spring(animatedValue, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (animatedValue: Animated.Value) => {
    Animated.spring(animatedValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

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
      runEntranceAnimation();
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
          <Text style={styles.stateSubtitleTypography}>Retrieving Lookbook...</Text>
        </View>
      </PremiumScreen>
    );
  }

  if (error || !outfit) {
    return (
      <PremiumScreen>
        <View style={styles.centeredStateShell}>
          <MaterialCommunityIcons name="comment-question-outline" size={28} color="#D62F2F" />
          <Text style={styles.stateHeaderTitleTypography}>Lookbook Entry Unresolved</Text>
          <Text style={styles.stateSubtitleTypography}>
            {error || 'The requested look combination metadata record profile is missing.'}
          </Text>
          <PremiumTouchable style={styles.fallbackNavigationAction} onPress={() => router.back()}>
            <Text style={styles.fallbackActionText}>Return to Wardrobe</Text>
          </PremiumTouchable>
        </View>
      </PremiumScreen>
    );
  }

  const creationTimestampDate = outfit.created_at
    ? new Date(outfit.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Undated';

  return (
    <PremiumScreen>
      {/* Floating Glass Header Buttons */}
      <View style={styles.floatingHeaderActionBar}>
        <Pressable 
          onPress={() => router.back()}
          style={({ pressed }) => [styles.roundBarIconButton, pressed && styles.opaqueScalePress]}
        >
          <Ionicons name="chevron-back" size={20} color="#1C1917" />
        </Pressable>
        <Pressable 
          onPress={handleShareLookbookOutfit}
          style={({ pressed }) => [styles.roundBarIconButton, pressed && styles.opaqueScalePress]}
        >
          <Feather name="share-2" size={16} color="#1C1917" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollCanvasTrack} showsVerticalScrollIndicator={false}>
        
        {/* Magazine Cover Hero Banner */}
        <Animated.View style={[styles.heroMagazineStage, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {outfit.coverImage ? (
            <Image source={{ uri: outfit.coverImage }} style={styles.heroParallaxAssetImage} />
          ) : (
            <View style={styles.heroPlaceholderGraphicBase}>
              <MaterialCommunityIcons name="hanger" size={48} color="#A8A29E" />
              <Text style={styles.heroPlaceholderLabelText}>No Silhouette Image Linked</Text>
            </View>
          )}
          
          {/* Subtle multi-layer gradient cover overlay */}
          <View style={styles.scrimOverlayShadow} />
          <View style={styles.heroLinearGradientScrimOverlay}>
            <View style={styles.heroMetaCardLabelRow}>
              {outfit.occasion && (
                <View style={styles.heroCapsuleWrapper}>
                  <Text style={styles.heroOccasionCapsuleTagText}>
                    {outfit.occasion.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.heroHeaderTitleTypography} numberOfLines={2}>
                {outfit.name}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Dynamic Content Panel */}
        <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
          
          {/* Architectural Summary Card */}
          <View style={styles.magazineSummaryCard}>
            <View style={styles.summaryMetricItem}>
              <Text style={styles.summaryMetricLabel}>PIECES</Text>
              <Text style={styles.summaryMetricValue}>{uniqueGarments.length}</Text>
            </View>
            <View style={styles.summaryVerticalDivider} />
            <View style={styles.summaryMetricItem}>
              <Text style={styles.summaryMetricLabel}>OCCASION</Text>
              <Text style={styles.summaryMetricValue} numberOfLines={1}>
                {outfit.occasion ? outfit.occasion : 'Any Setting'}
              </Text>
            </View>
            <View style={styles.summaryVerticalDivider} />
            <View style={styles.summaryMetricItem}>
              <Text style={styles.summaryMetricLabel}>CURATED</Text>
              <Text style={styles.summaryMetricValue}>{creationTimestampDate}</Text>
            </View>
          </View>

          {/* Pinterest-style horizontal Garments Carousel */}
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
                snapToInterval={GARMENT_CARD_WIDTH + 16}
                decelerationRate="fast"
              >
                {uniqueGarments.map((garment, index) => (
                  <Pressable
                    key={`garment-card-${garment.id}-${index}`}
                    style={({ pressed }) => [
                      styles.garmentMagazineCardElement,
                      pressed && styles.cardInteractivePress
                    ]}
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
                          <MaterialCommunityIcons name="hanger" size={24} color="#D6D3D1" />
                        </View>
                      )}
                    </View>
                    <View style={styles.garmentMetaFooterBlockText}>
                      <Text style={styles.garmentLabelBrandHeader} numberOfLines={1}>
                        {garment.brand ? garment.brand.toUpperCase() : 'ESSENTIAL'}
                      </Text>
                      <Text style={styles.garmentLabelNameSubscript} numberOfLines={1}>
                        {garment.name}
                      </Text>
                      <Text style={styles.garmentLabelCategoryTag} numberOfLines={1}>
                        {garment.category}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Wardrobe Metrics Grid */}
          <View style={styles.architecturalContentSection}>
            <SectionTitle withBottomMargin>Composition Summary</SectionTitle>
            <View style={styles.metricsTwoColumnGrid}>
              <View style={styles.metricGridCell}>
                <Text style={styles.metricGridLabel}>PRIMARY OCCASION</Text>
                <Text style={styles.metricGridValue} numberOfLines={1}>
                  {outfit.occasion || 'Everyday'}
                </Text>
              </View>
              <View style={styles.metricGridCell}>
                <Text style={styles.metricGridLabel}>TOTAL COMPONENTS</Text>
                <Text style={styles.metricGridValue}>
                  {uniqueGarments.length} {uniqueGarments.length === 1 ? 'Garment' : 'Garments'}
                </Text>
              </View>
            </View>
          </View>

          {/* Minimalist Separator */}
          <View style={styles.minimalistSectionDivider} />

          {/* Action Operations Controller Container */}
          <View style={[styles.architecturalContentSection, styles.extraBottomOffset]}>
            <Animated.View style={{ transform: [{ scale: editScale }] }}>
              <Pressable
                onPressIn={() => handlePressIn(editScale)}
                onPressOut={() => handlePressOut(editScale)}
                onPress={() => router.push({ pathname: '/create', params: { mode: 'edit', outfitId: outfit.id } })}
                style={styles.actionCardPrimary}
              >
                <View style={styles.actionCardBody}>
                  <Feather name="edit-3" size={16} color="#FFFFFF" />
                  <Text style={styles.actionCardPrimaryText}>Edit Outfit Details</Text>
                </View>
                <Feather name="arrow-right" size={16} color="#FFFFFF" />
              </Pressable>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: shareScale }], marginTop: 12 }}>
              <Pressable
                onPressIn={() => handlePressIn(shareScale)}
                onPressOut={() => handlePressOut(shareScale)}
                onPress={handleShareLookbookOutfit}
                style={styles.actionCardSecondary}
              >
                <View style={styles.actionCardBody}>
                  <Feather name="share" size={15} color="#1C1917" />
                  <Text style={styles.actionCardSecondaryText}>Share Composition</Text>
                </View>
                <Feather name="chevron-right" size={14} color="#78716C" />
              </Pressable>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: deleteScale }], marginTop: 24 }}>
              <Pressable
                disabled={isDeleting}
                onPressIn={() => handlePressIn(deleteScale)}
                onPressOut={() => handlePressOut(deleteScale)}
                onPress={handleDeleteOutfitConfirmation}
                style={styles.actionCardDestructive}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#D62F2F" />
                ) : (
                  <View style={styles.destructiveRowWrapper}>
                    <Feather name="trash-2" size={14} color="#D62F2F" />
                    <Text style={styles.actionCardDestructiveText}>Delete Outfit from Closet</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </View>

        </Animated.View>
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  scrollCanvasTrack: {
    paddingBottom: 64,
  },
  centeredStateShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#FAF9F6',
  },
  stateHeaderTitleTypography: {
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '600',
    color: '#1C1917',
    marginTop: 20,
    letterSpacing: -0.2,
  },
  stateSubtitleTypography: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    letterSpacing: 0.1,
  },
  fallbackNavigationAction: {
    marginTop: 24,
    backgroundColor: '#1C1917',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fallbackActionText: {
    color: '#FAFAF9',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  floatingHeaderActionBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 50,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundBarIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(231, 229, 228, 0.5)',
  },
  opaqueScalePress: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  heroMagazineStage: {
    width: width,
    height: HERO_IMAGE_HEIGHT,
    backgroundColor: '#F5F5F4',
    position: 'relative',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
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
    backgroundColor: '#EAE6E1',
  },
  heroPlaceholderLabelText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '600',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  scrimOverlayShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  heroLinearGradientScrimOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 36,
    // Emulates a smooth ambient shadow layer over image bottom
    backgroundColor: 'rgba(0, 0, 0, 0.45)', 
  },
  heroMetaCardLabelRow: {
    alignItems: 'flex-start',
  },
  heroCapsuleWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  heroOccasionCapsuleTagText: {
    color: '#FAFAF9',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroHeaderTitleTypography: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  magazineSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  summaryMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryMetricLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  summaryMetricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1917',
    letterSpacing: -0.2,
  },
  summaryVerticalDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F5F5F4',
  },
  architecturalContentSection: {
    marginTop: 36,
    paddingHorizontal: 16,
  },
  inlineHeaderTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  countBadgeNode: {
    backgroundColor: '#1C1917',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FAFAF9',
  },
  emptyItemsTrackPlaceholderBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  emptyTrackTypography: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
  },
  horizontalSwiperViewportSpacing: {
    paddingRight: 16,
    paddingVertical: 4,
    gap: 16,
  },
  garmentMagazineCardElement: {
    width: GARMENT_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  cardInteractivePress: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  garmentImageContainerBoundingBox: {
    width: '100%',
    height: GARMENT_CARD_WIDTH * 1.35, // 3:4 High-fashion asset proportion
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
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  garmentLabelBrandHeader: {
    fontSize: 8,
    fontWeight: '700',
    color: '#78716C',
    letterSpacing: 1,
    marginBottom: 3,
  },
  garmentLabelNameSubscript: {
    fontSize: 13,
    color: '#1C1917',
    fontWeight: '500',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  garmentLabelCategoryTag: {
    fontSize: 10,
    color: '#A8A29E',
    fontWeight: '500',
  },
  metricsTwoColumnGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricGridCell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 16,
    padding: 16,
  },
  metricGridLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 1,
    marginBottom: 6,
  },
  metricGridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1917',
  },
  minimalistSectionDivider: {
    height: 1,
    backgroundColor: '#E7E5E4',
    marginHorizontal: 16,
    marginTop: 36,
  },
  extraBottomOffset: {
    marginBottom: 20,
  },
  actionCardPrimary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1917',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  actionCardPrimaryText: {
    color: '#FAFAF9',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  actionCardSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionCardSecondaryText: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '500',
  },
  actionCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionCardDestructive: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  destructiveRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCardDestructiveText: {
    color: '#D62F2F',
    fontSize: 13,
    fontWeight: '600',
  },
});