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
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

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
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Soft-tinted destructive surface — computed locally since it's a one-off composite
  // pattern (not a shared semantic token), matching the approach used on create.tsx's banners.
  const dangerSoftBg = theme.dark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.06)';
  const dangerSoftBorder = theme.dark ? 'rgba(248, 113, 113, 0.3)' : 'rgba(239, 68, 68, 0.15)';

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
      setError(err.message || t('outfitAi.detail.fetchErrorMessage'));
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

  // Business Logic Interaction Methods
  const handleShareLookbookOutfit = async () => {
    if (!outfit) return;
    try {
      const summaryText = t('outfitAi.detail.shareText', {
        name: outfit.name,
        count: uniqueGarments.length,
        occasion: outfit.occasion || t('outfitAi.detail.anySetting'),
      });
      await Share.share({ message: summaryText });
    } catch (err) {
      console.error('[Outfit Share Error]', err);
    }
  };

  const handleDeleteOutfitConfirmation = () => {
    if (!outfit) return;

    Alert.alert(
      t('outfitAi.detail.deleteConfirmTitle'),
      t('outfitAi.detail.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);

              // Cascade Execution Step A: Erase junction entries linked to the Lookbook identity
              const { error: cascadeError } = await supabase
                .from('outfit_items')
                .delete()
                .eq('outfit_id', outfit.id)
                .select(); // Added .select() to ensure execution block commits

              if (cascadeError) {
                throw cascadeError;
              }

              // Cascade Execution Step B: Clear parent identity footprint completely
              const { error: deleteError } = await supabase
                .from('outfits')
                .delete()
                .eq('id', outfit.id);

              if (deleteError) {
                throw deleteError;
              }

              router.replace('/closet');
            } catch (err: any) {
              console.error('[Outfit Delete Failure]:', err);
              Alert.alert(t('outfitAi.detail.deleteFailedTitle'), err.message || t('outfitAi.detail.deleteFailedMessage'));
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
        <View style={[styles.centeredStateShell, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          <Text style={[styles.stateSubtitleTypography, { color: theme.colors.textSecondary }]}>{t('outfitAi.detail.loading')}</Text>
        </View>
      </PremiumScreen>
    );
  }

  if (error || !outfit) {
    return (
      <PremiumScreen>
        <View style={[styles.centeredStateShell, { backgroundColor: theme.colors.background }]}>
          <MaterialCommunityIcons name="comment-question-outline" size={28} color={theme.colors.danger} />
          <Text style={[styles.stateHeaderTitleTypography, { color: theme.colors.textPrimary }]}>{t('outfitAi.detail.errorTitle')}</Text>
          <Text style={[styles.stateSubtitleTypography, { color: theme.colors.textSecondary }]}>
            {error || t('outfitAi.detail.errorFallbackMessage')}
          </Text>
          <PremiumTouchable style={[styles.fallbackNavigationAction, { backgroundColor: theme.colors.accent }]} onPress={() => router.back()}>
            <Text style={[styles.fallbackActionText, { color: theme.colors.accentForeground }]}>{t('outfitAi.detail.returnToWardrobe')}</Text>
          </PremiumTouchable>
        </View>
      </PremiumScreen>
    );
  }

  const creationTimestampDate = outfit.created_at
    ? new Date(outfit.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : t('outfitAi.detail.undated');

  return (
    <PremiumScreen>
      {/* Floating Glass Header Buttons — sits on top of the hero photo, kept fixed regardless of theme (photo-context) */}
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
        <Animated.View style={[styles.heroMagazineStage, { backgroundColor: theme.colors.surfaceSecondary }, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {outfit.coverImage ? (
            <Image source={{ uri: outfit.coverImage }} style={styles.heroParallaxAssetImage} />
          ) : (
            <View style={[styles.heroPlaceholderGraphicBase, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <MaterialCommunityIcons name="hanger" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.heroPlaceholderLabelText, { color: theme.colors.textSecondary }]}>{t('outfitAi.detail.noImageLinked')}</Text>
            </View>
          )}

          {/* Subtle multi-layer gradient cover overlay — drawn over the photo, stays fixed (photo-context) */}
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
          <View style={[styles.magazineSummaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            <View style={styles.summaryMetricItem}>
              <Text style={[styles.summaryMetricLabel, { color: theme.colors.textTertiary }]}>{t('outfitAi.detail.piecesLabel')}</Text>
              <Text style={[styles.summaryMetricValue, { color: theme.colors.textPrimary }]}>{uniqueGarments.length}</Text>
            </View>
            <View style={[styles.summaryVerticalDivider, { backgroundColor: theme.colors.divider }]} />
            <View style={styles.summaryMetricItem}>
              <Text style={[styles.summaryMetricLabel, { color: theme.colors.textTertiary }]}>{t('outfitAi.detail.occasionLabel')}</Text>
              <Text style={[styles.summaryMetricValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {outfit.occasion ? outfit.occasion : t('outfitAi.detail.anySettingCaps')}
              </Text>
            </View>
            <View style={[styles.summaryVerticalDivider, { backgroundColor: theme.colors.divider }]} />
            <View style={styles.summaryMetricItem}>
              <Text style={[styles.summaryMetricLabel, { color: theme.colors.textTertiary }]}>{t('outfitAi.detail.curatedLabel')}</Text>
              <Text style={[styles.summaryMetricValue, { color: theme.colors.textPrimary }]}>{creationTimestampDate}</Text>
            </View>
          </View>

          {/* Pinterest-style horizontal Garments Carousel */}
          <View style={styles.architecturalContentSection}>
            <View style={styles.inlineHeaderTitleSection}>
              <SectionTitle>{t('outfitAi.detail.garmentsIncludedTitle')}</SectionTitle>
              <View style={[styles.countBadgeNode, { backgroundColor: theme.colors.accent }]}>
                <Text style={[styles.countBadgeText, { color: theme.colors.accentForeground }]}>{uniqueGarments.length}</Text>
              </View>
            </View>

            {uniqueGarments.length === 0 ? (
              <View style={[styles.emptyItemsTrackPlaceholderBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.emptyTrackTypography, { color: theme.colors.textSecondary }]}>{t('outfitAi.detail.noGarmentsLinked')}</Text>
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
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow },
                      pressed && styles.cardInteractivePress
                    ]}
                    onPress={() => router.push({
                      pathname: '/clothing/[id]',
                      params: { id: garment.id }
                    })}
                  >
                    <View style={[styles.garmentImageContainerBoundingBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                      {garment.image_url ? (
                        <Image source={{ uri: garment.image_url }} style={styles.garmentCardTargetImage} />
                      ) : (
                        <View style={styles.garmentFallbackAssetCenterFrame}>
                          <MaterialCommunityIcons name="hanger" size={24} color={theme.colors.textTertiary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.garmentMetaFooterBlockText}>
                      <Text style={[styles.garmentLabelBrandHeader, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {garment.brand ? garment.brand.toUpperCase() : t('outfitAi.detail.essentialFallback')}
                      </Text>
                      <Text style={[styles.garmentLabelNameSubscript, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {garment.name}
                      </Text>
                      <Text style={[styles.garmentLabelCategoryTag, { color: theme.colors.textTertiary }]} numberOfLines={1}>
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
            <SectionTitle withBottomMargin>{t('outfitAi.detail.compositionSummaryTitle')}</SectionTitle>
            <View style={styles.metricsTwoColumnGrid}>
              <View style={[styles.metricGridCell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.metricGridLabel, { color: theme.colors.textTertiary }]}>{t('outfitAi.detail.primaryOccasionLabel')}</Text>
                <Text style={[styles.metricGridValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {outfit.occasion || t('outfitAi.detail.everydayFallback')}
                </Text>
              </View>
              <View style={[styles.metricGridCell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.metricGridLabel, { color: theme.colors.textTertiary }]}>{t('outfitAi.detail.totalComponentsLabel')}</Text>
                <Text style={[styles.metricGridValue, { color: theme.colors.textPrimary }]}>
                  {uniqueGarments.length} {uniqueGarments.length === 1 ? t('outfitAi.detail.garmentSingular') : t('outfitAi.detail.garmentPlural')}
                </Text>
              </View>
            </View>
          </View>

          {/* Minimalist Separator */}
          <View style={[styles.minimalistSectionDivider, { backgroundColor: theme.colors.divider }]} />

          {/* Action Operations Controller Container */}
          <View style={[styles.architecturalContentSection, styles.extraBottomOffset]}>
            <Animated.View style={{ transform: [{ scale: editScale }] }}>
              <Pressable
                onPressIn={() => handlePressIn(editScale)}
                onPressOut={() => handlePressOut(editScale)}
                onPress={() => router.push({ pathname: '/create', params: { mode: 'edit', outfitId: outfit.id } })}
                style={[styles.actionCardPrimary, { backgroundColor: theme.colors.accent, shadowColor: theme.colors.shadow }]}
              >
                <View style={styles.actionCardBody}>
                  <Feather name="edit-3" size={16} color={theme.colors.accentForeground} />
                  <Text style={[styles.actionCardPrimaryText, { color: theme.colors.accentForeground }]}>{t('outfitAi.detail.editOutfitDetails')}</Text>
                </View>
                <Feather name="arrow-right" size={16} color={theme.colors.accentForeground} />
              </Pressable>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: shareScale }], marginTop: 12 }}>
              <Pressable
                onPressIn={() => handlePressIn(shareScale)}
                onPressOut={() => handlePressOut(shareScale)}
                onPress={handleShareLookbookOutfit}
                style={[styles.actionCardSecondary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View style={styles.actionCardBody}>
                  <Feather name="share" size={15} color={theme.colors.textPrimary} />
                  <Text style={[styles.actionCardSecondaryText, { color: theme.colors.textPrimary }]}>{t('outfitAi.detail.shareComposition')}</Text>
                </View>
                <Feather name="chevron-right" size={14} color={theme.colors.textSecondary} />
              </Pressable>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: deleteScale }], marginTop: 24 }}>
              <Pressable
                disabled={isDeleting}
                onPressIn={() => handlePressIn(deleteScale)}
                onPressOut={() => handlePressOut(deleteScale)}
                onPress={handleDeleteOutfitConfirmation}
                style={[styles.actionCardDestructive, { backgroundColor: dangerSoftBg, borderColor: dangerSoftBorder }]}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={theme.colors.danger} />
                ) : (
                  <View style={styles.destructiveRowWrapper}>
                    <Feather name="trash-2" size={14} color={theme.colors.danger} />
                    <Text style={[styles.actionCardDestructiveText, { color: theme.colors.danger }]}>{t('outfitAi.detail.deleteOutfitFromCloset')}</Text>
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
  },
  stateHeaderTitleTypography: {
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '600',
    marginTop: 20,
    letterSpacing: -0.2,
  },
  stateSubtitleTypography: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    letterSpacing: 0.1,
  },
  fallbackNavigationAction: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fallbackActionText: {
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
  },
  heroPlaceholderLabelText: {
    fontSize: 11,
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
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
  },
  summaryMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryMetricLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  summaryMetricValue: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  summaryVerticalDivider: {
    width: 1,
    height: '100%',
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyItemsTrackPlaceholderBox: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTrackTypography: {
    fontSize: 12,
    textAlign: 'center',
  },
  horizontalSwiperViewportSpacing: {
    paddingRight: 16,
    paddingVertical: 4,
    gap: 16,
  },
  garmentMagazineCardElement: {
    width: GARMENT_CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  cardInteractivePress: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  garmentImageContainerBoundingBox: {
    width: '100%',
    height: GARMENT_CARD_WIDTH * 1.35, // 3:4 High-fashion asset proportion
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
    letterSpacing: 1,
    marginBottom: 3,
  },
  garmentLabelNameSubscript: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  garmentLabelCategoryTag: {
    fontSize: 10,
    fontWeight: '500',
  },
  metricsTwoColumnGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricGridCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  metricGridLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  metricGridValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  minimalistSectionDivider: {
    height: 1,
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
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  actionCardPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  actionCardSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionCardSecondaryText: {
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
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
  },
  destructiveRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCardDestructiveText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
