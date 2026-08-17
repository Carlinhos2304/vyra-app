import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppAlert } from '../../lib/ui/appAlert';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';

import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

// High Performance Reanimated imports
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type ClothingDetailSearchParams = {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  color: string;
  refresh?: string;
};

// Setup spring default presets similar to Linear or Apple's UI
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
};

export default function ClothingDetailScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams<ClothingDetailSearchParams>();

  // Soft-tinted destructive surface — computed locally since it's a one-off composite
  // pattern (not a shared semantic token), matching the approach used on create.tsx's banners.
  const dangerSoftBg = theme.dark ? 'rgba(239, 68, 68, 0.15)' : '#FFF5F5';
  const dangerSoftBorder = theme.dark ? 'rgba(239, 68, 68, 0.35)' : '#FCA5A5';

  // Initialize state
  const [garment, setGarment] = useState({
    id: params.id,
    name: params.name || t('clothing.detail.unnamedGarment'),
    brand: params.brand || 'Unknown Brand',
    category: params.category || t('clothing.detail.uncategorized'),
    image: params.image || '',
    color: params.color || t('clothing.detail.notAvailable'),
    is_favorite: false,
  });

  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(true);

  // ==========================================
  // ANIMATION SHARED VALUES
  // ==========================================
  // Entrance states
  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.96);

  const navBarOpacity = useSharedValue(0);
  const navBarTranslateY = useSharedValue(-15);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(10);

  const specsTitleOpacity = useSharedValue(0);
  const specsTitleTranslateY = useSharedValue(10);

  const cardOneOpacity = useSharedValue(0);
  const cardOneTranslateY = useSharedValue(15);

  const cardTwoOpacity = useSharedValue(0);
  const cardTwoTranslateY = useSharedValue(15);

  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(15);

  // Micro-interaction states
  const backBtnScale = useSharedValue(1);
  const favBtnScale = useSharedValue(1);
  const shareBtnScale = useSharedValue(1);
  const editBtnScale = useSharedValue(1);
  const deleteBtnScale = useSharedValue(1);

  // Custom image loader skeleton opacity
  const skeletonOpacity = useSharedValue(1);

  // Helper utility to safely format IDs depending on whether your schema uses integers or UUID strings
  const getNormalizedId = (rawId: string): string | number => {
    const isNumeric = /^\d+$/.test(rawId);
    return isNumeric ? parseInt(rawId, 10) : rawId;
  };

  // ==========================================
  // ENTRANCE SEQUENCE GENERATOR
  // ==========================================
  const triggerEntranceAnimations = () => {
    const easeOutCubic = Easing.out(Easing.cubic);

    // Hero visual elements
    heroOpacity.value = withTiming(1, { duration: 500, easing: easeOutCubic });
    heroScale.value = withTiming(1, { duration: 600, easing: easeOutCubic });

    // Header nav overlay
    navBarOpacity.value = withTiming(1, { duration: 400, easing: easeOutCubic });
    navBarTranslateY.value = withTiming(0, { duration: 400, easing: easeOutCubic });

    // Text & Badge Headers
    headerOpacity.value = withDelay(150, withTiming(1, { duration: 400, easing: easeOutCubic }));
    headerTranslateY.value = withDelay(150, withTiming(0, { duration: 400, easing: easeOutCubic }));

    // Specifications Segment Header
    specsTitleOpacity.value = withDelay(230, withTiming(1, { duration: 400, easing: easeOutCubic }));
    specsTitleTranslateY.value = withDelay(230, withTiming(0, { duration: 400, easing: easeOutCubic }));

    // Staggered Spec Attribute Cells (+80ms delays)
    cardOneOpacity.value = withDelay(290, withTiming(1, { duration: 450, easing: easeOutCubic }));
    cardOneTranslateY.value = withDelay(290, withTiming(0, { duration: 450, easing: easeOutCubic }));

    cardTwoOpacity.value = withDelay(370, withTiming(1, { duration: 450, easing: easeOutCubic }));
    cardTwoTranslateY.value = withDelay(370, withTiming(0, { duration: 450, easing: easeOutCubic }));

    // Bottom action trigger buttons shelf
    buttonsOpacity.value = withDelay(450, withTiming(1, { duration: 450, easing: easeOutCubic }));
    buttonsTranslateY.value = withDelay(450, withTiming(0, { duration: 450, easing: easeOutCubic }));
  };

  // Sync state data from the database whenever params change or a refresh token arrives
  useEffect(() => {
    let isMounted = true;

    async function fetchLatestGarmentState() {
      if (!params.id) {
        setIsInitialLoading(false);
        return;
      }

      const targetedId = getNormalizedId(params.id);

      try {
        const { data, error } = await supabase
          .from('clothing_items')
          .select('*')
          .eq('id', targetedId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data && isMounted) {
          setGarment({
            id: data.id.toString(),
            name: data.name,
            brand: data.brand || 'Unbranded',
            category: data.category,
            image: data.image_url,
            color: data.color,
            is_favorite: !!data.is_favorite,
          });
        } else if (!data && isMounted) {
          setGarment({
            id: params.id,
            name: params.name || t('clothing.detail.unnamedGarment'),
            brand: params.brand || 'Unknown Brand',
            category: params.category || t('clothing.detail.uncategorized'),
            image: params.image || '',
            color: params.color || t('clothing.detail.notAvailable'),
            is_favorite: false,
          });
        }
      } catch (err: any) {
        console.error('[Sync Engine] Structural crash during network request layer execution:', err);
        AppAlert.alert(t('clothing.detail.syncError.title'), t('clothing.detail.syncError.message'));
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
          // Trigger animations right after loading finishes
          setTimeout(() => {
            triggerEntranceAnimations();
          }, 50);
        }
      }
    }

    fetchLatestGarmentState();

    return () => {
      isMounted = false;
    };
  }, [params.id, params.refresh]);

  // Toggle Favorite Action Loop
  const handleToggleFavorite = async () => {
    if (isFavoriteLoading || !garment.id) {
      return;
    }

    const nextFavoriteState = !garment.is_favorite;
    const targetedId = getNormalizedId(garment.id);

    // Dynamic Micro-interaction scale bounce on like
    favBtnScale.value = withSpring(1.3, SPRING_CONFIG, () => {
      favBtnScale.value = withSpring(1, SPRING_CONFIG);
    });

    setGarment(prev => ({ ...prev, is_favorite: nextFavoriteState }));
    setIsFavoriteLoading(true);

    try {
      const { error } = await supabase
        .from('clothing_items')
        .update({ is_favorite: nextFavoriteState })
        .eq('id', targetedId)
        .select();

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('[Favorite Action] Network write workflow collapsed completely:', error);
      AppAlert.alert(
        t('clothing.detail.favoriteError.title'),
        t('clothing.detail.favoriteError.message', { detail: error.message || t('clothing.detail.favoriteError.rlsLockFallback') })
      );
      setGarment(prev => ({ ...prev, is_favorite: !nextFavoriteState }));
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  // Share Content Native Sheet Trigger
  const handleNativeShare = async () => {
    try {
      const messagePayload =
        `${t('clothing.detail.shareMessage.header')}\n\n` +
        `${t('clothing.detail.shareMessage.name', { name: garment.name })}\n` +
        `${t('clothing.detail.shareMessage.brand', { brand: garment.brand })}\n` +
        `${t('clothing.detail.shareMessage.category', { category: garment.category })}\n` +
        `${t('clothing.detail.shareMessage.color', { color: garment.color })}\n` +
        (garment.image ? t('clothing.detail.shareMessage.image', { image: garment.image }) : '');

      await Share.share({
        message: messagePayload,
        title: t('clothing.detail.shareMessage.title', { name: garment.name }),
      });
    } catch (error: any) {
      console.error('[Share Action] Native system sharing display operation collapsed:', error);
      AppAlert.alert(t('clothing.detail.shareError.title'), t('clothing.detail.shareError.message'));
    }
  };

  // Pre-fill parameters and navigate to workspace edit interface module
  const handleNavigateEdit = () => {
    if (!garment.id) return;

    router.push({
      pathname: 'clothing/edit-garment',
      params: {
        id: garment.id,
        name: garment.name,
        brand: garment.brand,
        category: garment.category,
        image: garment.image,
        color: garment.color,
      }
    });
  };

  // Cascade Deletion Workflows with robust storage cleanup
  const handleExecuteDelete = async () => {
    if (!garment.id || isDeleting) return;

    AppAlert.alert(
      t('clothing.detail.deleteConfirm.title'),
      t('clothing.detail.deleteConfirm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('clothing.detail.deletePermanently'),
          style: 'destructive',
          onPress: async () => {
            const targetedId = getNormalizedId(garment.id);

            try {
              setIsDeleting(true);

              // 1. Storage Asset Cleanup Layer
              if (garment.image && garment.image.includes('/storage/v1/object/public/garments/')) {
                const parsedFileName = garment.image.split('/garments/').pop();

                if (parsedFileName) {
                  const { error: storagePurgeError } = await supabase.storage
                    .from('garments')
                    .remove([parsedFileName]);

                  if (storagePurgeError) {
                    console.error("[Delete Action] Non-blocking warn exception: Cloud object asset file could not be dropped from storage:", storagePurgeError);
                  }
                }
              }

              // 2. Postgres Relational Row Extraction Layer
              const { error: dbDeleteError } = await supabase
                .from('clothing_items')
                .delete()
                .eq('id', targetedId)
                .select();

              if (dbDeleteError) {
                throw dbDeleteError;
              }

              // 3. Return control back with an active cache-breaking parameter token
              router.replace({
                pathname: '/(tabs)/closet',
                params: { refresh: `deleted-${Date.now()}` },
              });

            } catch (err: any) {
              console.error('[Delete Action] Critical processing system breakdown error during cascade deletion pipeline:', err);
              AppAlert.alert(t('clothing.detail.deleteError.title'), err.message || t('clothing.detail.deleteError.message'));
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Image load helper trigger
  const handleImageLoadComplete = () => {
    setIsImageLoading(false);
    skeletonOpacity.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
  };

  // ==========================================
  // REANIMATED STYLE ASSIGNMENTS
  // ==========================================
  const animatedHeroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));

  const animatedNavBarStyle = useAnimatedStyle(() => ({
    opacity: navBarOpacity.value,
    transform: [{ translateY: navBarTranslateY.value }],
  }));

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const animatedSpecsTitleStyle = useAnimatedStyle(() => ({
    opacity: specsTitleOpacity.value,
    transform: [{ translateY: specsTitleTranslateY.value }],
  }));

  const animatedCardOneStyle = useAnimatedStyle(() => ({
    opacity: cardOneOpacity.value,
    transform: [{ translateY: cardOneTranslateY.value }],
  }));

  const animatedCardTwoStyle = useAnimatedStyle(() => ({
    opacity: cardTwoOpacity.value,
    transform: [{ translateY: cardTwoTranslateY.value }],
  }));

  const animatedButtonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const animatedBackBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backBtnScale.value }],
  }));

  const animatedFavBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favBtnScale.value }],
  }));

  const animatedShareBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareBtnScale.value }],
  }));

  const animatedEditBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: editBtnScale.value }],
  }));

  const animatedDeleteBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deleteBtnScale.value }],
  }));

  const animatedSkeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  if (isInitialLoading) {
    return (
      <PremiumScreen>
        <View style={[styles.centeredLoaderContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          <Text style={[styles.loadingProgressMessageText, { color: theme.colors.textSecondary }]}>{t('clothing.detail.loading')}</Text>
        </View>
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      {/* Absolute Header Navigation Overlay — floats on top of the garment photo, so the
          pill background and icon colors stay fixed regardless of theme (photo-context) */}
      <Animated.View style={[styles.navBarFloatingOverlay, animatedNavBarStyle]}>
        <Pressable
          onPressIn={() => { backBtnScale.value = withSpring(0.9, SPRING_CONFIG); }}
          onPressOut={() => { backBtnScale.value = withSpring(1, SPRING_CONFIG); }}
          style={styles.navCircleActionButton}
          onPress={() => {
            router.replace({ pathname: '/(tabs)/closet', params: { refresh: `back-${Date.now()}` } });
          }}
        >
          <Animated.View style={animatedBackBtnStyle}>
            <Ionicons name="arrow-back" size={20} color="#1C1917" />
          </Animated.View>
        </Pressable>

        <View style={styles.navActionRightBlock}>
          <Pressable
            onPressIn={() => { favBtnScale.value = withSpring(0.9, SPRING_CONFIG); }}
            onPressOut={() => { favBtnScale.value = withSpring(1, SPRING_CONFIG); }}
            style={styles.navCircleActionButton}
            onPress={handleToggleFavorite}
            disabled={isFavoriteLoading}
          >
            <Animated.View style={animatedFavBtnStyle}>
              <Ionicons
                name={garment.is_favorite ? "heart" : "heart-outline"}
                size={20}
                color={garment.is_favorite ? "#DC2626" : "#1C1917"}
              />
            </Animated.View>
          </Pressable>

          <Pressable
            onPressIn={() => { shareBtnScale.value = withSpring(0.9, SPRING_CONFIG); }}
            onPressOut={() => { shareBtnScale.value = withSpring(1, SPRING_CONFIG); }}
            style={styles.navCircleActionButton}
            onPress={handleNativeShare}
          >
            <Animated.View style={animatedShareBtnStyle}>
              <Ionicons name="share-social-outline" size={20} color="#1C1917" />
            </Animated.View>
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollLayout}>
        {/* Core Hero Showcase Image Framework */}
        <Animated.View style={[styles.heroImageFrame, { backgroundColor: theme.colors.surfaceSecondary }, animatedHeroStyle]}>
          {garment.image ? (
            <>
              <Image
                source={{ uri: garment.image }}
                style={styles.garmentCoverImage}
                onLoadEnd={handleImageLoadComplete}
              />
              {/* Premium image loading skeleton overlay */}
              {isImageLoading && (
                <Animated.View style={[StyleSheet.absoluteFillObject, styles.placeholderGraphicContainer, { backgroundColor: theme.colors.surfaceSecondary }, animatedSkeletonStyle]}>
                  <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                </Animated.View>
              )}
            </>
          ) : (
            <View style={[styles.garmentCoverImage, styles.placeholderGraphicContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="shirt-outline" size={48} color={theme.colors.textTertiary} />
            </View>
          )}
        </Animated.View>

        {/* Informational Presentation Shell */}
        <View style={[styles.detailCardBody, { backgroundColor: theme.colors.background }]}>
          <Animated.View style={[styles.identityHeaderRow, animatedHeaderStyle]}>
            <SectionHeader
              title={garment.name}
              subtitle={garment.brand}
              style={styles.headerFlexOverride}
            />
            <View style={[styles.categoryBadgeContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.categoryBadgeText, { color: theme.colors.textSecondary }]}>{garment.category}</Text>
            </View>
          </Animated.View>

          {/* Attribute Structured Parameters Data Grid */}
          <View style={styles.attributesSection}>
            <Animated.View style={animatedSpecsTitleStyle}>
              <SectionTitle withBottomMargin>{t('clothing.detail.sectionTitle')}</SectionTitle>
            </Animated.View>

            <View style={[styles.attributesSpecificationGrid, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
              <Animated.View style={[styles.gridAttributeCell, { borderColor: theme.colors.divider }, animatedCardOneStyle]}>
                <Text style={[styles.attributeLabelText, { color: theme.colors.textSecondary }]}>{t('clothing.detail.colorLabel')}</Text>
                <View style={styles.colorIndicatorRow}>
                  <View
                    style={[
                      styles.colorBlockVisual,
                      { borderColor: theme.colors.border },
                      { backgroundColor: garment.color.startsWith('#') ? garment.color : 'transparent' }
                    ]}
                  />
                  <Text style={[styles.attributeValueText, { color: theme.colors.textPrimary }]}>
                    {garment.color.startsWith('#') ? garment.color.toUpperCase() : garment.color}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.gridAttributeCell, { borderColor: theme.colors.divider }, animatedCardTwoStyle]}>
                <Text style={[styles.attributeLabelText, { color: theme.colors.textSecondary }]}>{t('clothing.detail.catalogIdLabel')}</Text>
                <Text style={[styles.attributeValueText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  #{garment.id ? garment.id.toString().substring(0, 8) : t('clothing.detail.notAvailable')}
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* Destructive Control Management Button Group Shelf */}
          <Animated.View style={[styles.actionButtonGroupHorizontalRow, animatedButtonsStyle]}>
            <Pressable
              onPressIn={() => { editBtnScale.value = withSpring(0.96, SPRING_CONFIG); }}
              onPressOut={() => { editBtnScale.value = withSpring(1, SPRING_CONFIG); }}
              style={[styles.secondaryOutlineActionButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              onPress={handleNavigateEdit}
              disabled={isDeleting}
            >
              <Animated.View style={[styles.buttonInnerRow, animatedEditBtnStyle]}>
                <Ionicons name="create-outline" size={16} color={theme.colors.textPrimary} style={styles.actionButtonIconStyle} />
                <Text style={[styles.secondaryButtonLabelText, { color: theme.colors.textPrimary }]}>{t('clothing.detail.editButton')}</Text>
              </Animated.View>
            </Pressable>

            <Pressable
              onPressIn={() => { deleteBtnScale.value = withSpring(0.96, SPRING_CONFIG); }}
              onPressOut={() => { deleteBtnScale.value = withSpring(1, SPRING_CONFIG); }}
              style={[
                styles.destructiveOutlineActionButton,
                { borderColor: dangerSoftBorder, backgroundColor: dangerSoftBg },
                isDeleting && styles.disabledActionOpacity
              ]}
              onPress={handleExecuteDelete}
              disabled={isDeleting}
            >
              <Animated.View style={[styles.buttonInnerRow, animatedDeleteBtnStyle]}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color={theme.colors.danger} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.danger} style={styles.actionButtonIconStyle} />
                    <Text style={[styles.destructiveButtonLabelText, { color: theme.colors.danger }]}>{t('common.delete')}</Text>
                  </>
                )}
              </Animated.View>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  scrollLayout: {
    paddingBottom: 40,
  },
  navBarFloatingOverlay: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navActionRightBlock: {
    flexDirection: 'row',
    gap: 10,
  },
  navCircleActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  heroImageFrame: {
    width: width,
    height: width * 1.25,
  },
  garmentCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderGraphicContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCardBody: {
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  identityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerFlexOverride: {
    flex: 1,
    paddingVertical: 0,
    paddingRight: 16,
  },
  categoryBadgeContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  attributesSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  attributesSpecificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 3,
    elevation: 1,
  },
  gridAttributeCell: {
    width: '50%',
    padding: 16,
    borderWidth: 0.5,
  },
  attributeLabelText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  attributeValueText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBlockVisual: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
    borderWidth: 1,
  },
  actionButtonGroupHorizontalRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  secondaryOutlineActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryButtonLabelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  destructiveOutlineActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
  },
  destructiveButtonLabelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonIconStyle: {
    marginRight: 6,
  },
  disabledActionOpacity: {
    opacity: 0.6,
  },
  centeredLoaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingProgressMessageText: {
    fontSize: 12,
    marginTop: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
