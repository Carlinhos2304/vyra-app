import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle'; 
import VyraLogo from '../../components/branding/VyraLogo';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface UserProfile {
  username: string;
}

interface OutfitItemRelation {
  clothing_items?: {
    image_url?: string;
  } | null;
}

interface Outfit {
  id: string;
  name: string;
  occasion: string | null;
  outfit_items?: OutfitItemRelation[];
}

interface OutfitPlan {
  id: string;
  planned_date: string;
  outfit_id: string | null;
  outfits: Outfit;
  event_name?: string;
}

interface WeeklyPlan {
  id: string;
  date: string;
  dayName: string;
  outfit?: Outfit;
}

interface WardrobeInsights {
  totalGarments: number;
  totalOutfits: number;
  mostUsedCategory: string;
  favoriteColor: string;
}

export default function HomeScreen() {
  const router = useRouter();
  
  // Isolated Core State Matrix
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayPlan, setTodayPlan] = useState<OutfitPlan | null>(null);
  const [weeklyPreview, setWeeklyPreview] = useState<WeeklyPlan[]>([]);
  const [insights, setInsights] = useState<WardrobeInsights>({
    totalGarments: 0,
    totalOutfits: 0,
    mostUsedCategory: '—',
    favoriteColor: '—'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Reanimated Interaction States (Premium Timing)
  const heroScale = useSharedValue(1);

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
  }));
  // Localized Formatting Engine for the Editorial Sub-Header
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric'
  });

  const fetchPremiumDashboardData = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Unauthenticated status.');

      const userId = user.id;

      // Local ISO format builder ensuring absolute parity with calendar matrix matching rules
      const getLocalISODateString = (date: Date): string => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };

      const todayLocalISO = getLocalISODateString(new Date());

      // Formulate a clean 5-day lookahead matrix window using localized boundaries
      const daysArray: WeeklyPlan[] = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        daysArray.push({
          id: `day-${i}`,
          date: getLocalISODateString(d),
          dayName: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
        });
      }

      // Parallel Data Fetch Pipeline aligned with correct fields, tables, and relationships
      const [
        profileRes,
        todayOutfitRes,
        weeklyPlansRes,
        garmentsCountRes,
        outfitsCountRes,
      ] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', userId).single(),
        supabase.from('outfit_plans')
          .select('id, planned_date, outfit_id, outfits(name, occasion, outfit_items(clothing_items(image_url))))')
          .eq('user_id', userId)
          .eq('planned_date', todayLocalISO)
          .maybeSingle(),
        supabase.from('outfit_plans')
          .select('id, planned_date, outfit_id, outfits(name, occasion, outfit_items(clothing_items(image_url))))')
          .eq('user_id', userId)
          .gte('planned_date', daysArray[0].date)
          .lte('planned_date', daysArray[4].date),
        supabase.from('clothing_items').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      if (profileRes.data) setProfile(profileRes.data as UserProfile);
      
      if (todayOutfitRes.data) {
        const rawPlan = todayOutfitRes.data as any;
        if (rawPlan && rawPlan.outfits) {
          setTodayPlan({
            id: rawPlan.id,
            planned_date: rawPlan.planned_date,
            outfit_id: rawPlan.outfit_id,
            outfits: rawPlan.outfits,
            event_name: rawPlan.event_name
          });
        } else {
          setTodayPlan(null);
        }
      } else {
        setTodayPlan(null);
      }

      // Intersect database plans with structural calendar lookahead matrices
      const matchedWeeklyPlans = daysArray.map(day => {
        const match = weeklyPlansRes.data?.find((p: any) => p.planned_date === day.date);
        if (match && match.outfits) {
          day.outfit = {
            id: match.outfit_id,
            name: match.outfits.name,
            occasion: match.outfits.occasion,
            cover_image_url: null,
            outfit_items: match.outfits.outfit_items
          };
        }
        return day;
      });
      setWeeklyPreview(matchedWeeklyPlans);

      setInsights({
        totalGarments: garmentsCountRes.count || 0,
        totalOutfits: outfitsCountRes.count || 0,
        mostUsedCategory: 'Tailoring',
        favoriteColor: 'Monochrome Minimalism'
      });

    } catch (error) {
      console.error('[Vyra Data Integration Fault]:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Replaces standard component scope initialization hook with focus triggers
  useFocusEffect(
    useCallback(() => {
      fetchPremiumDashboardData();
    }, [])
  );

  if (isLoading) {
    return (
      <PremiumScreen style={styles.centerFlexContainer}>
        <PremiumLoader label="Aligning dashboard vectors..." />
      </PremiumScreen>
    );
  }

  if (isError) {
    return (
      <PremiumScreen style={styles.centerFlexContainer}>
        <Ionicons name="alert-circle-outline" size={20} color="#78716C" />
        <Text style={styles.errorStateText}>Could not sync layout with Vyra system architecture</Text>
        <PremiumTouchable style={styles.retryButton} onPress={fetchPremiumDashboardData}>
          <Text style={styles.retryButtonText}>Retry Alignment</Text>
        </PremiumTouchable>
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen style={styles.rootBackground}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* SECTION 1: ARCHITECTURAL GREETING & LOGO */}
        <Animated.View
          entering={FadeInDown.duration(600).easing(Easing.out(Easing.cubic))}
          style={styles.editorialHeaderContainer}
        >
          <View style={styles.brandMetaRow}>
            <Text style={styles.editorialDateText}>{formattedDate}</Text>
            <PremiumTouchable onPress={() => router.push('/profile')} activeOpacity={0.75}>
              <VyraLogo />
            </PremiumTouchable>
          </View>
          <Animated.Text
            entering={FadeInDown.duration(600).delay(80).easing(Easing.out(Easing.cubic))}
            style={styles.editorialGreetingText}
          >
            Hello, {profile?.username || 'Curator'}
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.duration(600).delay(140).easing(Easing.out(Easing.cubic))}
            style={styles.editorialPoetryText}
          >
            The wardrobe is an architecture of self. Currently managing {insights.totalGarments} archival foundations to compose your modern visual footprint.
          </Animated.Text>
        </Animated.View>

        {/* SECTION 2: IMMERSIVE HERO ENSEMBLE */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.cubic))}
          style={styles.systemSection}
        >
          <SectionHeader title="Today's Ensemble" subtitle="Your active presentation configuration" style={styles.headerBindingFix} />

          {todayPlan?.outfits ? (
            <Animated.View style={heroAnimatedStyle}>
              <PremiumCard
                style={styles.magazineCardFrame}
                onPress={() => router.push(`../outfit/${todayPlan.outfit_id}`)}
                onPressIn={() => heroScale.value = withTiming(0.98, { duration: 200, easing: Easing.out(Easing.cubic) })}
                onPressOut={() => heroScale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })}
              >
                <View style={styles.magazineImageWrapper}>
                  {(() => {
                    const items = todayPlan.outfits.outfit_items || [];
                    const resolvedCoverUrl = items.length > 0 && items[0].clothing_items ? items[0].clothing_items.image_url : null;

                    return resolvedCoverUrl ? (
                      <Image source={{ uri: resolvedCoverUrl }} style={styles.magazineImage} />
                    ) : (
                      <View style={styles.magazineFallbackContainer}>
                        <Ionicons name="shirt-outline" size={36} color="#A8A29E" />
                      </View>
                    );
                  })()}

                  <View style={styles.linearScrimOverlay} />

                  <View style={styles.magazineFloatingTopContent}>
                    <Text style={styles.editorialTagText}>Today's Look</Text>
                    {todayPlan.outfits.occasion && (
                      <View style={styles.editorialOccasionBadge}>
                        <Text style={styles.editorialOccasionBadgeText}>{todayPlan.outfits.occasion}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.magazineFloatingBottomContent}>
                    {todayPlan.event_name && (
                      <Text style={styles.magazineEventSubtitle}>{todayPlan.event_name}</Text>
                    )}
                    <Text style={styles.magazineTitleHeading}>{todayPlan.outfits.name}</Text>
                  </View>
                </View>
              </PremiumCard>
            </Animated.View>
          ) : (
            <PremiumCard style={styles.systemEmptySlateContainer} disabled>
              <View style={styles.systemEmptySlateGraphic}>
                <Ionicons name="shirt-outline" size={32} color="#A8A29E" />
              </View>
              <Text style={styles.systemEmptyTitle}>The canvas is empty</Text>
              <Text style={styles.systemEmptySubtitle}>No look configuration is assigned to your presentation schedule today.</Text>
              <PremiumTouchable style={styles.systemCtaButton} onPress={() => router.push('/calendar')}>
                <Text style={styles.systemCtaButtonText}>Curate Look</Text>
              </PremiumTouchable>
            </PremiumCard>
          )}
        </Animated.View>

        {/* SECTION 3: HORIZONTAL WEEKLY LOOKAHEAD */}
        <View style={styles.systemSection}>
          <Animated.View entering={FadeInDown.duration(600).delay(250).easing(Easing.out(Easing.cubic))}>
            <SectionHeader title="Weekly Forecast" subtitle="Chronological lookahead tracking parameters" style={styles.headerBindingFix} />
          </Animated.View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastStripScroll}>
            {weeklyPreview.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.duration(500).delay(300 + (index * 50)).easing(Easing.out(Easing.cubic))}
              >
                <PremiumTouchable
                  style={[styles.forecastDayCard, item.dayName === 'Today' && styles.forecastCardActiveToday]}
                  onPress={() => item.outfit ? router.push(`../outfit/${item.outfit.id}`) : router.push('/calendar')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.forecastDayText, item.dayName === 'Today' && styles.forecastDayTextActive]}>
                    {item.dayName}
                  </Text>

                  <View style={styles.forecastThumbnailWrapper}>
                    {item.outfit ? (
                      (() => {
                        const items = item.outfit.outfit_items || [];
                        const resolvedThumbUrl = items.length > 0 && items[0].clothing_items ? items[0].clothing_items.image_url : null;

                        return resolvedThumbUrl ? (
                          <Image source={{ uri: resolvedThumbUrl }} style={styles.forecastThumbnailImage} />
                        ) : (
                          <View style={styles.forecastThumbnailPlaceholder}>
                            <View style={[styles.luxuryIndicatorDot, item.dayName === 'Today' && styles.luxuryIndicatorDotActive]} />
                          </View>
                        );
                      })()
                    ) : (
                      <View style={[styles.forecastThumbnailEmpty, item.dayName === 'Today' && styles.forecastThumbnailEmptyActive]}>
                        <Ionicons name="add" size={14} color={item.dayName === 'Today' ? '#FAFAF9' : '#A8A29E'} />
                      </View>
                    )}
                  </View>
                </PremiumTouchable>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        {/* SECTION 4: LIFESTYLE WARDROBE CORE MATRICES */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(600).easing(Easing.out(Easing.cubic))}
          style={[styles.systemSection, styles.bottomSpacing]}
        >
          <SectionTitle withBottomMargin style={styles.headerBindingFix}>Collection Insights</SectionTitle>

          <View style={styles.lifestyleInsightsGrid}>
            <View style={styles.lifestyleMetricRow}>
              <PremiumCard style={styles.lifestyleMetricBlock} onPress={() => router.push('/closet')}>
                <Text style={styles.lifestyleMetricValue}>{insights.totalGarments}</Text>
                <Text style={styles.lifestyleMetricLabel}>Archived Pieces</Text>
              </PremiumCard>

              <PremiumCard style={styles.lifestyleMetricBlock} onPress={() => router.push('/closet')}>
                <Text style={styles.lifestyleMetricValue}>{insights.totalOutfits}</Text>
                <Text style={styles.lifestyleMetricLabel}>Compiled Looks</Text>
              </PremiumCard>
            </View>

            <PremiumCard style={styles.lifestyleWideCard} disabled>
              <View style={styles.editorialInsightMeta}>
                <View style={styles.insightCluster}>
                  <Text style={styles.lifestyleWideLabel}>Dominant Style</Text>
                  <Text style={styles.lifestyleWideValue}>{insights.mostUsedCategory}</Text>
                </View>
                <View style={styles.insightDivider} />
                <View style={styles.insightCluster}>
                  <Text style={styles.lifestyleWideLabel}>Current Aesthetic</Text>
                  <Text style={styles.lifestyleWideValue}>{insights.favoriteColor}</Text>
                </View>
              </View>
            </PremiumCard>
          </View>
        </Animated.View>
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  rootBackground: {
    backgroundColor: '#FAFAF9',
  },
  centerFlexContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
  },
  errorStateText: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1C1917',
    borderRadius: 12,
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 11,
    color: '#FAFAF9',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  editorialHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  brandMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editorialDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  editorialGreetingText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1C1917',
    letterSpacing: -0.5,
  },
  editorialPoetryText: {
    fontSize: 13,
    color: '#78716C',
    lineHeight: 19,
    marginTop: 8,
  },
  systemSection: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  headerBindingFix: {
    marginBottom: 12,
  },
  magazineCardFrame: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 16,
    overflow: 'hidden',
  },
  magazineImageWrapper: {
    width: '100%',
    height: (width - 48) * 1.15,
    backgroundColor: '#F5F5F4',
    position: 'relative',
  },
  magazineImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  magazineFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linearScrimOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
  },
  magazineFloatingTopContent: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editorialTagText: {
    fontSize: 9,
    color: '#1C1917',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editorialOccasionBadge: {
    backgroundColor: 'rgba(28, 25, 23, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editorialOccasionBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FAFAF9',
    textTransform: 'uppercase',
  },
  magazineFloatingBottomContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  magazineEventSubtitle: {
    fontSize: 11,
    color: '#E7E5E4',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  magazineTitleHeading: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  systemEmptySlateContainer: {
    width: '100%',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemEmptySlateGraphic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  systemEmptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1917',
  },
  systemEmptySubtitle: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  systemCtaButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1C1917',
    borderRadius: 12,
  },
  systemCtaButtonText: {
    fontSize: 11,
    color: '#FAFAF9',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forecastStripScroll: {
    gap: 10,
  },
  forecastDayCard: {
    width: (width - 78) / 3.8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    gap: 8,
  },
  forecastCardActiveToday: {
    backgroundColor: '#1C1917',
    borderColor: '#1C1917',
  },
  forecastDayText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#78716C',
  },
  forecastDayTextActive: {
    color: '#FAFAF9',
  },
  forecastThumbnailWrapper: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#F5F5F4',
  },
  forecastThumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  forecastThumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  luxuryIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1C1917',
  },
  luxuryIndicatorDotActive: {
    backgroundColor: '#FAFAF9',
  },
  forecastThumbnailEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  forecastThumbnailEmptyActive: {
    borderColor: 'rgba(250, 250, 249, 0.3)',
  },
  lifestyleInsightsGrid: {
    gap: 10,
    width: '100%',
  },
  lifestyleMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  lifestyleMetricBlock: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
  },
  lifestyleMetricValue: {
    fontSize: 24,
    fontWeight: '300',
    color: '#1C1917',
  },
  lifestyleMetricLabel: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  lifestyleWideCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
  },
  editorialInsightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  insightCluster: {
    flex: 1,
  },
  insightDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E7E5E4',
    marginHorizontal: 16,
  },
  lifestyleWideLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  lifestyleWideValue: {
    fontSize: 14,
    fontWeight: '300',
    color: '#1C1917',
  },
  bottomSpacing: {
    paddingBottom: 20,
  },
});