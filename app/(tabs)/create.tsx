import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  FlatList,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  Animated,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { StaggeredListWrapper } from '../../constants/motion/StaggeredListWrapper';
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
const GRID_ITEM_WIDTH = (width - 44) / 2;

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

export default function CreateOutfitScreen() {
  const [outfitName, setOutfitName] = useState('');
  const [occasion, setOccasion] = useState<string | null>(null);
  
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedItems, setSelectedItems] = useState<Garment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchWardrobeGarments = async () => {
        try {
          if (isActive) setIsLoading(true);
          setError(null);
          console.log('[Outfit Creation] Loading garments...');

          const { data: { user }, error: authError } = await supabase.auth.getUser();

          if (authError || !user) {
            console.error('[Outfit Creation Error] User token evaluation failed or session missing:', authError);
            if (isActive) {
              setError('No active credentials verified.');
              setIsLoading(false);
            }
            return;
          }

          const { data, error: queryError } = await supabase
            .from('clothing_items')
            .select('*')
            .eq('user_id', user.id);

          if (queryError) throw queryError;

          if (isActive) {
            setGarments(data || []);
            if (data) {
              setSelectedItems((prev) => prev.filter((fav) => data.some((item) => item.id === fav.id)));
            }
          }
        } catch (err: any) {
          console.error('[Outfit Creation Error] Failed to load garments:', err);
          if (isActive) {
            setError(err.message || 'An unhandled exception occurred while fetching wardrobe entries.');
          }
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchWardrobeGarments();

      return () => {
        isActive = false;
      };
    }, [])
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

    // Predefined structure mapping pass logic
    CATEGORY_ORDER.forEach((catName) => {
      if (groups[catName] && groups[catName].length > 0) {
        orderedSections.push({ title: catName, data: groups[catName] });
        delete groups[catName];
      }
    });

    // Remainder unlisted grouping configurations pass logic
    Object.keys(groups).forEach((catName) => {
      if (groups[catName].length > 0) {
        orderedSections.push({ title: catName, data: groups[catName] });
      }
    });

    return orderedSections;
  }, [garments]);

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
    const hasShoes = selectedItems.some((item) => item.item_category === 'Shoes' || item.category === 'Shoes');

    if (!hasTop || !hasBottom || !hasShoes) {
      setErrorMessage('Your outfit must include at least 1 top, 1 bottom, and 1 pair of shoes.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('Session Error', 'Your credentials expired. Authenticate your session again.');
        return;
      }

      const { data: outfitRecord, error: outfitInsertError } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: sanitizedName,
          occasion: occasion,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (outfitInsertError || !outfitRecord) throw outfitInsertError;

      const relationalItemsPayloads = selectedItems.map((garment) => ({
        outfit_id: outfitRecord.id,
        clothing_item_id: garment.id,
      }));

      const { error: junctionInsertError } = await supabase
        .from('outfit_items')
        .insert(relationalItemsPayloads);

      if (junctionInsertError) {
        await supabase.from('outfits').delete().eq('id', outfitRecord.id);
        throw junctionInsertError;
      }

      // Premium inline success routing transition phase
      setSuccessMessage(`"${sanitizedName}" added to your lookbook.`);
      
      setTimeout(() => {
        // Complete visual layout reset clean context initialization prior to execution transition loops
        resetFormState();
        
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/closet');
        }
      }, 1800);

    } catch (err: any) {
      setError(err.message || 'An unexpected failure scenario caused save tasks to interrupt.');
      Alert.alert('Persistence Failure', err.message || 'Could not complete save transaction across cloud servers.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = (item: Garment) => {
    if (!selectedItems.some((selected) => selected.id === item.id)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleRemoveItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedItems(selectedItems.filter((item) => item.id !== id));
  };

  const renderAvailableItem = ({ item, index }: { item: Garment; index: number }) => {
    const isSelected = selectedItems.some((selected) => selected.id === item.id);
    const imageSource = item.image_url
      ? { uri: item.image_url }
      : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=F5F5F4&color=1C1917&size=250` };

    return (
      <StaggeredListWrapper index={index}>
        <PremiumCard
          onPress={isSelected ? () => handleRemoveItem(item.id) : () => handleAddItem(item)}
          style={[styles.gridCard, isSelected && styles.gridCardSelected]}
          disabled={isSaving}
        >
          <View style={styles.gridImageContainer}>
            <Image source={imageSource} style={styles.gridCardImage} />
            {isSelected ? (
              <View style={styles.gridImageOverlaySelected}>
                <View style={styles.checkmarkCircle}>
                  <Ionicons name="checkmark" size={16} color="#1C1917" />
                </View>
              </View>
            ) : (
              <View style={styles.gridImageOverlay}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.gridCardFooter}>
            <Text style={styles.gridCardName} numberOfLines={1}>
              {item.name || 'Unnamed Garment'}
            </Text>
            <Text style={styles.gridCardSubscript} numberOfLines={1}>
              {[item.brand, item.color].filter(Boolean).join(' • ') || item.category || 'Wardrobe Base'}
            </Text>
          </View>
        </PremiumCard>
      </StaggeredListWrapper>
    );
  };

  return (
    <PremiumScreen>
      <FlatList
        data={groupedGarments}
        keyExtractor={(item) => item.title}
        contentContainerStyle={styles.scrollPadding}
        showsVerticalScrollIndicator={false}
        extraData={selectedItems}
        renderItem={({ item: section }) => (
          <View key={section.title}>
            <View style={styles.categoryHeaderContainer}>
              <SectionTitle>
                {section.title}
              </SectionTitle>
            </View>
            <FlatList
               Goldman
              data={section.data}
              renderItem={renderAvailableItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              scrollEnabled={false}
              extraData={selectedItems}
            />
          </View>
        )}
        ListEmptyComponent={
          !isLoading && !error && garments.length === 0 ? (
            <View style={styles.stateCenterLoaderFrame}>
              <MaterialCommunityIcons name="hanger" size={40} color="#78716C" />
              <Text style={styles.errorHeaderTypography}>No Garments Found</Text>
              <Text style={styles.errorSubTypography}>
                Your wardrobe is empty. Add clothing items first to assemble an outfit combination.
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.topBar}>
              <SectionHeader
                title="Create Outfit"
                subtitle="Mix & match items from your wardrobe"
                style={styles.headerFlexOverride}
              />
              <PremiumTouchable 
                disabled={isLoading || isSaving || garments.length === 0}
                style={[styles.saveActionCircle, (isLoading || isSaving || garments.length === 0) && styles.saveActionCircleDisabled]} 
                onPress={handleSaveOutfitWorkflow}
              >
                {isSaving ? (
                  <View style={styles.saveLoaderContainer}>
                    <PremiumLoader />
                  </View>
                ) : (
                  <Ionicons name="save-outline" size={20} color="#FAFAF9" />
                )}
              </PremiumTouchable>
            </View>

            <View style={styles.formSection}>
              <SectionTitle withBottomMargin>Outfit Details</SectionTitle>
              <TextInput
                placeholder="Name your creation (e.g., Casual Friday)"
                placeholderTextColor="#78716C"
                value={outfitName}
                onChangeText={setOutfitName}
                editable={!isLoading && !isSaving}
                style={[styles.textInputControl, (isLoading || isSaving) && styles.textInputDisabled]}
              />

              {/* Standard React Native Animated Error Layout Container */}
              {errorMessage && (
                <Animated.View style={[styles.errorInlineBanner, { opacity: fadeAnim }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </Animated.View>
              )}

              {/* Premium Inline Success Banner Container */}
              {successMessage && (
                <Animated.View style={[styles.successInlineBanner, { opacity: successFadeAnim }]}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#10B981" />
                  <Text style={styles.successBannerText}>{successMessage}</Text>
                </Animated.View>
              )}
            </View>

            <View style={styles.canvasSection}>
              <View style={styles.canvasHeader}>
                <MaterialCommunityIcons name="sparkles" size={14} color="#1C1917" style={styles.sparkleIcon} />
                <SectionTitle>Outfit Canvas</SectionTitle>
              </View>

              {selectedItems.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <MaterialCommunityIcons name="hanger" size={32} color="#78716C" style={styles.emptyStateIcon} />
                  <Text style={styles.emptyStateText}>
                    Select garments from below to assemble your combination
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.canvasHorizontalTrack}
                >
                  {selectedItems.map((item) => {
                    const canvasImgSource = item.image_url ? { uri: item.image_url } : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=F5F5F4&color=1C1917` };
                    return (
                      <View key={item.id} style={styles.previewCanvasCard}>
                        <Image source={canvasImgSource} style={styles.canvasCardImage} />
                        <PremiumTouchable
                          disabled={isSaving}
                          style={styles.removeBadgeButton}
                          onPress={() => handleRemoveItem(item.id)}
                        >
                          <Ionicons name="close-circle" size={20} color="#1C1917" />
                        </PremiumTouchable>
                        <View style={styles.canvasCardLabelContainer}>
                          <Text style={styles.canvasCardNameText} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {isLoading && (
              <View style={styles.stateCenterLoaderFrame}>
                <PremiumLoader label="Retrieving Vyra vault assets..." />
              </View>
            )}

            {error && (
              <View style={styles.stateCenterLoaderFrame}>
                <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#EF4444" />
                <Text style={styles.errorHeaderTypography}>Failed to Synchronize</Text>
                <Text style={styles.errorSubTypography}>{error}</Text>
              </View>
            )}

            {!isLoading && !error && garments.length > 0 && (
              <View style={styles.dividerHeader}>
                <SectionTitle>Wardrobe Items</SectionTitle>
              </View>
            )}
          </View>
        }
      />
    </PremiumScreen>
  );
}

