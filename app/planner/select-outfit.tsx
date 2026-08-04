import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { supabase } from '../../lib/supabase';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session tracking invalid.');

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User context dropped.');

      if (eventId) {
        // Mode A: Event Association Pipeline
        const { error: eventUpdateErr } = await supabase
          .from('events')
          .update({ outfit_id: outfitId })
          .eq('id', eventId);
        if (eventUpdateErr) throw eventUpdateErr;
      } else if (date) {
        // Mode B: Calendar Flat Day Allocation Pipeline
        const { data: existingPlan } = await supabase
          .from('outfit_plans')
          .select('id')
          .eq('user_id', user.id)
          .eq('planned_date', date)
          .maybeSingle();

        if (existingPlan) {
          await supabase.from('outfit_plans').update({ outfit_id: outfitId }).eq('id', existingPlan.id);
        } else {
          await supabase.from('outfit_plans').insert({ user_id: user.id, outfit_id: outfitId, planned_date: date });
        }
      }

      router.back();
    } catch (err: any) {
      setError(err.message || 'Transaction aborted by storage tier.');
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
        ListHeaderComponent={<View style={styles.headerBlock}><SectionHeader title={t('planner.selectOutfit.title')} subtitle={eventId ? t('planner.selectOutfit.subtitleForEvent') : t('planner.selectOutfit.subtitleForDate', { date: date || '' })} /></View>}
        ListEmptyComponent={isLoading ? <ActivityIndicator size="small" color={theme.colors.textPrimary} style={{ marginTop: 40 }} /> : <Text style={[styles.emptyLabel, { color: theme.colors.textSecondary }]}>{t('planner.selectOutfit.noOutfits')}</Text>}
        renderItem={({ item }) => (
          <PremiumCard style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]} onPress={() => !isSaving && handleSelectOutfit(item.id)}>
            <View style={[styles.imageWrapper, { backgroundColor: theme.colors.surfaceSecondary }]}>
              {item.coverImage ? <Image source={{ uri: item.coverImage }} style={styles.cardImage} /> : <View style={styles.placeholderContainer}><MaterialCommunityIcons name="hanger" size={24} color={theme.colors.textTertiary} /></View>}
            </View>
            <View style={styles.cardInfo}>
              <SectionTitle numberOfLines={1} style={[styles.outfitTitle, { color: theme.colors.textPrimary }]}>{item.name}</SectionTitle>
              <Text style={[styles.garmentCountText, { color: theme.colors.textSecondary }]}>{t('planner.selectOutfit.itemsCount', { count: item.garmentCount })}</Text>
            </View>
          </PremiumCard>
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
