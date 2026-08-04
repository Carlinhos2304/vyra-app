/**
 * useNextEvent — real data for the "Today's Schedule" card: the next
 * upcoming event (today or later) from the existing `events` table.
 *
 * Note: `events.event_date` is date-only (no time-of-day column exists in
 * the schema — confirmed against every real query in app/planner/*.tsx and
 * app/(tabs)/calendar.tsx). So this intentionally does NOT expose an "Hora"
 * field that doesn't exist — TodayScheduleCard shows a relative day label
 * (Today / Tomorrow / a date) instead of a fabricated clock time.
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export interface NextEvent {
  id: string;
  name: string;
  category: string | null;
  /** YYYY-MM-DD */
  event_date: string;
}

export interface UseNextEventResult {
  nextEvent: NextEvent | null;
  isLoading: boolean;
  refetch: () => void;
}

function getLocalISODateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function useNextEvent(): UseNextEventResult {
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setNextEvent(null);
        return;
      }

      const todayLocalISO = getLocalISODateString(new Date());

      const { data, error } = await supabase
        .from('events')
        .select('id, name, category, event_date')
        .eq('user_id', user.id)
        .gte('event_date', todayLocalISO)
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setNextEvent((data as NextEvent) ?? null);
    } catch (err) {
      console.error('[useNextEvent] failed to load next event:', err);
      setNextEvent(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { nextEvent, isLoading, refetch: load };
}
