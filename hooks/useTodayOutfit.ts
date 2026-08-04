/**
 * useTodayOutfit — extracted from the old Home screen's inline
 * fetchPremiumDashboardData(), scoped to just "what's today's planned
 * outfit". Same query shape as before, plus outfits.ai_confidence (new,
 * nullable column — see supabase/migrations/20260803140027_outfit_ai_scores.sql)
 * so the enriched Today's Outfit card can show a real confidence score when
 * the plan came from the AI generator, and simply omit it otherwise.
 */

import { useCallback } from 'react';
import { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export interface TodayOutfitItemRelation {
  clothing_items?: {
    image_url?: string;
  } | null;
}

export interface TodayOutfitDetails {
  name: string;
  occasion: string | null;
  ai_confidence: number | null;
  outfit_items?: TodayOutfitItemRelation[];
}

export interface TodayOutfitPlan {
  id: string;
  outfit_id: string | null;
  outfits: TodayOutfitDetails;
}

export interface UseTodayOutfitResult {
  todayPlan: TodayOutfitPlan | null;
  isLoading: boolean;
  refetch: () => void;
}

function getLocalISODateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function useTodayOutfit(): UseTodayOutfitResult {
  const [todayPlan, setTodayPlan] = useState<TodayOutfitPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTodayPlan = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setTodayPlan(null);
        return;
      }

      const todayLocalISO = getLocalISODateString(new Date());

      const { data, error } = await supabase
        .from('outfit_plans')
        .select('id, outfit_id, outfits(name, occasion, ai_confidence, outfit_items(clothing_items(image_url)))')
        .eq('user_id', user.id)
        .eq('planned_date', todayLocalISO)
        .maybeSingle();

      if (error) throw error;

      const raw = data as any;
      if (raw?.outfits) {
        setTodayPlan({ id: raw.id, outfit_id: raw.outfit_id, outfits: raw.outfits });
      } else {
        setTodayPlan(null);
      }
    } catch (err) {
      console.error("[useTodayOutfit] failed to load today's plan:", err);
      setTodayPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTodayPlan();
    }, [fetchTodayPlan])
  );

  return { todayPlan, isLoading, refetch: fetchTodayPlan };
}
