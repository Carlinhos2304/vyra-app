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
 * (Phase 3, getDailySuggestion() — the Home redesign's AI Daily Suggestion
 * card, was removed 2026-08-17 at the user's request: low perceived value
 * on top of the already-localized, deterministic greeting header, and
 * English-only regardless of the app's language setting. The
 * daily-suggestion Edge Function itself was left deployed but unused.)
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
export async function extractInvokeErrorMessage(error: unknown, fallback: string): Promise<string> {
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

export interface BackgroundRemovalResult {
  cutoutPath: string;
  cutoutUrl: string;
}

/**
 * Sends an already-uploaded garment photo (by its Supabase Storage path) to
 * the remove-background Edge Function, which forwards it to remove.bg and
 * saves a new "<original>-cutout.jpg" back into the same "garments" bucket,
 * isolated on a solid white background — the "photo in, clean product shot
 * out" flow apps like Whering do automatically the moment you add a garment.
 * Both app/clothing/add-garment.tsx and app/clothing/edit-garment.tsx call
 * this right after a photo is picked/captured, before the user even sees the
 * final preview.
 *
 * Deliberately non-critical by calling convention: every caller treats a
 * thrown AIAnalysisError here as "keep the original photo, don't interrupt
 * the flow" — cutting the background is a nice-to-have polish step, never
 * something that should block adding or editing a garment (a remove.bg quota
 * limit or a flaky network call must never stop someone from saving their
 * photo as-is).
 *
 * @param storagePath Path inside the "garments" bucket, e.g. "<user_id>/172...-ab12.jpg".
 *   The image must already be uploaded before calling this — this function
 *   does not upload anything itself.
 */
export async function removeGarmentBackground(storagePath: string): Promise<BackgroundRemovalResult> {
  if (!storagePath) {
    throw new AIAnalysisError("A storage_path is required to remove a garment photo's background.");
  }

  const { data, error } = await supabase.functions.invoke('remove-background', {
    body: { storage_path: storagePath },
  });

  if (error) {
    const message = await extractInvokeErrorMessage(error, 'The background removal service could not process this photo.');
    console.error('[removeGarmentBackground] Edge Function error:', message);
    throw new AIAnalysisError(message);
  }

  if (!data || typeof data.cutout_url !== 'string' || typeof data.cutout_path !== 'string') {
    throw new AIAnalysisError('The background removal service returned an unexpected response.');
  }

  return { cutoutPath: data.cutout_path, cutoutUrl: data.cutout_url };
}
