import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { BackButton } from '../../components/ui/BackButton';
import { AnimatedListItem } from '../../components/ui/AnimatedListItem';
import Animated, { FadeIn, Easing } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { planOutfitForDate, planOutfitForEvent, SaveOutfitError } from '../../lib/services/outfitService';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

interface OutfitSelectionItem { id: string; name: string; occasion: string | null; coverImage: string | null; garmentCount: number; }

export default function SelectOutfitScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { date, eventId } = useLocalSearchParams<{ date?: string; eventId?: string }>();
  const router = useRouter();

  const [outfits, setOutfits] = useState<OutfitSelectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserOutfits = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('planner.selectOutfit.sessionInvalid'));

      const { data: rawData, error: queryError } = await supabase
        .from('outfits')
        .select('id, name, occasion, outfit_items(clothing_items(image_url))')
        .eq('user_id', user.id);

      if (queryError) throw queryError;

      setOutfits((rawData || []).map((outfit: any) => {
        const items = outfit.outfit_items || [];
        const coverImage = items.length > 0 && items[0].clothing_items ? items[0].clothing_items.image_url : null;
        return { id: outfit.id, name: outfit.name, occasion: outfit.occasion, coverImage, garmentCount: items.length };
      }));
    } catch (err: any) {
      setError(err.message || t('planner.selectOutfit.fetchError'));
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchUserOutfits(); }, []));

  const handleSelectOutfit = async (outfitId: string) => {
    try {
      setIsSaving(true);
      setError(null);

      if (eventId) {
        await planOutfitForEvent(eventId, outfitId);
      } else if (date) {
        await planOutfitForDate(date, outfitId);
      }

      router.back();
    } catch (err: any) {
      // Fixed: this used to only setError() without ever rendering it — a
      // failed save looked identical to an empty list. Now shown via
      // ListFooterComponent below, same visual language as the fetch error.
      const message = err instanceof SaveOutfitError ? err.message : err.message || t('planner.selectOutfit.saveError');
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PremiumScreen>
      <FlatList
        data={outfits}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <Animated.View style={styles.headerBlock} entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))}>
            <View style={styles.headerRow}>
              <BackButton />
              <SectionHeader
                title={t('planner.selectOutfit.title')}
                subtitle={eventId ? t('planner.selectOutfit.subtitleForEvent') : t('planner.selectOutfit.subtitleForDate', { date: date || '' })}
                style={styles.headerFlexOverride}
              />
            </View>
            {error && !isLoading && (
              <View style={[styles.errorBanner, { backgroundColor: theme.dark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderColor: theme.dark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                <Text style={[styles.errorBannerText, { color: theme.colors.danger }]}>{error}</Text>
              </View>
            )}
          </Animated.View>
        }
        ListEmptyComponent={isLoading ? <ActivityIndicator size="small" color={theme.colors.textPrimary} style={{ marginTop: 40 }} /> : <Text style={[styles.emptyLabel, { color: theme.colors.textSecondary }]}>{t('planner.selectOutfit.noOutfits')}</Text>}
        renderItem={({ item, index }) => (
          // Deliberately a plain View, not PremiumCard: PremiumCard's outer
          // Pressable hardcodes `flex: 1`, which fights a 2-column
          // `numColumns` grid the same way it broke WardrobeInsightsGrid —
          // here it happened to render close enough to CARD_WIDTH to go
          // unnoticed, but it's the same latent bug, not a coincidence worth
          // relying on. See WardrobeInsightsGrid.tsx's comment for the full
          // explanation.
          <AnimatedListItem index={index}>
            <PremiumTouchable onPress={() => !isSaving && handleSelectOutfit(item.id)} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
              <View style={[styles.imageWrapper, { backgroundColor: theme.colors.surfaceSecondary }]}>
                {item.coverImage ? <Image source={{ uri: item.coverImage }} style={styles.cardImage} /> : <View style={styles.placeholderContainer}><MaterialCommunityIcons name="hanger" size={24} color={theme.colors.textTertiary} /></View>}
              </View>
              <View style={styles.cardInfo}>
                <SectionTitle numberOfLines={1} style={[styles.outfitTitle, { color: theme.colors.textPrimary }]}>{item.name}</SectionTitle>
                <Text style={[styles.garmentCountText, { color: theme.colors.textSecondary }]}>{t('planner.selectOutfit.itemsCount', { count: item.garmentCount })}</Text>
              </View>
            </PremiumTouchable>
          </AnimatedListItem>
        )}
      />
      {/* Saving overlay is a full-screen scrim, kept fixed dark regardless of theme (matches PremiumModal's backdrop convention) */}
      {isSaving && <View style={styles.savingOverlay}><ActivityIndicator size="small" color="#FAFAF9" /></View>}
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  listContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  headerBlock: { paddingVertical: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerFlexOverride: { flex: 1, paddingVertical: 0, paddingHorizontal: 0 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8, gap: 8 },
  errorBannerText: { fontSize: 13, fontWeight: '500', flex: 1 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  card: { width: CARD_WIDTH, borderRadius: 12, overflow: 'hidden', borderWidth: 1, padding: 0 },
  imageWrapper: { width: '100%', height: CARD_WIDTH * 1.3 },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { padding: 10 },
  outfitTitle: { fontSize: 13, fontWeight: '600' },
  garmentCountText: { fontSize: 12, marginTop: 2 },
  emptyLabel: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  savingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,25,23,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }
});
