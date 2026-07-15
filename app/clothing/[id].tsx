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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';

import { supabase } from '../../lib/supabase';

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
  const params = useLocalSearchParams<ClothingDetailSearchParams>();
  
  console.log("[Detail Screen] Received incoming routing parameters:", JSON.stringify(params));

  // Initialize state
  const [garment, setGarment] = useState({
    id: params.id,
    name: params.name || 'Unnamed Garment',
    brand: params.brand || 'Unknown Brand',
    category: params.category || 'Uncategorized', 
    image: params.image || '',
    color: params.color || 'N/A',
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
    const normalized = isNumeric ? parseInt(rawId, 10) : rawId;
    console.log(`[ID Normalizer] Raw string "${rawId}" converted to token type [${typeof normalized}]:`, normalized);
    return normalized;
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
        console.warn("[Sync Engine] Terminating execution: Parameter ID mapping is missing.");
        setIsInitialLoading(false);
        return;
      }

      const targetedId = getNormalizedId(params.id);
      console.log(`[Sync Engine] Initiating row synchronization fetch for primary record reference ID:`, targetedId);

      try {
        const { data, error, status } = await supabase
          .from('clothing_items')
          .select('*')
          .eq('id', targetedId)
          .maybeSingle();

        console.log(`[Sync Engine] Supabase raw server network payload response:`, { status, data, error });

        if (error) {
          console.error("[Sync Engine] Supabase explicit database collection error payload:", error);
          throw error;
        }
        
        if (data && isMounted) {
          console.log("[Sync Engine] Row fetch executed successfully. Synchronizing internal UI state properties.");
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
          console.warn("[Sync Engine] No record row returned from Supabase. Falling back onto initial route parameter matrix.");
          setGarment({
            id: params.id,
            name: params.name || 'Unnamed Garment',
            brand: params.brand || 'Unknown Brand',
            category: params.category || 'Uncategorized',
            image: params.image || '',
            color: params.color || 'N/A',
            is_favorite: false,
          });
        }
      } catch (err: any) {
        console.error('[Sync Engine] Structural crash during network request layer execution:', err);
        Alert.alert('Sync Disruption', 'Failed to pull updated details directly from your remote closet vault.');
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
          console.log("[Sync Engine] Finished refresh synchronization cycle.");
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

  // Toggle Favorite Action Loop with detailed tracing logs
  const handleToggleFavorite = async () => {
    if (isFavoriteLoading || !garment.id) {
      console.warn("[Favorite Action] Execution intercepted. Operation is currently processing or ID is null.");
      return;
    }

    const nextFavoriteState = !garment.is_favorite;
    const targetedId = getNormalizedId(garment.id);

    console.log(`[Favorite Action] Toggling favorite state for ID: ${targetedId}. Target visual setting state:`, nextFavoriteState);

    // Dynamic Micro-interaction scale bounce on like
    favBtnScale.value = withSpring(1.3, SPRING_CONFIG, () => {
      favBtnScale.value = withSpring(1, SPRING_CONFIG);
    });

    setGarment(prev => ({ ...prev, is_favorite: nextFavoriteState }));
    setIsFavoriteLoading(true);

    try {
      const { data, error, status } = await supabase
        .from('clothing_items')
        .update({ is_favorite: nextFavoriteState })
        .eq('id', targetedId)
        .select();

      console.log(`[Favorite Action] Supabase update server network response details:`, { status, data, error });

      if (error) {
        console.error("[Favorite Action] Supabase explicit update database write exception:", error);
        throw error;
      }

      console.log("[Favorite Action] Favorite parameter committed successfully to remote persistent tables.");
    } catch (error: any) {
      console.error('[Favorite Action] Network write workflow collapsed completely:', error);
      Alert.alert(
        'Policy Exception', 
        `Could not save favorite configuration status. Verify that row level modifications are supported.\nDetail: ${error.message || 'RLS Lock'}`
      );
      setGarment(prev => ({ ...prev, is_favorite: !nextFavoriteState }));
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  // Share Content Native Sheet Trigger
  const handleNativeShare = async () => {
    console.log("[Share Action] Compiling descriptive text payload for system dialog presentation.");
    try {
      const messagePayload = 
        `✨ Check out this piece from my Vyra Wardrobe ✨\n\n` +
        `• Name: ${garment.name}\n` +
        `• Brand: ${garment.brand}\n` +
        `• Style Classification: ${garment.category}\n` +
        `• Tone Configuration: ${garment.color}\n` +
        (garment.image ? `\nView Visual Asset: ${garment.image}` : '');

      const outcome = await Share.share({
        message: messagePayload,
        title: `Vyra Wardrobe Asset - ${garment.name}`,
      });
      
      console.log("[Share Action] Native system display sheet sequence finalized. Outcome:", outcome);
    } catch (error: any) {
      console.error('[Share Action] Native system sharing display operation collapsed:', error);
      Alert.alert('Share Error', 'The native share operational platform rejected payload rendering.');
    }
  };

  // Pre-fill parameters and navigate to workspace edit interface module
  const handleNavigateEdit = () => {
    if (!garment.id) return;
    console.log("[Edit Action] Passing state parameter data directly to edit screen environment router configurations:", garment);
    
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

  // Cascade Deletion Workflows with robust storage cleanup and exhaustive tracking trace telemetry
  const handleExecuteDelete = async () => {
    if (!garment.id || isDeleting) return;

    Alert.alert(
      'Confirm Permanent Deletion',
      'This operation is irreversible. This will remove this item record from your database and wipe its uploaded photo asset from storage completely.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log("[Delete Action] User abandoned destruction flow.") },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const targetedId = getNormalizedId(garment.id);
            console.log(`[Delete Action] Commencing complete destruction sequence for ID: ${targetedId}`);
            
            try {
              setIsDeleting(true);

              // 1. Storage Asset Cleanup Layer
              if (garment.image && garment.image.includes('/storage/v1/object/public/garments/')) {
                console.log("[Delete Action] Parsing absolute asset path string to identify bucket coordinate names.");
                const parsedFileName = garment.image.split('/garments/').pop();
                
                if (parsedFileName) {
                  console.log(`[Delete Action] Attempting to purge file object from bucket path target: "garments/${parsedFileName}"`);
                  const { data: storageData, error: storagePurgeError } = await supabase.storage
                    .from('garments')
                    .remove([parsedFileName]);

                  console.log("[Delete Action] Supabase Storage cloud execution response state payload:", { storageData, storagePurgeError });

                  if (storagePurgeError) {
                    console.error("[Delete Action] Non-blocking warn exception: Cloud object asset file could not be dropped from storage:", storagePurgeError);
                  } else {
                    console.log("[Delete Action] Storage asset dropped successfully. No orphaned binary remains.");
                  }
                }
              } else {
                console.log("[Delete Action] Skipping bucket execution profile. Row asset does not contain a standard public cloud storage string identifier.");
              }

              // 2. Postgres Relational Row Extraction Layer
              console.log(`[Delete Action] Dispatching SQL deletion statement row extraction command target ID: ${targetedId}`);
              const { data: dbData, error: dbDeleteError, status } = await supabase
                .from('clothing_items')
                .delete()
                .eq('id', targetedId)
                .select();

              console.log(`[Delete Action] Supabase database transaction table delete network server feedback:`, { status, dbData, dbDeleteError });

              if (dbDeleteError) {
                console.error("[Delete Action] Core transaction abort execution error. Supabase rejected relational write rule mapping:", dbDeleteError);
                throw dbDeleteError;
              }

              console.log("[Delete Action] Database relational coordinate map tracking row removed successfully.");

              // 3. Complete context validation loop and return control back with an active cache-breaking parameter token
              console.log("[Delete Action] Re-routing user dashboard tracking back safely onto root closet view parameters.");
              router.replace({
                pathname: '/(tabs)/closet',
                params: { refresh: `deleted-${Date.now()}` },
              });

            } catch (err: any) {
              console.error('[Delete Action] Critical processing system breakdown error during cascade deletion pipeline:', err);
              Alert.alert('Deletion Intercepted', err.message || 'Database constraints or Row-Level security rejected table structural drop statements.');
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
        <View style={styles.centeredLoaderContainer}>
          <ActivityIndicator size="small" color="#1C1917" />
          <Text style={styles.loadingProgressMessageText}>Synchronizing Wardrobe Profile...</Text>
        </View>
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      {/* Absolute Header Navigation Overlay */}
      <Animated.View style={[styles.navBarFloatingOverlay, animatedNavBarStyle]}>
        <Pressable 
          onPressIn={() => { backBtnScale.value = withSpring(0.9, SPRING_CONFIG); }}
          onPressOut={() => { backBtnScale.value = withSpring(1, SPRING_CONFIG); }}
          style={styles.navCircleActionButton} 
          onPress={() => {
            console.log("[Navigation] Returning control focus back to home closet context.");
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
        <Animated.View style={[styles.heroImageFrame, animatedHeroStyle]}>
          {garment.image ? (
            <>
              <Image 
                source={{ uri: garment.image }} 
                style={styles.garmentCoverImage} 
                onLoadEnd={handleImageLoadComplete}
              />
              {/* Premium image loading skeleton overlay */}
              {isImageLoading && (
                <Animated.View style={[StyleSheet.absoluteFillObject, styles.placeholderGraphicContainer, animatedSkeletonStyle]}>
                  <ActivityIndicator size="small" color="#78716C" />
                </Animated.View>
              )}
            </>
          ) : (
            <View style={[styles.garmentCoverImage, styles.placeholderGraphicContainer]}>
              <Ionicons name="shirt-outline" size={48} color="#A8A29E" />
            </View>
          )}
        </Animated.View>

        {/* Informational Presentation Shell */}
        <View style={styles.detailCardBody}>
          <Animated.View style={[styles.identityHeaderRow, animatedHeaderStyle]}>
            <SectionHeader
              title={garment.name}
              subtitle={garment.brand}
              style={styles.headerFlexOverride}
            />
            <View style={styles.categoryBadgeContainer}>
              <Text style={styles.categoryBadgeText}>{garment.category}</Text>
            </View>
          </Animated.View>

          {/* Attribute Structured Parameters Data Grid */}
          <View style={styles.attributesSection}>
            <Animated.View style={animatedSpecsTitleStyle}>
              <SectionTitle withBottomMargin>Garment Details</SectionTitle>
            </Animated.View>
            
            <View style={styles.attributesSpecificationGrid}>
              <Animated.View style={[styles.gridAttributeCell, animatedCardOneStyle]}>
                <Text style={styles.attributeLabelText}>Color</Text>
                <View style={styles.colorIndicatorRow}>
                  <View 
                    style={[
                      styles.colorBlockVisual, 
                      { backgroundColor: garment.color.startsWith('#') ? garment.color : 'transparent' }
                    ]} 
                  />
                  <Text style={styles.attributeValueText}>
                    {garment.color.startsWith('#') ? garment.color.toUpperCase() : garment.color}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.gridAttributeCell, animatedCardTwoStyle]}>
                <Text style={styles.attributeLabelText}>Catalog ID</Text>
                <Text style={styles.attributeValueText} numberOfLines={1}>
                  #{garment.id ? garment.id.toString().substring(0, 8) : 'N/A'}
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* Destructive Control Management Button Group Shelf */}
          <Animated.View style={[styles.actionButtonGroupHorizontalRow, animatedButtonsStyle]}>
            <Pressable 
              onPressIn={() => { editBtnScale.value = withSpring(0.96, SPRING_CONFIG); }}
              onPressOut={() => { editBtnScale.value = withSpring(1, SPRING_CONFIG); }}
              style={styles.secondaryOutlineActionButton} 
              onPress={handleNavigateEdit}
              disabled={isDeleting}
            >
              <Animated.View style={[styles.buttonInnerRow, animatedEditBtnStyle]}>
                <Ionicons name="create-outline" size={16} color="#1C1917" style={styles.actionButtonIconStyle} />
                <Text style={styles.secondaryButtonLabelText}>Edit Item</Text>
              </Animated.View>
            </Pressable>

            <Pressable 
              onPressIn={() => { deleteBtnScale.value = withSpring(0.96, SPRING_CONFIG); }}
              onPressOut={() => { deleteBtnScale.value = withSpring(1, SPRING_CONFIG); }}
              style={[styles.destructiveOutlineActionButton, isDeleting && styles.disabledActionOpacity]} 
              onPress={handleExecuteDelete}
              disabled={isDeleting}
            >
              <Animated.View style={[styles.buttonInnerRow, animatedDeleteBtnStyle]}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#DC2626" style={styles.actionButtonIconStyle} />
                    <Text style={styles.destructiveButtonLabelText}>Delete</Text>
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
    backgroundColor: '#F5F5F4',
  },
  garmentCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderGraphicContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E7E5E4',
  },
  detailCardBody: {
    marginTop: -24,
    backgroundColor: '#FAFAF9',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78716C',
  },
  attributesSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  attributesSpecificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 3,
    elevation: 1,
  },
  gridAttributeCell: {
    width: '50%',
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#F5F5F4',
  },
  attributeLabelText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  attributeValueText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1917',
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
    borderColor: '#E7E5E4',
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
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1917',
  },
  destructiveOutlineActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  destructiveButtonLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
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
    backgroundColor: '#FAFAF9',
  },
  loadingProgressMessageText: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});