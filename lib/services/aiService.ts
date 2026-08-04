/**
 * aiService.ts
 *
 * Client-side entry point for every AI feature in Vyra. This is the ONLY
 * file in the React Native app that talks to an AI feature — and even here,
 * it never calls an AI provider directly. It always goes through a Supabase
 * Edge Function, which is the sole holder of AI provider API keys.
 *
 * Phase 1: analyzeGarmentPhoto() — structured garment analysis, no
 * recommendations, no chat.
 * Phase 2: generateOutfits() — AI outfit suggestions from the user's own
 * wardrobe. Returns suggestions only; saving a chosen outfit reuses the
 * existing outfits/outfit_items write path already used by the manual
 * "Create Outfit" screen (app/(tabs)/create.tsx) — this service doesn't
 * persist anything itself.
 * Phase 3 (this file, today): getDailySuggestion() — the Home redesign's AI
 * Daily Suggestion card + Today's Schedule note. Same non-blocking spirit as
 * the rest of Home: callers should treat a slow/failed call as "no AI note
 * right now", never as something that should hold up the screen.
 * Future phases (per CLAUDE.md's AI Roadmap, e.g. the AI stylist chat) will
 * add sibling functions here that call their own Edge Functions the same
 * way — the app-side pattern stays identical regardless of which AI
 * provider ends up handling each feature.
 */

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface GarmentAnalysisResult {
  /** Descriptive, consistent title: "Color + Main Characteristic + Garment Type"
   * (e.g. "White Oversized Cotton T-Shirt"). Always populated. */
  name: string;
  /** Only populated when a logo/label was clearly legible in the photo;
   * null means "couldn't determine", never a guess. */
  brand: string | null;
  category: string;
  colors: {
    primary: string;
    secondary: string | null;
  };
  style: string;
  occasion: string;
  season: string;
  materials: string[];
  description: string;
  tags: string[];
  confidence_score: number;
}

export class AIAnalysisError extends Error {}

export interface WeatherInput {
  temperatureCelsius?: number;
  condition?: string;
}

/** Breakdown behind an OutfitSuggestion's overall `confidence`, each 0-100.
 * Always present on the response — generate-outfit's normalize.ts clamps and
 * defaults every field server-side, so this is safe to render directly. */
export interface OutfitScores {
  styleMatch: number;
  weatherSuitability: number;
  occasionFit: number;
  colorHarmony: number;
}

export interface OutfitSuggestion {
  title: string;
  reasoning: string;
  confidence: number;
  /** Ordered ids into clothing_items — always real ids from the caller's own
   * wardrobe, never invented (enforced server-side, see generate-outfit's
   * normalize.ts). */
  clothing_item_ids: string[];
  /** Style/weather/occasion/color-harmony breakdown, 0-100 each. */
  scores: OutfitScores;
}

/**
 * Unwraps the real error message from a failed supabase.functions.invoke()
 * call. supabase-js wraps a non-2xx Edge Function response in a generic
 * FunctionsHttpError whose top-level .message is just "Edge Function
 * returned a non-2xx status code" — not useful on its own. The actual
 * response body (every Vyra Edge Function always returns { error: string }
 * on failure) lives on error.context, a raw Response we have to read
 * ourselves. See: https://supabase.com/docs/guides/functions/error-handling
 */
async function extractInvokeErrorMessage(error: unknown, fallback: string): Promise<string> {
  let detailedMessage = (error as { message?: string })?.message || fallback;

  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) detailedMessage = body.error;
    } catch {
      // Response body wasn't JSON (e.g. a proxy/network-level failure) — keep the generic message.
    }
  }

  return detailedMessage;
}

/**
 * Sends an already-uploaded garment photo (by its Supabase Storage path) to
 * the analyze-garment Edge Function and returns the structured result.
 *
 * @param storagePath Path inside the "garments" bucket, e.g. "<user_id>/172...-ab12.jpg".
 *   The image must already be uploaded before calling this — this function
 *   does not upload anything itself.
 */
