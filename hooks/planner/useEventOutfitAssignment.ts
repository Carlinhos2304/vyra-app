/**
 * useEventOutfitAssignment — Smart Planner spec items 4 (Smart Outfit
 * Assignment) and 6 (AI Event Suggestions).
 *
 * Reuses the EXISTING AI infrastructure end to end — no new Edge Function,
 * no duplicate provider, no parallel prompt system:
 *   - generateOutfits() from lib/services/aiService.ts (same function Home's
 *     AI Outfit Generator uses) is called with the event's category mapped
 *     to the existing OUTFIT_OCCASIONS vocabulary (see
 *     EVENT_CATEGORY_TO_OUTFIT_OCCASION in constants/eventCategories.ts) and
 *     the event's matched weather (from useEventWeather) as the `weather`
 *     hint. The generate-outfit Edge Function already reads the wardrobe,
 *     style profile, and outfit history server-side and already reasons
 *     about weather/occasion in its prompt — so a suggestion's `reasoning`
 *     string IS the "AI tip" the spec's item 6 asks for (e.g. "Rain is
 *     expected... consider replacing white sneakers") without inventing a
 *     second AI call.
 *   - Saving a suggestion reuses outfitService.saveOutfit() (the exact same
 *     write path the manual "Create Outfit" screen uses) followed by the
 *     new outfitService.planOutfitForEvent().
 *   - Assigning an already-saved outfit (the "Saved Outfit" flow, i.e.
 *     select-outfit.tsx) reuses outfitService.planOutfitForEvent() directly.
 */

import { useCallback, useState } from 'react';
import { generateOutfits, OutfitSuggestion } from '../../lib/services/aiService';
import { planOutfitForEvent, saveOutfit } from '../../lib/services/outfitService';
import { EVENT_CATEGORY_TO_OUTFIT_OCCASION, type EventCategory } from '../../constants/eventCategories';

export type OutfitAssignmentStatus = 'idle' | 'generating' | 'ready' | 'assigning' | 'error';

export interface EventWeatherHint {
  temperatureCelsius?: number;
  condition?: string;
}

export interface UseEventOutfitAssignmentResult {
  status: OutfitAssignmentStatus;
  suggestions: OutfitSuggestion[];
  errorMessage: string | null;
  /** Ask the AI for suggestions (or regenerate — same call, "Generate Again" is just calling this again). */
  generate: () => Promise<void>;
  /** Save a freshly-generated suggestion as a real outfit and assign it to the event. */
  assignGenerated: (suggestion: OutfitSuggestion) => Promise<void>;
  /** Assign an already-saved outfit (picked via select-outfit.tsx) to the event. */
  assignSaved: (outfitId: string) => Promise<void>;
}

export function useEventOutfitAssignment(
  eventId: string,
  eventCategory: string,
  weather: EventWeatherHint | null,
  onAssigned: () => void
): UseEventOutfitAssignmentResult {
  const [status, setStatus] = useState<OutfitAssignmentStatus>('idle');
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mappedOccasion =
    EVENT_CATEGORY_TO_OUTFIT_OCCASION[eventCategory as EventCategory] || EVENT_CATEGORY_TO_OUTFIT_OCCASION.Other;

  const generate = useCallback(async () => {
    setStatus('generating');
    setErrorMessage(null);
    try {
      const results = await generateOutfits(mappedOccasion, weather ?? null);
      setSuggestions(results);
      setStatus('ready');
    } catch (err: any) {
      console.error('[useEventOutfitAssignment] generate failed:', err);
      setErrorMessage(err.message || 'The outfit generator could not process this request.');
      setStatus('error');
    }
  }, [mappedOccasion, weather]);

  const assignGenerated = useCallback(
    async (suggestion: OutfitSuggestion) => {
      setStatus('assigning');
      setErrorMessage(null);
      try {
        const outfitId = await saveOutfit({
          name: suggestion.title,
          occasion: mappedOccasion,
          clothingItemIds: suggestion.clothing_item_ids,
          confidence: suggestion.confidence,
          scores: suggestion.scores,
        });
        await planOutfitForEvent(eventId, outfitId);
        setStatus('ready');
        onAssigned();
      } catch (err: any) {
        console.error('[useEventOutfitAssignment] assignGenerated failed:', err);
        setErrorMessage(err.message || 'Could not save this outfit to the event.');
        setStatus('error');
      }
    },
    [eventId, mappedOccasion, onAssigned]
  );

  const assignSaved = useCallback(
    async (outfitId: string) => {
      setStatus('assigning');
      setErrorMessage(null);
      try {
        await planOutfitForEvent(eventId, outfitId);
        setStatus('ready');
        onAssigned();
      } catch (err: any) {
        console.error('[useEventOutfitAssignment] assignSaved failed:', err);
        setErrorMessage(err.message || 'Could not assign this outfit to the event.');
        setStatus('error');
      }
    },
    [eventId, onAssigned]
  );

  return { status, suggestions, errorMessage, generate, assignGenerated, assignSaved };
}
