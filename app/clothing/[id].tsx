import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
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

export default function ClothingDetailScreen() {
  const params = useLocalSearchParams<ClothingDetailSearchParams>();
  
  console.log("[Detail Screen] Received incoming routing parameters:", JSON.stringify(params));

  // Initialize unified state blueprint directly from search parameters safely
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

  // Helper utility to safely format IDs depending on whether your schema uses integers or UUID strings
  const getNormalizedId = (rawId: string): string | number => {
    const isNumeric = /^\d+$/.test(rawId);
    const normalized = isNumeric ? parseInt(rawId, 10) : rawId;
    console.log(`[ID Normalizer] Raw string "${rawId}" converted to token type [${typeof normalized}]:`, normalized);
    return normalized;
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
          .maybeSingle(); // Prevents crashing if the row was just removed completely

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
          // Fallback to local parameter values if row was not found
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

    // Optimistically update UI state to preserve ultra-premium responsiveness
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
      // Revert optimistic state mapping if transaction fails
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
      pathname: '/edit-garment',
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
      <View style={styles.navBarFloatingOverlay}>
        <TouchableOpacity 
          style={styles.navCircleActionButton} 
          onPress={() => {
            console.log("[Navigation] Returning control focus back to home closet context.");
            router.replace({ pathname: '/(tabs)/closet', params: { refresh: `back-${Date.now()}` } });
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#1C1917" />
        </TouchableOpacity>
        
        <View style={styles.navActionRightBlock}>
          <TouchableOpacity 
            style={styles.navCircleActionButton} 
            activeOpacity={0.8}
            onPress={handleToggleFavorite}
            disabled={isFavoriteLoading}
          >
            <Ionicons 
              name={garment.is_favorite ? "heart" : "heart-outline"} 
              size={20} 
              color={garment.is_favorite ? "#DC2626" : "#1C1917"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navCircleActionButton} 
            activeOpacity={0.8}
            onPress={handleNativeShare}
          >
            <Ionicons name="share-social-outline" size={20} color="#1C1917" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollLayout}>
        {/* Core Hero Showcase Image Framework */}
        <View style={styles.heroImageFrame}>
          {garment.image ? (
            <Image source={{ uri: garment.image }} style={styles.garmentCoverImage} />
          ) : (
            <View style={[styles.garmentCoverImage, styles.placeholderGraphicContainer]}>
              <Ionicons name="shirt-outline" size={48} color="#A8A29E" />
            </View>
          )}
        </View>

        {/* Informational Presentation Shell */}
        <View style={styles.detailCardBody}>
          <View style={styles.identityHeaderRow}>
            <SectionHeader
              title={garment.name}
              subtitle={garment.brand}
              style={styles.headerFlexOverride}
            />
            <View style={styles.categoryBadgeContainer}>
              <Text style={styles.categoryBadgeText}>{garment.category}</Text>
            </View>
          </View>

          {/* Attribute Structured Parameters Data Grid */}
          <View style={styles.attributesSection}>
            <SectionTitle withBottomMargin>Garment Details</SectionTitle>
            
            <View style={styles.attributesSpecificationGrid}>
              <View style={styles.gridAttributeCell}>
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
              </View>

              <View style={styles.gridAttributeCell}>
                <Text style={styles.attributeLabelText}>Catalog ID</Text>
                <Text style={styles.attributeValueText} numberOfLines={1}>
                  #{garment.id ? garment.id.toString().substring(0, 8) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Destructive Control Management Button Group Shelf */}
          <View style={styles.actionButtonGroupHorizontalRow}>
            <TouchableOpacity 
              style={styles.secondaryOutlineActionButton} 
              activeOpacity={0.7}
              onPress={handleNavigateEdit}
              disabled={isDeleting}
            >
              <Ionicons name="create-outline" size={16} color="#1C1917" style={styles.actionButtonIconStyle} />
              <Text style={styles.secondaryButtonLabelText}>Edit Item</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.destructiveOutlineActionButton, isDeleting && styles.disabledActionOpacity]} 
              activeOpacity={0.7}
              onPress={handleExecuteDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" style={styles.actionButtonIconStyle} />
                  <Text style={styles.destructiveButtonLabelText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  secondaryOutlineActionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1917',
  },
  destructiveOutlineActionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
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