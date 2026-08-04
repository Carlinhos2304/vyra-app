/**
 * useWardrobeInsights — thin wrapper around wardrobeInsightsService, so the
 * Home screen doesn't inline any of the counting/aggregation logic. All
 * numbers shown by WardrobeInsightsGrid come from here — never hardcoded.
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getWardrobeInsights, WardrobeInsights } from '../lib/services/wardrobeInsightsService';

export interface UseWardrobeInsightsResult {
  insights: WardrobeInsights | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useWardrobeInsights(): UseWardrobeInsightsResult {
  const [insights, setInsights] = useState<WardrobeInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getWardrobeInsights();
      setInsights(result);
    } catch (err) {
      console.error('[useWardrobeInsights] failed to compute insights:', err);
      setInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { insights, isLoading, refetch: load };
}
