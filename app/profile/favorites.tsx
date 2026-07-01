import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PremiumLoader } from '../../components/ui/PremiumLoader';

import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface ClothingItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  color: string | null;
  image_url: string | null;
  is_favorite: boolean;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = async (showRefresher = false) => {
    if (showRefresher) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User context validation failed.');
      }

      const { data, error: dbError } = await supabase
        .from('clothing_items')
        .select('id, name, brand, category, color, image_url, is_favorite')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      setFavorites(data || []);
    } catch (err: any) {
      console.error('[Favorites Engine Error]:', err);
      setError(err.message || 'Failed to sync favorite garments.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRefresh = () => {
    fetchFavorites(true);
  };

  const renderFavoriteItem = ({ item }: { item: ClothingItem }) => {
    const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=F5F5F4&color=1C1917&size=200`;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/clothing/${item.id}` as any)}
        style={styles.garmentCard}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url || fallbackImage }}
            style={styles.garmentImage}
          />
        </View>

        <View style={styles.metadataContainer}>
          {item.brand && (
            <Text style={styles.brandText} numberOfLines={1}>
              {item.brand.toUpperCase()}
            </Text>
          )}
          <Text style={styles.nameText} numberOfLines={1}>
            {item.name}
          </Text>
          
          <View style={styles.attributesRow}>
            {item.category && (
              <View style={styles.attributeChip}>
                <Text style={styles.attributeChipText}>{item.category}</Text>
              </View>
            )}
            {item.color && (
              <View style={styles.attributeChip}>
                <Text style={styles.attributeChipText}>{item.color}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionColumn}>
          <Ionicons name="heart" size={20} color="#1C1917" style={styles.heartIcon} />
          <Ionicons name="chevron-forward" size={16} color="#A8A29E" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyCenterContainer}>
      <Text style={styles.emptyHeartIcon}>♡</Text>
      <Text style={styles.emptyTitleText}>No favorite garments yet</Text>
      <Text style={styles.emptySubtitleText}>
        Start adding favorites from your wardrobe.
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/closet' as any)}
        style={styles.goToClosetButton}
      >
        <Text style={styles.goToClosetButtonText}>Go to Closet</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyCenterContainer}>
      <MaterialCommunityIcons name="cloud-off-outline" size={32} color="#1C1917" style={{ opacity: 0.6 }} />
      <Text style={styles.errorTitleText}>Sync Connection Fault</Text>
      <Text style={styles.errorSubtitleText}>{error}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => fetchFavorites(false)}
        style={styles.goToClosetButton}
      >
        <Text style={styles.goToClosetButtonText}>Retry Connection</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
        {/* Top Minimal Navigation Header Stack */}
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton} 
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#1C1917" />
          </TouchableOpacity>
          <SectionHeader title="Favorites" style={styles.headerFlexOverride} />
        </View>

        {/* Content Arena Split Route Conditional Evaluation */}
        {isLoading ? (
          <View style={styles.loadingCenterContainer}>
            <PremiumLoader label="Syncing favorites pool..." />
          </View>
        ) : error ? (
          renderErrorState()
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={renderFavoriteItem}
            contentContainerStyle={styles.listScrollContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        )}
      </SafeAreaView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
    marginTop: 2,
  },
  headerFlexOverride: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  loadingCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  garmentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 3,
    elevation: 1,
  },
  imageContainer: {
    width: 64,
    height: 76,
    borderRadius: 8,
    backgroundColor: '#F5F5F4',
    overflow: 'hidden',
  },
  garmentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  metadataContainer: {
    flex: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1917',
    marginBottom: 6,
  },
  attributesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attributeChip: {
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#E7E5E4',
  },
  attributeChipText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  actionColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 4,
  },
  heartIcon: {
    marginTop: 1,
  },
  emptyCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyHeartIcon: {
    fontSize: 32,
    color: '#1C1917',
    fontWeight: '300',
    opacity: 0.4,
    marginBottom: 16,
  },
  emptyTitleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1917',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptySubtitleText: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  errorTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
    marginTop: 14,
    marginBottom: 6,
  },
  errorSubtitleText: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  goToClosetButton: {
    height: 48,
    backgroundColor: '#1C1917',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goToClosetButtonText: {
    color: '#FAFAF9',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});