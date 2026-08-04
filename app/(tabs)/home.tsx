import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { GreetingHeader } from '../../components/home/GreetingHeader';
import { WeatherCard } from '../../components/home/WeatherCard';
import { TodayOutfitCard } from '../../components/home/TodayOutfitCard';
import { AIDailySuggestionCard } from '../../components/home/AIDailySuggestionCard';
import { TodayScheduleCard } from '../../components/home/TodayScheduleCard';
import { WardrobeInsightsGrid } from '../../components/home/WardrobeInsightsGrid';
import { WeeklyForecastStrip } from '../../components/home/WeeklyForecastStrip';
import { QuickActionsRow } from '../../components/home/QuickActionsRow';

import { useWeather } from '../../hooks/useWeather';
import { useTodayOutfit } from '../../hooks/useTodayOutfit';
import { useNextEvent } from '../../hooks/useNextEvent';
import { useWardrobeInsights } from '../../hooks/useWardrobeInsights';
import { useDailySuggestion } from '../../hooks/useDailySuggestion';
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
 * ready — nothing here blocks on the others. The one AI call
 * (useDailySuggestion) is explicitly decoupled from all of that: it only
 * fires once weather has settled (whether or not weather actually came back)
 * and fades its own card in whenever it resolves, so a slow or failed AI
 * call can never delay or break the rest of Home.
 */
export default function HomeScreen() {
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();

  const weather = useWeather();
  const { todayPlan, isLoading: isTodayOutfitLoading } = useTodayOutfit();
  const { nextEvent, isLoading: isNextEventLoading } = useNextEvent();
  const { insights, isLoading: isInsightsLoading } = useWardrobeInsights();
  const dailySuggestion = useDailySuggestion(weather.current, weather.isReady);

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
            router.push({
              pathname: '/ai/generate-outfit',
              params: { occasion: todayPlan?.outfits?.occasion || 'Casual', forToday: '1' },
            });
          }}
          onCurateLook={() => router.push('/calendar')}
        />

        <AIDailySuggestionCard
          suggestion={dailySuggestion.suggestion}
          isLoading={dailySuggestion.isLoading}
          delay={320}
        />

        <TodayScheduleCard
          nextEvent={isNextEventLoading ? null : nextEvent}
          scheduleNote={dailySuggestion.suggestion?.scheduleNote ?? null}
          onPress={() => router.push('/calendar')}
          delay={380}
        />

        <WardrobeInsightsGrid insights={insights} isLoading={isInsightsLoading} delay={440} />

        <WeeklyForecastStrip forecast={weather.forecast} isLoading={weather.isLoading} delay={500} />

        <QuickActionsRow
          delay={560}
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
