import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { supabase } from '../../lib/supabase';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventMetaGraph = async () => {
    try {
      setIsLoading(true);
      const { data, error: queryErr } = await supabase
        .from('events')
        .select('id, name, event_date, category, location, description, outfit_id, outfits(name, outfit_items(clothing_items(image_url))))')
        .eq('id', id)
        .single();

      if (queryErr) throw queryErr;
      setEvent(data);
    } catch (err: any) {
      setError(err.message || 'Error processing structural event payload.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { if (id) fetchEventMetaGraph(); }, [id]));

  if (isLoading) return <PremiumScreen><ActivityIndicator size="small" color="#1C1917" style={{ marginTop: 40 }} /></PremiumScreen>;
  if (error || !event) return <PremiumScreen><Text style={{ padding: 20, color: '#EF4444' }}>{error || 'Event context missing.'}</Text></PremiumScreen>;

  const items = event.outfits?.outfit_items || [];
  const lookCoverImage = items.length > 0 && items[0].clothing_items ? items[0].clothing_items.image_url : null;

  return (
    <PremiumScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <SectionHeader title={event.name} subtitle={`${event.category} • ${event.event_date}`} />

        <View style={styles.metaSection}>
          {event.location && (
            <View style={styles.metaRow}><Ionicons name="location-outline" size={16} color="#78716C" />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          )}
          {event.description && (
            <View style={styles.metaRow}><Ionicons name="document-text-outline" size={16} color="#78716C" />
              <Text style={styles.metaText}>{event.description}</Text>
            </View>
          )}
        </View>

        <View style={styles.outfitAssignmentBlock}>
          <SectionTitle withBottomMargin>Assigned Wardrobe Look</SectionTitle>
          {event.outfit_id ? (
            <PremiumCard style={styles.outfitCard} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: event.outfit_id } })}>
              <View style={styles.imageFrame}>
                {lookCoverImage ? <Image source={{ uri: lookCoverImage }} style={styles.img} /> : <View style={styles.imgFallback}><MaterialCommunityIcons name="hanger" size={24} color="#A8A29E" /></View>}
              </View>
              <View style={styles.outfitMetaBody}>
                <Text style={styles.outfitNameTitle}>{event.outfits?.name}</Text>
                <PremiumTouchable style={styles.changeLookBtn} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { eventId: event.id } })}>
                  <Text style={styles.changeLookBtnLabel}>Change Outfit</Text>
                </PremiumTouchable>
              </View>
            </PremiumCard>
          ) : (
            <View style={styles.emptyOutfitState}>
              <Text style={styles.emptyStateText}>No outfit customized for this specific assembly context yet.</Text>
              <PremiumTouchable style={styles.selectOutfitCTA} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { eventId: event.id } })}>
                <Text style={styles.ctaTextLabel}>Select Outfit</Text>
              </PremiumTouchable>
            </View>
          )}
        </View>
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  metaSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderDelta: 1, borderWidth: 1, borderColor: '#E7E5E4', marginBottom: 24, gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: '#1C1917', fontWeight: '400' },
  outfitAssignmentBlock: { marginTop: 8 },
  outfitCard: { flexDirection: 'row', padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E5E4' },
  imageFrame: { width: 90, height: 120, backgroundColor: '#F5F5F4' },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  imgFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  outfitMetaBody: { flex: 1, padding: 16, justifyContent: 'center' },
  outfitNameTitle: { fontSize: 15, fontWeight: '600', color: '#1C1917', marginBottom: 12 },
  changeLookBtn: { alignSelf: 'flex-start' },
  changeLookBtnLabel: { fontSize: 12, fontWeight: '600', color: '#78716C', textDecorationLine: 'underline' },
  emptyOutfitState: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#E7E5E4', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 24, alignItems: 'center' },
  emptyStateText: { fontSize: 12, color: '#78716C', textAlign: 'center', marginBottom: 16 },
  selectOutfitCTA: { backgroundColor: '#1C1917', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  ctaTextLabel: { color: '#FAFAF9', fontSize: 12, fontWeight: '600' }
});