// ... styles object remains unchanged ...
const styles = StyleSheet.create({
  scrollPadding: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerBlock: {
    marginBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  headerFlexOverride: {
    flex: 1,
    paddingVertical: 0,
  },
  saveActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1917',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginTop: 2,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveActionCircleDisabled: {
    backgroundColor: '#E7E5E4',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveLoaderContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scale: 0.5 }], // Cleanly downscale the editorial horizontal track pulse
  },
  formSection: {
    marginVertical: 12,
  },
  textInputControl: {
    backgroundColor: '#F5F5F4',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1C1917',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  textInputDisabled: {
    opacity: 0.6,
    backgroundColor: '#E7E5E4',
  },
  errorInlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
    letterSpacing: -0.2,
    flex: 1,
  },
  successInlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  successBannerText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
    letterSpacing: -0.2,
    flex: 1,
  },
  canvasSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  canvasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sparkleIcon: {
    marginRight: 6,
  },
  emptyStateContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    marginBottom: 8,
    opacity: 0.7,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
  },
  canvasHorizontalTrack: {
    gap: 12,
    paddingRight: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  previewCanvasCard: {
    width: 90,
    position: 'relative',
  },
  canvasCardImage: {
    width: 90,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F5F5F4',
  },
  removeBadgeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  canvasCardLabelContainer: {
    marginTop: 4,
    paddingHorizontal: 2,
  },
  canvasCardNameText: {
    fontSize: 11,
    color: '#78716C',
    textAlign: 'center',
  },
  dividerHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridCard: {
    width: GRID_ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F5F5F4',
    padding: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  gridCardSelected: {
    borderColor: '#1C1917',
    backgroundColor: '#FAFAF9',
  },
  gridImageContainer: {
    width: '100%',
    height: GRID_ITEM_WIDTH * 1.33,
    backgroundColor: '#F5F5F4',
    position: 'relative',
  },
  gridCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridImageOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridImageOverlaySelected: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28, 25, 23, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAFAF9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  gridCardFooter: {
    padding: 10,
    alignItems: 'center',
  },
  gridCardName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1917',
    textAlign: 'center',
    marginBottom: 2,
  },
  gridCardSubscript: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '400',
    textAlign: 'center',
  },
  stateCenterLoaderFrame: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorHeaderTypography: {
    fontSize: 15,
    color: '#1C1917',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  errorSubTypography: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryHeaderContainer: {
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  categoryHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1917',
    textTransform: 'capitalize',
  },
});