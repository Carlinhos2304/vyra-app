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
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

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
  const { theme } = useTheme();
  const { t } = useLanguage();
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
        throw new Error(t('profile.favorites.errors.userContextFailed'));
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
      setError(err.message || t('profile.favorites.errors.fetchFailed'));
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
        style={[styles.garmentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}
      >
        <View style={[styles.imageContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
          <Image
            source={{ uri: item.image_url || fallbackImage }}
            style={styles.garmentImage}
          />
        </View>

        <View style={styles.metadataContainer}>
          {item.brand && (
            <Text style={[styles.brandText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {item.brand.toUpperCase()}
            </Text>
          )}
          <Text style={[styles.nameText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.attributesRow}>
            {item.category && (
              <View style={[styles.attributeChip, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                <Text style={[styles.attributeChipText, { color: theme.colors.textSecondary }]}>{item.category}</Text>
              </View>
            )}
            {item.color && (
              <View style={[styles.attributeChip, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                <Text style={[styles.attributeChipText, { color: theme.colors.textSecondary }]}>{item.color}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionColumn}>
          <Ionicons name="heart" size={20} color={theme.colors.textPrimary} style={styles.heartIcon} />
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyCenterContainer}>
      <Text style={[styles.emptyHeartIcon, { color: theme.colors.textPrimary }]}>♡</Text>
      <Text style={[styles.emptyTitleText, { color: theme.colors.textPrimary }]}>{t('profile.favorites.empty.title')}</Text>
      <Text style={[styles.emptySubtitleText, { color: theme.colors.textSecondary }]}>
        {t('profile.favorites.empty.subtitle')}
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/closet' as any)}
        style={[styles.goToClosetButton, { backgroundColor: theme.colors.accent }]}
      >
        <Text style={[styles.goToClosetButtonText, { color: theme.colors.accentForeground }]}>{t('profile.favorites.empty.goToCloset')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyCenterContainer}>
      <MaterialCommunityIcons name="cloud-off-outline" size={32} color={theme.colors.textPrimary} style={{ opacity: 0.6 }} />
      <Text style={[styles.errorTitleText, { color: theme.colors.textPrimary }]}>{t('profile.favorites.errors.connectionFaultTitle')}</Text>
      <Text style={[styles.errorSubtitleText, { color: theme.colors.textSecondary }]}>{error}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => fetchFavorites(false)}
        style={[styles.goToClosetButton, { backgroundColor: theme.colors.accent }]}
      >
        <Text style={[styles.goToClosetButtonText, { color: theme.colors.accentForeground }]}>{t('profile.favorites.errors.retryConnection')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <PremiumScreen>
      <SafeAreaView style={[styles.safeAreaContainer, { backgroundColor: theme.colors.background }]} edges={['top']}>
        {/* Top Minimal Navigation Header Stack */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <SectionHeader title={t('profile.favorites.title')} style={styles.headerFlexOverride} />
        </View>

        {/* Content Arena Split Route Conditional Evaluation */}
        {isLoading ? (
          <View style={styles.loadingCenterContainer}>
            <PremiumLoader label={t('profile.favorites.loadingFavorites')} />
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 3,
    elevation: 1,
  },
  imageContainer: {
    width: 64,
    height: 76,
    borderRadius: 8,
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
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  attributesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attributeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  attributeChipText: {
    fontSize: 11,
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
    fontWeight: '300',
    opacity: 0.4,
    marginBottom: 16,
  },
  emptyTitleText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptySubtitleText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  errorTitleText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  errorSubtitleText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  goToClosetButton: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goToClosetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
