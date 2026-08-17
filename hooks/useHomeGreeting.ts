/**
 * useHomeGreeting — the dynamic greeting + subtitle at the top of Home.
 * Deliberately NOT an AI call: per the spec, the subtitle should react
 * instantly to hour/weather/calendar/outfit, and Home must load immediately
 * — a network round-trip for a one-line subtitle would work against that.
 * A fast, deterministic, already-localized rule set over already-loaded real
 * data (weather, today's plan, whether there's an event today) — never a
 * fixed string. (The separate AI Daily Suggestion card that used to sit
 * below this was removed 2026-08-17 — this hook was never that call and is
 * unaffected.)
 */

import { useEffect, useState } from 'react';
import { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { WeatherSnapshot } from '../lib/services/weatherService';
import { TodayOutfitPlan } from './useTodayOutfit';
import { useLanguage } from '../i18n';

export interface UseHomeGreetingParams {
  weather: WeatherSnapshot | null;
  todayPlan: TodayOutfitPlan | null;
  hasEventToday: boolean;
}

export interface UseHomeGreetingResult {
  greeting: string;
  subtitle: string;
}

export function useHomeGreeting({ weather, todayPlan, hasEventToday }: UseHomeGreetingParams): UseHomeGreetingResult {
  const { t } = useLanguage();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase.from('profiles').select('username').eq('id', user.id).single();
        if (!cancelled && !error && data?.username) setUsername(data.username);
      } catch (err) {
        console.error('[useHomeGreeting] failed to load username:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const hour = new Date().getHours();
    const timeGreeting =
      hour < 12 ? t('home.greeting.morning') : hour < 18 ? t('home.greeting.afternoon') : t('home.greeting.evening');
    const greeting = t('home.greeting.greetingLine', {
      timeGreeting,
      name: username || t('home.greeting.fallbackName'),
    });

    let subtitle: string;
    if (weather && weather.chanceOfRainPercent !== null && weather.chanceOfRainPercent >= 50) {
      subtitle = t('home.greeting.subtitleRain');
    } else if (weather && weather.temperatureCelsius <= 12) {
      subtitle = t('home.greeting.subtitleCool');
    } else if (weather && weather.temperatureCelsius >= 26) {
      subtitle = t('home.greeting.subtitleWarm');
    } else if (hasEventToday) {
      subtitle = t('home.greeting.subtitleEventToday');
    } else if (todayPlan?.outfits?.name) {
      subtitle = t('home.greeting.subtitleOutfitReady', { outfitName: todayPlan.outfits.name });
    } else {
      subtitle = t('home.greeting.subtitleDefault');
    }

    return { greeting, subtitle };
  }, [username, weather, todayPlan, hasEventToday, t]);
}
