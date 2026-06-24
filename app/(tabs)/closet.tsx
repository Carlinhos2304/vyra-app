import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Dimensions,
  FlatList,
  Image,
  Animated,
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Pressable, // <-- Add this line
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { StaggeredListWrapper } from '../../constants/motion/StaggeredListWrapper';
import { SectionHeader } from '../../components/ui/SectionHeader'; 
import { SectionTitle } from '../../components/ui/SectionTitle';

// Supabase client instance integration
import { supabase } from '../../lib/supabase';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;
const TAB_WIDTH = (width - 32) / 2; // Screen width minus padding divided by two options

type ClosetTab = 'Garments' | 'Outfits';

interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  brand: string;
  color: string;
  image_url: string; 
  created_at?: string;
  is_favorite?: boolean; // Added support for favorites flag mapping
}

interface OutfitCard {
  id: string;
  name: string;
  occasion: string | null;
  coverImage: string | null;
  garmentCount: number;
  created_at: string;
}

const CATEGORIES = [
  { id: 'All', label: 'All', icon: 'view-grid' },
  { id: 'Tops', label: 'Tops', icon: 'tshirt-crew' },
  { id: 'Bottoms', label: 'Bottoms', icon: 'human-legs' },
  { id: 'Dresses', label: 'Dresses', icon: 'hanger' },
  { id: 'Outerwear', label: 'Outerwear', icon: 'coat-rack' },
  { id: 'Shoes', label: 'Shoes', icon: 'shoe-sneaker' },
  { id: 'Bags', label: 'Bags', icon: 'bag-personal' },
  { id: 'Accessories', label: 'Accessories', icon: 'watch-variant' },
  { id: 'Jewelry', label: 'Jewelry', icon: 'diamond-stone' },
  { id: 'Hats', label: 'Hats', icon: 'hat-fedora' },
  { id: 'Swimwear', label: 'Swimwear', icon: 'hanger' },
  { id: 'Activewear', label: 'Activewear', icon: 'run-fast' },
];

type SortOption = 'Newest First' | 'Oldest First' | 'A-Z' | 'Z-A';

// Filter State Domain Interface Definition
interface FilterState {
  category: string;
  color: string;
  brand: string;
  favoritesOnly: boolean;
  sortBy: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  category: 'All',
  color: 'All Colors',
  brand: 'All Brands',
  favoritesOnly: false,
  sortBy: 'Newest First',
};

