import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { GreetingHeader } from '../../components/home/GreetingHeader';
import { WeatherCard } from '../../components/home/WeatherCard';
import { TodayOutfitCard } from '../../components/home/TodayOutfitCard';
import { TodayScheduleCard } from '../../components/home/TodayScheduleCard';
import { WardrobeInsightsGrid } from '../../components/home/WardrobeInsightsGrid';
import { WeeklyForecastStrip } from '../../components/home/WeeklyForecastStrip';
import { QuickActionsRow } from '../../components/home/QuickActionsRow';

import { useWeather } from '../../hooks/useWeather';
import { useTodayOutfit } from '../../hooks/useTodayOutfit';
import { useNextEvent } from '../../hooks/useNextEvent';
import { useWardrobeInsights } from '../../hooks/useWardrobeInsights';
import { useHomeGreeting } from '../../hooks/useHomeGreeting';
import { useTabBarClearance } from '../../hooks/useTabBarClearance';

/**
 * Home — the personal briefing, not a dashboard. Every section is its own
 * component under components/home/, backed by its own hook under hooks/;
 * this file only wires them together and owns navigation. See the delivery
 * notes for the full list of new pieces and how to add another "smart card"
 * later.
 *
 * Loading philosophy: base data (weather, today's outfit, next event,
 * wardrobe insights) all load in parallel and render as soon as each is
 * ready — nothing here blocks on the others.
 *
 * The AI Daily Suggestion card (useDailySuggestion/getDailySuggestion) was
 * removed 2026-08-17 at the user's request — it read as low-value on top of
 * the greeting header's own weather-aware line (useHomeGreeting, a separate,
 * deterministic, already-localized rule set — see that hook's comment) and
 * was English-only regardless of the app's language setting. TodayScheduleCard's
 * `scheduleNote` prop (previously fed by this) is now just omitted.
 */
export default function HomeScreen() {
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();

  const weather = useWeather();
  const { todayPlan, isLoading: isTodayOutfitLoading } = useTodayOutfit();
  const { nextEvent, isLoading: isNextEventLoading } = useNextEvent();
  const { insights, isLoading: isInsightsLoading } = useWardrobeInsights();

  const todayLocalISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const hasEventToday = nextEvent?.event_date === todayLocalISO;

  const { greeting, subtitle } = useHomeGreeting({
    weather: weather.current,
    todayPlan,
    hasEventToday,
  });

  return (
    <PremiumScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + tabBarClearance }]}>
        <GreetingHeader greeting={greeting} subtitle={subtitle} onAvatarPress={() => router.push('/profile')} />

        <WeatherCard weather={weather.current} isLoading={weather.isLoading} delay={200} />

        <TodayOutfitCard
          todayPlan={todayPlan}
          isLoading={isTodayOutfitLoading}
          delay={260}
          onViewOutfit={() => {
            if (todayPlan?.outfit_id) router.push(`../outfit/${todayPlan.outfit_id}`);
          }}
          onRegenerate={() => {
            // Repurposed 2026-08-13: "other recommendations" from the user's
            // own already-saved outfits, ranked by today's weather — not a
            // brand-new AI generation from scratch. The full AI Stylist stays
            // reachable elsewhere (Quick Actions, Planner's Generate Outfit).
            router.push({
              pathname: '/outfit/recommend-today',
              params: { excludeOutfitId: todayPlan?.outfit_id || '' },
            });
          }}
          onCurateLook={() => router.push('/calendar')}
          onRecommend={() => router.push('/outfit/recommend-today')}
        />

        <TodayScheduleCard
          nextEvent={isNextEventLoading ? null : nextEvent}
          onPress={() => router.push('/calendar')}
          delay={320}
        />

        <WardrobeInsightsGrid insights={insights} isLoading={isInsightsLoading} delay={380} />

        <WeeklyForecastStrip forecast={weather.forecast} isLoading={weather.isLoading} delay={440} />

        <QuickActionsRow
          delay={500}
          onAddGarment={() => router.push('/clothing/add-garment')}
          onGenerateOutfit={() => router.push({ pathname: '/ai/generate-outfit', params: { occasion: 'Casual' } })}
          onCalendar={() => router.push('/calendar')}
          onCloset={() => router.push('/closet')}
        />
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
});