export async function analyzeGarmentPhoto(storagePath: string): Promise<GarmentAnalysisResult> {
  if (!storagePath) {
    throw new AIAnalysisError('A storage_path is required to analyze a garment photo.');
  }

  const { data, error } = await supabase.functions.invoke('analyze-garment', {
    body: { storage_path: storagePath },
  });

  if (error) {
    const message = await extractInvokeErrorMessage(error, 'The AI analysis service could not process this photo.');
    console.error('[analyzeGarmentPhoto] Edge Function error:', message);
    throw new AIAnalysisError(message);
  }

  if (!data || typeof data !== 'object') {
    throw new AIAnalysisError('The AI analysis service returned an unexpected response.');
  }

  return data as GarmentAnalysisResult;
}

/**
 * Asks the generate-outfit Edge Function for 1-3 outfit suggestions built
 * from the caller's own wardrobe. The wardrobe, style profile, and recent
 * outfit history are all read server-side (scoped to the authenticated
 * user) — this call only sends the request-time context the server can't
 * know on its own: the target occasion and (optionally) current weather.
 *
 * Returns an empty array when the AI couldn't assemble a coherent outfit —
 * that's a valid, non-error outcome, not a failure to handle as an error.
 *
 * @param occasion Must be one of constants/garmentTaxonomy.ts's OUTFIT_OCCASIONS.
 * @param weather Optional — omit if the app doesn't have a weather source wired up yet.
 */
export async function generateOutfits(occasion: string, weather?: WeatherInput | null): Promise<OutfitSuggestion[]> {
  if (!occasion) {
    throw new AIAnalysisError('An occasion is required to generate outfits.');
  }

  const { data, error } = await supabase.functions.invoke('generate-outfit', {
    body: { occasion, weather: weather ?? null },
  });

  if (error) {
    const message = await extractInvokeErrorMessage(error, 'The outfit generator could not process this request.');
    console.error('[generateOutfits] Edge Function error:', message);
    throw new AIAnalysisError(message);
  }

  if (!data || !Array.isArray(data.outfits)) {
    throw new AIAnalysisError('The outfit generator returned an unexpected response.');
  }

  return data.outfits as OutfitSuggestion[];
}

/** Same weather shape as WeatherSnapshot's relevant fields (see
 * lib/services/weatherService.ts) — declared separately here rather than
 * imported, so this file's public contract doesn't depend on the weather
 * module's internals shifting later. */
export interface DailySuggestionWeatherInput {
  temperatureCelsius?: number | null;
  feelsLikeCelsius?: number | null;
  conditionLabel?: string | null;
  chanceOfRainPercent?: number | null;
}

export interface DailySuggestionResult {
  /** The main "AI Daily Suggestion" editorial card text. */
  suggestion: string;
  /** Short phrase for the "Today's Schedule" card. Null when there's no
   * upcoming event to speak to. */
  scheduleNote: string | null;
}

/**
 * Asks the daily-suggestion Edge Function for today's editorial styling note
 * plus a short schedule-aware phrase. Wardrobe usage stats, profile, today's
 * planned outfit, and the next event are all read server-side (scoped to the
 * authenticated user) — this call only sends what the server genuinely can't
 * know itself: current weather (device GPS) and the caller's own local
 * calendar date (needed to resolve "today" without guessing a timezone).
 *
 * Never throws for "nothing interesting to say" — the Edge Function always
 * returns a graceful fallback string instead. It DOES throw AIAnalysisError
 * on a genuine request failure; callers on Home should treat that as "hide
 * the card for now", not as something to surface to the user.
 *
 * @param todayLocalDate The caller's own local calendar day, "YYYY-MM-DD".
 * @param weather Optional — omit if weather isn't available (e.g. location permission denied).
 */
export async function getDailySuggestion(
  todayLocalDate: string,
  weather?: DailySuggestionWeatherInput | null
): Promise<DailySuggestionResult> {
  if (!todayLocalDate) {
    throw new AIAnalysisError('todayLocalDate is required to request a daily suggestion.');
  }

  const { data, error } = await supabase.functions.invoke('daily-suggestion', {
    body: { todayLocalDate, weather: weather ?? null },
  });

  if (error) {
    const message = await extractInvokeErrorMessage(error, 'The daily suggestion service could not process this request.');
    console.error('[getDailySuggestion] Edge Function error:', message);
    throw new AIAnalysisError(message);
  }

  if (!data || typeof data.suggestion !== 'string') {
    throw new AIAnalysisError('The daily suggestion service returned an unexpected response.');
  }

  return {
    suggestion: data.suggestion,
    scheduleNote: typeof data.scheduleNote === 'string' ? data.scheduleNote : null,
  };
}