export default function ClosetScreen() {
  const [activeTab, setActiveTab] = useState<ClosetTab>('Garments');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Async data layer state primitives
  const [garments, setGarments] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<OutfitCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Advanced Filtering System Infrastructure States
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [persistedFilters, setPersistedFilters] = useState<FilterState>(INITIAL_FILTERS);
  
  // Staging filters for the open drawer before the user hits "Apply Filters"
  const [stagedCategory, setStagedCategory] = useState('All');
  const [stagedColor, setStagedColor] = useState('All Colors');
  const [stagedBrand, setStagedBrand] = useState('All Brands');
  const [stagedFavorites, setStagedFavorites] = useState(false);
  const [stagedSortBy, setStagedSortBy] = useState<SortOption>('Newest First');

  const params = useLocalSearchParams<{ refresh?: string }>();

  // Entry Transition Animation Nodes
  const entryHeaderOpacity = useRef(new Animated.Value(0)).current;
  const entryHeaderTranslateY = useRef(new Animated.Value(-8)).current;
  
  const searchBarOpacity = useRef(new Animated.Value(0)).current;
  const searchBarTranslateY = useRef(new Animated.Value(8)).current;

  const filtersOpacity = useRef(new Animated.Value(0)).current;
  const filtersTranslateY = useRef(new Animated.Value(6)).current;

  // Empty state micro-scaling nodes
  const emptyScaleAnim = useRef(new Animated.Value(0.96)).current;
  const emptyOpacityAnim = useRef(new Animated.Value(0)).current;

  // iOS-Style Minimal Underline Segment Interpolation Node
  const tabUnderlineX = useRef(new Animated.Value(0)).current;

  // Sync horizontal transition for the active tab underline
  useEffect(() => {
    Animated.timing(tabUnderlineX, {
      toValue: activeTab === 'Garments' ? 0 : TAB_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Synchronize top horizontally scrolled category tab bar with modal selection changes
  useEffect(() => {
    if (persistedFilters.category !== activeCategory) {
      setPersistedFilters(prev => ({ ...prev, category: activeCategory }));
    }
  }, [activeCategory]);

  const synchronizeClosetDataStore = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('Your active session token expired. Please authenticate through login window again.');
        setIsLoading(false);
        return;
      }

      if (activeTab === 'Garments') {
        const { data, error: garmentQueryErr } = await supabase
          .from('clothing_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (garmentQueryErr) throw garmentQueryErr;
        setGarments((data as ClothingItem[]) || []);
      } else {
        console.log('[Closet Core Pipeline] Syncing Outfits Lookbooks using embedded joins...');
        
        const { data: rawOutfitsData, error: outfitQueryErr } = await supabase
          .from('outfits')
          .select(`
            id,
            name,
            occasion,
            created_at,
            outfit_items (
              clothing_items (
                image_url
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (outfitQueryErr) throw outfitQueryErr;
        
        console.log(`[Closet Core Pipeline Debug] Raw outfits fetched: ${rawOutfitsData?.length || 0}`);

        const transformedOutfits: OutfitCard[] = (rawOutfitsData || []).map((outfit: any) => {
          const itemsArray = outfit.outfit_items || [];
          const garmentCount = itemsArray.length;
          
          let coverImage: string | null = null;
          if (garmentCount > 0 && itemsArray[0].clothing_items) {
            coverImage = itemsArray[0].clothing_items.image_url || null;
          }

          return {
            id: outfit.id,
            name: outfit.name,
            occasion: outfit.occasion,
            coverImage: coverImage,
            garmentCount: garmentCount,
            created_at: outfit.created_at,
          };
        });

        setOutfits(transformedOutfits);
      }
    } catch (err: any) {
      console.error('[Closet Refactored Pipeline Crash]:', err);
      setError(err.message || 'An error occurred while synchronizing database entities.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      synchronizeClosetDataStore();
    }, [activeTab, params.refresh])
  );

  // Dynamic Metadata Introspection (Generates unique options from in-memory garments)
  const uniqueColors = useMemo(() => {
    const list = new Set<string>();
    garments.forEach(g => { if (g.color) list.add(g.color.trim()); });
    return ['All Colors', ...Array.from(list)];
  }, [garments]);

  const uniqueBrands = useMemo(() => {
    const list = new Set<string>();
    garments.forEach(g => { if (g.brand) list.add(g.brand.trim()); });
    return ['All Brands', ...Array.from(list).filter(b => b !== 'Unbranded' && b !== 'Unknown Brand')];
  }, [garments]);

  // Modal Sheet Interaction Event Loops
  const handleOpenFilterPanel = () => {
    setStagedCategory(persistedFilters.category);
    setStagedColor(persistedFilters.color);
    setStagedBrand(persistedFilters.brand);
    setStagedFavorites(persistedFilters.favoritesOnly);
    setStagedSortBy(persistedFilters.sortBy);
    setIsFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const nextFilters: FilterState = {
      category: stagedCategory,
      color: stagedColor,
      brand: stagedBrand,
      favoritesOnly: stagedFavorites,
      sortBy: stagedSortBy,
    };
    setPersistedFilters(nextFilters);
    setActiveCategory(stagedCategory); // Sync up the horizontal scroller
    setIsFilterModalVisible(false);
  };

  const handleClearAllFilters = () => {
    setPersistedFilters(INITIAL_FILTERS);
    setActiveCategory('All');
    setIsFilterModalVisible(false);
  };

  // Highly-optimized Multi-Conditional Filtering & Sorting Algorithms
  const filteredGarments = useMemo(() => {
    let result = [...garments];

    // 1. Text Search Query Parameter Matches
    if (searchQuery.trim().length > 0) {
      const targetQuery = searchQuery.toLowerCase().trim();
      result = result.filter(g => 
        (g.name?.toLowerCase().includes(targetQuery)) ||
        (g.brand?.toLowerCase().includes(targetQuery))
      );
    }

    // 2. Category Classification Constraints
    if (persistedFilters.category !== 'All') {
      result = result.filter(g => g.category === persistedFilters.category);
    }

    // 3. Color Profile Contours
    if (persistedFilters.color !== 'All Colors') {
      result = result.filter(g => g.color?.trim() === persistedFilters.color);
    }

    // 4. Brand Specific Selection Chains
    if (persistedFilters.brand !== 'All Brands') {
      result = result.filter(g => g.brand?.trim() === persistedFilters.brand);
    }

    // 5. Favorites Toggle Evaluation
    if (persistedFilters.favoritesOnly) {
      result = result.filter(g => g.is_favorite === true);
    }

    // 6. Sort Direction Resolution Map
    result.sort((a, b) => {
      if (persistedFilters.sortBy === 'Oldest First') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (persistedFilters.sortBy === 'A-Z') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (persistedFilters.sortBy === 'Z-A') {
        return (b.name || '').localeCompare(a.name || '');
      }
      // Default fallback matrix: Newest First
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return result;
  }, [garments, searchQuery, persistedFilters]);

  const filteredOutfits = useMemo(() => {
    let result = [...outfits];

    // Outfits evaluation handles Search Queries and cross-checks chronological sort filters
    if (searchQuery.trim().length > 0) {
      const targetQuery = searchQuery.toLowerCase().trim();
      result = result.filter(o => 
        (o.name?.toLowerCase().includes(targetQuery)) ||
        (o.occasion?.toLowerCase().includes(targetQuery))
      );
    }

    result.sort((a, b) => {
      if (persistedFilters.sortBy === 'Oldest First') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (persistedFilters.sortBy === 'A-Z') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (persistedFilters.sortBy === 'Z-A') {
        return (b.name || '').localeCompare(a.name || '');
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return result;
  }, [outfits, searchQuery, persistedFilters.sortBy]);

  const activeRenderDataset = activeTab === 'Garments' ? filteredGarments : filteredOutfits;

  useEffect(() => {
    Animated.stagger(70, [
      Animated.parallel([
        Animated.timing(entryHeaderOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(entryHeaderTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(searchBarOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(searchBarTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(filtersOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(filtersTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (!isLoading && activeRenderDataset.length === 0) {
      Animated.parallel([
        Animated.timing(emptyOpacityAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(emptyScaleAnim, { toValue: 1, tension: 28, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      emptyOpacityAnim.setValue(0);
      emptyScaleAnim.setValue(0.96);
    }
  }, [activeRenderDataset.length, isLoading]);

  const handleAddNewClosetAsset = () => {
    if (activeTab === 'Garments') {
      router.push('../clothing/add-garment');
    } else {
      router.push('../clothing/create-outfit');
    }
  };

  const renderListCardItem = ({ item, index }: { item: any; index: number }) => {
    if (activeTab === 'Garments') {
      const garmentItem = item as ClothingItem;
      return (
        <StaggeredListWrapper index={index}>
          <PremiumCard 
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: 'clothing/[id]',
                params: {
                  id: garmentItem.id,
                  name: garmentItem.name,
                  brand: garmentItem.brand,
                  category: garmentItem.category,
                  image: garmentItem.image_url, 
                  color: garmentItem.color,
                },
              })
            }
          >
            <View style={styles.imageWrapper}>
              <Image source={{ uri: garmentItem.image_url }} style={styles.imageGarmentImage} />
              <View style={[styles.colorIndicator, { backgroundColor: garmentItem.color || '#CCCCCC' }]} />
            </View>

            <View style={styles.cardInfo}>
              <SectionTitle withBottomMargin>{garmentItem.brand || 'Unbranded'}</SectionTitle>
              <Text style={styles.garmentName} numberOfLines={1}>
                {garmentItem.name}
              </Text>
              <View style={styles.rowMetadata}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{garmentItem.category}</Text>
                </View>
              </View>
            </View>
          </PremiumCard>
        </StaggeredListWrapper>
      );
    } else {
      const outfitItem = item as OutfitCard;
      return (
        <StaggeredListWrapper index={index}>
          <PremiumCard 
            style={styles.card} 
            onPress={() => router.push({
              pathname: '/outfit/[id]',
              params: { id: outfitItem.id }
            })}
          >
            {outfitItem.coverImage ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: outfitItem.coverImage }} style={styles.imageGarmentImage} />
                {outfitItem.occasion && (
                  <View style={styles.occasionPillFloatingFloating}>
                    <Text style={styles.occasionPillFloatingText} numberOfLines={1}>
                      {outfitItem.occasion}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.outfitPlaceholderContainer}>
                <View style={styles.outfitIconBadgeCircle}>
                  <MaterialCommunityIcons name="hanger" size={22} color="#78716C" />
                </View>
                <View style={styles.outfitSparkleCorner}>
                  <MaterialCommunityIcons name="sparkles" size={12} color="#1C1917" />
                </View>
              </View>
            )}

            <View style={styles.cardInfo}>
              <SectionTitle numberOfLines={1} style={styles.outfitTitleBoldStyle}>
                {outfitItem.name}
              </SectionTitle>
              
              <View style={styles.rowMetadata}>
                <Text style={styles.outfitGarmentsCountSubtitleStyle}>
                  {outfitItem.garmentCount} {outfitItem.garmentCount === 1 ? 'garment' : 'garments'}
                </Text>
                {!outfitItem.coverImage && outfitItem.occasion && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{outfitItem.occasion}</Text>
                  </View>
                )}
              </View>
            </View>
          </PremiumCard>
        </StaggeredListWrapper>
      );
    }
  };

  const isAnyFilterActive = persistedFilters.color !== 'All Colors' || 
                            persistedFilters.brand !== 'All Brands' || 
                            persistedFilters.favoritesOnly || 
                            persistedFilters.sortBy !== 'Newest First';

  return (
    <PremiumScreen>
      <FlatList
        data={activeRenderDataset}
        renderItem={renderListCardItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        extraData={[activeCategory, activeTab, garments, outfits, persistedFilters]} 
        ListHeaderComponent={
          <View style={styles.headerStack}>
            
            {/* Minimal Premium Top Header Section with Embedded Action Button */}
            <Animated.View style={[
              styles.titleRow,
              { opacity: entryHeaderOpacity, transform: [{ translateY: entryHeaderTranslateY }] }
            ]}>
              <SectionHeader 
                title="My Closet" 
                subtitle={isLoading ? "Updating vault..." : `${activeRenderDataset.length} curated listings`}
                style={styles.headerFlexOverride}
              />
              <PremiumTouchable 
                style={styles.actionAddButton} 
                onPress={handleAddNewClosetAsset}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="plus" size={20} color="#1C1917" />
              </PremiumTouchable>
            </Animated.View>

            {/* iOS-Style Underline Minimalist Tab Controller */}
            <View style={styles.iosTabControlContainer}>
              {(['Garments', 'Outfits'] as ClosetTab[]).map((tab) => {
                const isSelected = activeTab === tab;
                return (
                  <PremiumTouchable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={styles.iosTabItemButton}
                  >
                    <Text style={[styles.iosTabLabel, isSelected && styles.iosTabLabelActive]}>
                      {tab}
                    </Text>
                  </PremiumTouchable>
                );
              })}
              <Animated.View 
                style={[
                  styles.iosAnimatedUnderline, 
                  { 
                    width: TAB_WIDTH,
                    transform: [{ translateX: tabUnderlineX }] 
                  }
                ]} 
              />
            </View>

            {/* Global Search Interface Control */}
            <Animated.View style={[
              styles.searchContainer,
              { opacity: searchBarOpacity, transform: [{ translateY: searchBarTranslateY }] }
            ]}>
              <Feather name="search" size={16} color="#78716C" style={styles.searchIcon} />
              <TextInput
                placeholder={activeTab === 'Garments' ? "Search garments..." : "Search compiled outfits..."}
                placeholderTextColor="#78716C"
                style={styles.textInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <PremiumTouchable 
                style={[styles.filterButton, isAnyFilterActive && styles.filterButtonActiveAccent]} 
                onPress={handleOpenFilterPanel}
              >
                <MaterialCommunityIcons 
                  name="filter-variant" 
                  size={18} 
                  color={isAnyFilterActive ? '#FAFAF9' : '#1C1917'} 
                />
              </PremiumTouchable>
            </Animated.View>

            {/* Horizontal Filter Tracks for garments explicitly */}
            {activeTab === 'Garments' && (
              <Animated.View style={[
                styles.categoryScroller,
                { opacity: filtersOpacity, transform: [{ translateY: filtersTranslateY }] }
              ]}>
                <FlatList
                  horizontal
                  data={CATEGORIES}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesContent}
                  renderItem={({ item }) => {
                    const isActive = activeCategory === item.id;
                    return (
                      <PremiumTouchable
                        onPress={() => setActiveCategory(item.id)}
                        style={[
                          styles.categoryTab,
                          isActive ? styles.categoryTabActive : styles.categoryTabInactive,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={item.icon as any}
                          size={14}
                          color={isActive ? '#FAFAF9' : '#1C1917'}
                          style={styles.categoryIcon}
                        />
                        <Text
                          style={[
                            styles.categoryLabel,
                            isActive ? styles.categoryLabelActive : styles.categoryLabelInactive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </PremiumTouchable>
                    );
                  }}
                />
              </Animated.View>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centeredStateFrame}>
              <ActivityIndicator size="small" color="#1C1917" />
            </View>
          ) : error ? (
            <View style={styles.centeredStateFrame}>
              <MaterialCommunityIcons name="alert-circle-outline" size={28} color="#EF4444" style={styles.errorIcon} />
              <Text style={styles.errorTextHeading}>Failed to load items</Text>
              <Text style={styles.errorTextSubtitle}>{error}</Text>
              <PremiumTouchable style={styles.retryButton} onPress={synchronizeClosetDataStore}>
                <Text style={styles.retryButtonText}>Retry Connection</Text>
              </PremiumTouchable>
            </View>
          ) : (
            <Animated.View style={[
              styles.emptyStateContainer, 
              { opacity: emptyOpacityAnim, transform: [{ scale: emptyScaleAnim }] }
            ]}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons 
                  name={activeTab === 'Garments' ? "hanger" : "sparkles"} 
                  size={24} 
                  color="#78716C" 
                />
              </View>
              <Text style={styles.emptyStateTitle}>
                {activeTab === 'Garments' ? "No pieces match" : "No Outfits Yet"}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {activeTab === 'Garments' 
                  ? "Try re-adjusting your active text queries or structural tags."
                  : "Create your first outfit from the Create tab."}
              </Text>
            </Animated.View>
          )
        }
      />

      {/* Advanced Drawer Filter Sheet Overlay Viewport Component */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalBackdropOverlay}>
          <SafeAreaView style={styles.modalSafeBoundary} edges={['bottom']}>
            <View style={styles.bottomSheetFrame}>
              <View style={styles.bottomSheetDraggerBar} />

              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeadingTitle}>Filter Closet Storage</Text>
                <PremiumTouchable onPress={() => setIsFilterModalVisible(false)} style={styles.modalCloseTouchTarget}>
                  <Feather name="x" size={20} color="#78716C" />
                </PremiumTouchable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody}>
                {/* 1. Category Chip Matrix Selector Layout */}
                <Text style={styles.filterSectionLabel}>Category Block</Text>
                <View style={styles.modalChipsContainerRow}>
                  {CATEGORIES.map((item) => {
                    const isSelected = stagedCategory === item.id;
                    return (
                      <PremiumTouchable
                        key={item.id}
                        onPress={() => setStagedCategory(item.id)}
                        style={[styles.modalChipItem, isSelected ? styles.modalChipItemSelected : styles.modalChipItemUnselected]}
                      >
                        <Text style={[styles.modalChipText, isSelected ? styles.modalChipTextSelected : styles.modalChipTextUnselected]}>
                          {item.label}
                        </Text>
                      </PremiumTouchable>
                    );
                  })}
                </View>

                {/* 2. Color Profile Dynamic Multi-Swatch Selector Track */}
                <Text style={styles.filterSectionLabel}>Dominant Color Variant</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollGap}>
                  {uniqueColors.map((colorItem) => {
                    const isSelected = stagedColor === colorItem;
                    const isHex = colorItem.startsWith('#');
                    return (
                      <PremiumTouchable
                        key={colorItem}
                        onPress={() => setStagedColor(colorItem)}
                        style={[
                          styles.colorTextChip, 
                          isSelected ? styles.modalChipItemSelected : styles.modalChipItemUnselected
                        ]}
                      >
                        {isHex && (
                          <View style={[styles.inlineColorIndicatorCircle, { backgroundColor: colorItem }]} />
                        )}
                        <Text style={[styles.modalChipText, isSelected ? styles.modalChipTextSelected : styles.modalChipTextUnselected]}>
                          {isHex ? colorItem.toUpperCase() : colorItem}
                        </Text>
                      </PremiumTouchable>
                    );
                  })}
                </ScrollView>

                {/* 3. Brand Entity Dynamic List Scroller Track */}
                <Text style={styles.filterSectionLabel}>Brand Reference Line</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollGap}>
                  {uniqueBrands.map((brandItem) => {
                    const isSelected = stagedBrand === brandItem;
                    return (
                      <PremiumTouchable
                        key={brandItem}
                        onPress={() => setStagedBrand(brandItem)}
                        style={[styles.modalChipItem, isSelected ? styles.modalChipItemSelected : styles.modalChipItemUnselected]}
                      >
                        <Text style={[styles.modalChipText, isSelected ? styles.modalChipTextSelected : styles.modalChipTextUnselected]}>
                          {brandItem}
                        </Text>
                      </PremiumTouchable>
                    );
                  })}
                </ScrollView>

                {/* 4. Sequential Chronological Sorting Modes */}
                <Text style={styles.filterSectionLabel}>Sort Sequence Hierarchy</Text>
                <View style={styles.modalChipsContainerRow}>
                  {(['Newest First', 'Oldest First', 'A-Z', 'Z-A'] as SortOption[]).map((option) => {
                    const isSelected = stagedSortBy === option;
                    return (
                      <PremiumTouchable
                        key={option}
                        onPress={() => setStagedSortBy(option)}
                        style={[styles.modalChipItem, isSelected ? styles.modalChipItemSelected : styles.modalChipItemUnselected]}
                      >
                        <Text style={[styles.modalChipText, isSelected ? styles.modalChipTextSelected : styles.modalChipTextUnselected]}>
                          {option}
                        </Text>
                      </PremiumTouchable>
                    );
                  })}
                </View>

                {/* 5. Favorites Toggle Parameter Block Switch */}
                <View style={styles.toggleRowBlockContainer}>
                  <View>
                    <Text style={styles.toggleLabelText}>Favorites Selection Boundary</Text>
                    <Text style={styles.toggleSublabelText}>Isolate only items tagged as favorites</Text>
                  </View>
                  <Switch
                    value={stagedFavorites}
                    onValueChange={setStagedFavorites}
                    trackColor={{ false: '#E7E5E4', true: '#1C1917' }}
                    thumbColor={stagedFavorites ? '#FAFAF9' : '#F5F5F4'}
                    ios_backgroundColor="#E7E5E4"
                  />
                </View>
              </ScrollView>

              {/* Layout Submission Control Rows */}
              <View style={styles.modalActionButtonsRow}>
                <Pressable onPress={handleClearAllFilters} style={styles.modalSecondaryButton}>
                  <Text style={styles.modalSecondaryButtonText}>Clear All</Text>
                </Pressable>
                
                <Pressable onPress={handleApplyFilters} style={styles.modalPrimaryButton}>
                  <Text style={styles.modalPrimaryButtonText}>Apply Filters</Text>
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
  listContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  headerStack: { marginBottom: 4 },
  
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  headerFlexOverride: { flex: 1, paddingVertical: 0 },
  actionAddButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E7E5E4' },
  
  iosTabControlContainer: { flexDirection: 'row', position: 'relative', marginTop: 4, marginBottom: 8, borderBottomWidth: 1, borderColor: '#E7E5E4' },
  iosTabItemButton: { width: TAB_WIDTH, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  iosTabLabel: { fontSize: 14, fontWeight: '400', color: '#78716C', letterSpacing: 0.3 },
  iosTabLabelActive: { color: '#1C1917', fontWeight: '600' },
  iosAnimatedUnderline: { position: 'absolute', bottom: -1, height: 2, backgroundColor: '#1C1917', left: 0 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F4', borderRadius: 12, height: 42, paddingHorizontal: 12, marginVertical: 8 },
  searchIcon: { marginRight: 8 },
  textInput: { flex: 1, fontSize: 14, color: '#1C1917' },
  filterButton: { padding: 6, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  filterButtonActiveAccent: { backgroundColor: '#1C1917' },
  categoryScroller: { marginHorizontal: -16, marginBottom: 8, marginTop: 4 },
  categoriesContent: { paddingHorizontal: 16, gap: 6, paddingVertical: 2 },
  categoryTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryTabActive: { backgroundColor: '#1C1917', borderColor: '#1C1917' },
  categoryTabInactive: { backgroundColor: 'transparent', borderColor: '#E7E5E4' },
  categoryIcon: { marginRight: 4 },
  categoryLabel: { fontSize: 12, fontWeight: '500' },
  categoryLabelActive: { color: '#FAFAF9' },
  categoryLabelInactive: { color: '#1C1917' },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  card: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F5F5F4', padding: 0, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  imageWrapper: { width: '100%', height: CARD_WIDTH * 1.3, backgroundColor: '#F5F5F4', position: 'relative' },
  imageGarmentImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  colorIndicator: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
  
  outfitTitleBoldStyle: { color: '#1C1917', fontSize: 14, fontWeight: '600', letterSpacing: 0.1, marginBottom: 2 },
  outfitGarmentsCountSubtitleStyle: { fontSize: 12, fontWeight: '400', color: '#78716C' },
  occasionPillFloatingFloating: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(255, 255, 255, 0.90)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 0.5, borderColor: '#E7E5E4' },
  occasionPillFloatingText: { fontSize: 10, fontWeight: '500', color: '#1C1917', letterSpacing: 0.2 },
  
  outfitPlaceholderContainer: { width: '100%', height: CARD_WIDTH * 1.3, backgroundColor: '#F5F5F4', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  outfitIconBadgeCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7E5E4' },
  outfitSparkleCorner: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FAFAF9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7E5E4' },
  
  cardInfo: { padding: 10 },
  garmentName: { fontSize: 13, fontWeight: '400', color: '#1C1917', marginBottom: 6 },
  rowMetadata: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E7E5E4', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '500', color: '#78716C' },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 32 },
  emptyIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F5F4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyStateTitle: { fontSize: 14, fontWeight: '500', color: '#1C1917', marginBottom: 4 },
  emptyStateSubtitle: { fontSize: 12, color: '#78716C', textAlign: 'center', lineHeight: 16 },
  centeredStateFrame: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  errorIcon: { marginBottom: 10 },
  errorTextHeading: { fontSize: 15, fontWeight: '600', color: '#1C1917', marginBottom: 4 },
  errorTextSubtitle: { fontSize: 12, color: '#78716C', textAlign: 'center', marginBottom: 16, lineHeight: 16 },
  retryButton: { backgroundColor: '#1C1917', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  retryButtonText: { color: '#FAFAF9', fontSize: 12, fontWeight: '600' },

  // Filter Backdrop Modal Styling System Mapping Blocks
  modalBackdropOverlay: { flex: 1, backgroundColor: 'rgba(28, 25, 23, 0.4)', justifyContent: 'flex-end' },
  modalSafeBoundary: { width: '100%' },
  bottomSheetFrame: { backgroundColor: '#FAFAF9', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, maxHeight: SCREEN_HEIGHT * 0.85, shadowColor: '#1C1917', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
  bottomSheetDraggerBar: { width: 36, height: 4, backgroundColor: '#E7E5E4', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderColor: '#E7E5E4' },
  modalHeadingTitle: { fontSize: 16, fontWeight: '600', color: '#1C1917', letterSpacing: -0.2 },
  modalCloseTouchTarget: { padding: 4 },
  modalScrollBody: { paddingVertical: 12 },
  filterSectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', color: '#78716C', letterSpacing: 0.8, marginTop: 14, marginBottom: 10 },
  modalChipsContainerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  horizontalScrollGap: { gap: 8, paddingVertical: 2 },
  modalChipItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  colorTextChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  inlineColorIndicatorCircle: { width: 12, height: 12, borderRadius: 6, marginRight: 6, borderWidth: 0.5, borderColor: '#78716C' },
  modalChipItemUnselected: { backgroundColor: '#FFFFFF', borderColor: '#E7E5E4' },
  modalChipItemSelected: { backgroundColor: '#1C1917', borderColor: '#1C1917' },
  modalChipText: { fontSize: 12, fontWeight: '500' },
  modalChipTextUnselected: { color: '#1C1917' },
  modalChipTextSelected: { color: '#FAFAF9' },
  toggleRowBlockContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 12, padding: 14, marginTop: 20, marginBottom: 12 },
  toggleLabelText: { fontSize: 13, fontWeight: '600', color: '#1C1917' },
  toggleSublabelText: { fontSize: 11, color: '#78716C', marginTop: 1 },
  modalActionButtonsRow: { flexDirection: 'row', gap: 12, paddingTop: 14, borderTopWidth: 1, borderColor: '#E7E5E4', marginTop: 8 },
  modalSecondaryButton: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E7E5E4', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  modalSecondaryButtonText: { color: '#78716C', fontSize: 14, fontWeight: '600' },
  modalPrimaryButton: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#1C1917', justifyContent: 'center', alignItems: 'center' },
  modalPrimaryButtonText: { color: '#FAFAF9', fontSize: 14, fontWeight: '600' },
});