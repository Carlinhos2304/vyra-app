/**
 * Recommend for Today — ranks the user's ALREADY-SAVED outfits by how well
 * they fit today's real weather (see
 * lib/services/outfitWeatherRecommendation.ts), instead of generating a new
 * one with AI. Reached from Home's Today's Outfit card two ways:
 *   - "Recommend" when no outfit is assigned to today yet.
 *   - "Regenerate" when one already is — same screen, just also receives
 *     `excludeOutfitId` so the outfit already assigned isn't suggested back.
 * The full AI Stylist (app/ai/generate-outfit.tsx) is untouched and still
 * reachable from Quick Actions and the Planner's "Generate Outfit" — this
 * screen is deliberately a separate, non-AI, zero-latency path (2026-08-13
 * decision).
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, Easing } from 'react-native-reanimated';

import { AppAlert } from '../../lib/ui/appAlert';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { PremiumButton } from '../../components/ui/PremiumButton';
import { PremiumScoreBar } from '../../components/ui/PremiumScoreBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { BackButton } from '../../components/ui/BackButton';
import { OutfitGarmentsCollage } from '../../components/outfit/OutfitGarmentsCollage';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import { useWeather } from '../../hooks/useWeather';
import { getWeatherIconName } from '../../lib/utils/weatherIcon';
import { supabase } from '../../lib/supabase';
import { planOutfitForToday, SaveOutfitError } from '../../lib/services/outfitService';
import {
  rankOutfitsForWeather,
  type ScorableOutfitGarment,
  type WeatherFitLabel,
} from '../../lib/services/outfitWeatherRecommendation';

interface RecommendableOutfit {
  id: string;
  name: string;
  occasion: string | null;
  garmentImages: string[];
  garments: ScorableOutfitGarment[];
}

export default function RecommendTodayScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ excludeOutfitId?: string | string[] }>();
  const excludeOutfitId = Array.isArray(params.excludeOutfitId) ? params.excludeOutfitId[0] : params.excludeOutfitId;

  const weather = useWeather();
  const [outfits, setOutfits] = useState<RecommendableOutfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingOutfitId, setSettingOutfitId] = useState<string | null>(null);
  const [confirmedOutfitId, setConfirmedOutfitId] = useState<string | null>(null);

  const fetchOutfits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t('outfitRecommend.errorFallback'));

      const { data, error: queryError } = await supabase
        .from('outfits')
        .select('id, name, occasion, outfit_items(clothing_items(image_url, category, season))')
        .eq('user_id', user.id);

      if (queryError) throw queryError;

      const mapped: RecommendableOutfit[] = (data || [])
        .filter((row: any) => row.id !== excludeOutfitId)
        .map((row: any) => {
          const items = row.outfit_items || [];
          return {
            id: row.id,
            name: row.name,
            occasion: row.occasion,
            garmentImages: items
              .map((i: any) => i.clothing_items?.image_url)
              .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0),
            garments: items.map((i: any) => ({
              season: i.clothing_items?.season ?? null,
              category: i.clothing_items?.category ?? '',
            })),
          };
        });

      setOutfits(mapped);
    } catch (err: any) {
      setError(err.message || t('outfitRecommend.errorFallback'));
    } finally {
      setIsLoading(false);
    }
  }, [excludeOutfitId, t]);

  useFocusEffect(
    useCallback(() => {
      fetchOutfits();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchOutfits])
  );

  const hasWeather = !!weather.current;
  const ranked = hasWeather
    ? rankOutfitsForWeather(outfits, {
        temperatureCelsius: weather.current!.temperatureCelsius,
        conditionKey: weather.current!.conditionKey,
      })
    : outfits.map((outfit) => ({ outfit, score: 0, fitLabel: 'good' as WeatherFitLabel }));

  const handleUseOutfit = async (outfitId: string) => {
    if (settingOutfitId) return;
    try {
      setSettingOutfitId(outfitId);
      await planOutfitForToday(outfitId);
      setConfirmedOutfitId(outfitId);
      setTimeout(() => router.back(), 900);
    } catch (err: any) {
      const message = err instanceof SaveOutfitError ? err.message : t('outfitRecommend.alerts.setFailedMessage');
      AppAlert.alert(t('outfitRecommend.alerts.setFailedTitle'), message);
    } finally {
      setSettingOutfitId(null);
    }
  };

  const fitBadgeColor = (label: WeatherFitLabel) => {
    if (label === 'great') return theme.colors.success;
    if (label === 'off') return theme.colors.danger;
    return theme.colors.textSecondary;
  };

  return (
    <PremiumScreen>
      <View style={styles.headerRow}>
        <BackButton />
        <SectionHeader
          title={t('outfitRecommend.header.title')}
          subtitle={
            hasWeather
              ? t('outfitRecommend.header.subtitleWithWeather', {
                  temp: Math.round(weather.current!.temperatureCelsius),
                  condition: weather.current!.conditionLabel,
                })
              : t('outfitRecommend.header.subtitleNoWeather')
          }
          style={styles.headerFlexOverride}
        />
        {hasWeather && (
          <View style={[styles.weatherIconBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <Ionicons name={getWeatherIconName(weather.current!.conditionKey)} size={20} color={theme.colors.accent} />
          </View>
        )}
      </View>

      {!hasWeather && weather.isReady && (
        <View style={[styles.noWeatherBanner, { backgroundColor: theme.colors.surfaceSecondary }]}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.noWeatherText, { color: theme.colors.textSecondary }]}>{t('outfitRecommend.noWeatherNote')}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t('outfitRecommend.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={28} color={theme.colors.textSecondary} />
          <Text style={[styles.phaseSubtitle, { color: theme.colors.textSecondary }]}>{error}</Text>
        </View>
      ) : ranked.length === 0 ? (
        <Animated.View entering={FadeIn.duration(400)} style={styles.centerState}>
          <MaterialCommunityIcons name="hanger" size={32} color={theme.colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>{t('outfitRecommend.empty.title')}</Text>
          <Text style={[styles.phaseSubtitle, { color: theme.colors.textSecondary }]}>{t('outfitRecommend.empty.message')}</Text>
          <PremiumButton
            label={t('outfitRecommend.empty.generateWithAi')}
            onPress={() => router.replace({ pathname: '/ai/generate-outfit', params: { occasion: 'Casual', forToday: '1' } })}
            style={styles.phaseActionButton}
          />
        </Animated.View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {ranked.map(({ outfit, score, fitLabel }, index) => {
            const isSettingThis = settingOutfitId === outfit.id;
            const isConfirmed = confirmedOutfitId === outfit.id;
            return (
              <Animated.View
                key={outfit.id}
                entering={FadeInDown.duration(450).delay(index * 60).easing(Easing.out(Easing.cubic))}
              >
                <PremiumCard style={[styles.outfitCard, { borderColor: theme.colors.border }]}>
                  <View style={[styles.imageWrapper, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    {outfit.garmentImages.length > 0 ? (
                      <OutfitGarmentsCollage images={outfit.garmentImages} style={styles.cardImage} />
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <MaterialCommunityIcons name="hanger" size={28} color={theme.colors.textTertiary} />
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={[styles.outfitTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {outfit.name}
                      </Text>
                      {hasWeather && (
                        <View style={[styles.fitBadge, { backgroundColor: fitBadgeColor(fitLabel) }]}>
                          <Text style={styles.fitBadgeText}>{t(`outfitRecommend.fit.${fitLabel}`)}</Text>
                        </View>
                      )}
                    </View>
                    {outfit.occasion && (
                      <Text style={[styles.occasionText, { color: theme.colors.textSecondary }]}>{outfit.occasion}</Text>
                    )}

                    {hasWeather && (
                      <PremiumScoreBar label={t('outfitRecommend.weatherMatchLabel')} value={score} style={styles.scoreBar} />
                    )}

                    <PremiumTouchable
                      style={[
                        styles.useButton,
                        { backgroundColor: isConfirmed ? theme.colors.success : theme.colors.accent },
                      ]}
                      onPress={() => handleUseOutfit(outfit.id)}
                      disabled={!!settingOutfitId || isConfirmed}
                    >
                      {isSettingThis ? (
                        <ActivityIndicator size="small" color={theme.colors.accentForeground} />
                      ) : (
                        <Text style={[styles.useButtonText, { color: theme.colors.accentForeground }]}>
                          {isConfirmed ? t('outfitRecommend.actions.setForToday') : t('outfitRecommend.actions.useThisOutfit')}
                        </Text>
                      )}
                    </PremiumTouchable>
                  </View>
                </PremiumCard>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerFlexOverride: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  weatherIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  noWeatherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  noWeatherText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  phaseSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  phaseActionButton: {
    marginTop: 24,
    width: 220,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  outfitCard: {
    borderWidth: 1,
    padding: 0,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: 180,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  outfitTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  fitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  fitBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FAFAF9',
  },
  occasionText: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreBar: {
    marginTop: 14,
    marginBottom: 0,
  },
  useButton: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  useButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
