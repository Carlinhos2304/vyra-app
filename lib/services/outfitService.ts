/**
 * outfitService.ts
 *
 * Persists a chosen outfit using the EXACT same two-step write shape already
 * used by the manual "Create Outfit" screen's create path
 * (app/(tabs)/create.tsx's handleSaveOutfitWorkflow, non-edit branch):
 * insert into `outfits`, then insert the ordered `outfit_items` junction
 * rows. No new tables — this is the same persistence layer the AI Outfit
 * Generator's suggestions get saved through, since generate-outfit itself
 * never writes to these tables (see its AI_GARMENT_ANALYSIS_SETUP.md notes).
 *
 * Also home to planOutfitForToday(), used by the redesigned Home's "Today's
 * Outfit" card (Regenerate flow) to assign a freshly-saved outfit to today's
 * date in outfit_plans — the same table select-outfit.tsx already writes to.
 */

import { supabase } from '../supabase';

export class SaveOutfitError extends Error {}

/** Mirrors generate-outfit's OutfitScores shape (see
 * supabase/functions/generate-outfit/providers/types.ts and
 * lib/services/aiService.ts's client-side OutfitScores) — declared
 * separately here so this file doesn't depend on aiService's exports. */
export interface SaveOutfitScoresInput {
  styleMatch: number;
  weatherSuitability: number;
  occasionFit: number;
  colorHarmony: number;
}

export interface SaveOutfitInput {
  name: string;
  occasion: string;
  /** Ordered ids into clothing_items — as returned by generateOutfits(). */
  clothingItemIds: string[];
  /** AI Outfit Generator's confidence (0.0-1.0) for this suggestion, if it
   * came from generate-outfit. Omit for manually-assembled outfits — the new
   * ai_confidence/ai_scores columns (see
   * supabase/migrations/20260803140027_outfit_ai_scores.sql) stay null,
   * which wardrobeInsightsService.ts already treats as "no AI data". */
  confidence?: number;
  scores?: SaveOutfitScoresInput;
}

/**
 * Creates a new outfit (and its outfit_items rows) for the current user.
 * Returns the new outfit's id.
 */
export async function saveOutfit({ name, occasion, clothingItemIds, confidence, scores }: SaveOutfitInput): Promise<string> {
  const sanitizedName = name.trim();
  if (!sanitizedName) {
    throw new SaveOutfitError('An outfit name is required.');
  }
  if (!clothingItemIds || clothingItemIds.length === 0) {
    throw new SaveOutfitError('An outfit needs at least one garment.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new SaveOutfitError('Your session has expired. Please sign in again.');
  }

  const { data: newOutfit, error: outfitCreateErr } = await supabase
    .from('outfits')
    .insert({
      user_id: user.id,
      name: sanitizedName,
      occasion,
      ai_confidence: typeof confidence === 'number' ? confidence : null,
      ai_scores: scores ?? null,
    })
    .select('id')
    .single();

  if (outfitCreateErr) {
    throw new SaveOutfitError(outfitCreateErr.message);
  }

  const outfitId = newOutfit.id;

  const payloadJunctionRows = clothingItemIds.map((clothingItemId) => ({
    outfit_id: outfitId,
    clothing_item_id: clothingItemId,
  }));

  const { error: junctionInsertErr } = await supabase.from('outfit_items').insert(payloadJunctionRows);

  if (junctionInsertErr) {
    throw new SaveOutfitError(junctionInsertErr.message);
  }

  return outfitId;
}

function getLocalISODateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Assigns an already-saved outfit to today's date in outfit_plans — used by
 * Home's "Today's Outfit" Regenerate flow. If today already has a planned
 * outfit, its row is updated in place (so regenerating doesn't leave
 * duplicate plans for the same day); otherwise a new row is inserted.
 *
 * Deliberately does a select-then-branch instead of `.upsert()` — there's no
 * documented unique constraint on (user_id, planned_date) to safely target
 * an upsert's `onConflict` against, so this stays explicit instead of
 * assuming one exists.
 */
export async function planOutfitForToday(outfitId: string): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new SaveOutfitError('Your session has expired. Please sign in again.');
  }

  const todayLocalISO = getLocalISODateString(new Date());

  const { data: existingPlan, error: lookupError } = await supabase
    .from('outfit_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('planned_date', todayLocalISO)
    .maybeSingle();

  if (lookupError) {
    throw new SaveOutfitError(lookupError.message);
  }

  if (existingPlan?.id) {
    const { error: updateError } = await supabase
      .from('outfit_plans')
      .update({ outfit_id: outfitId })
      .eq('id', existingPlan.id);

    if (updateError) {
      throw new SaveOutfitError(updateError.message);
    }
    return;
  }

  const { error: insertError } = await supabase.from('outfit_plans').insert({
    user_id: user.id,
    outfit_id: outfitId,
    planned_date: todayLocalISO,
  });

  if (insertError) {
    throw new SaveOutfitError(insertError.message);
  }
}

/**
 * Assigns an already-saved outfit to a specific event (`events.outfit_id`).
 * Added for the Smart Planner's Outfit Assignment feature (Recommended /
 * Generated / Saved / Change) — previously this exact update was inlined
 * ad hoc inside select-outfit.tsx's handleSelectOutfit instead of living in
 * the service layer alongside planOutfitForToday(). No RLS bypass here: the
 * `.eq('id', eventId)` update is scoped by Supabase's row-level security to
 * rows the authenticated user owns, same as every other events write in the
 * app.
 */
export async function planOutfitForEvent(eventId: string, outfitId: string): Promise<void> {
  if (!eventId) {
    throw new SaveOutfitError('An event id is required to assign an outfit.');
  }
  if (!outfitId) {
    throw new SaveOutfitError('An outfit id is required to assign it to an event.');
  }

  const { error } = await supabase.from('events').update({ outfit_id: outfitId }).eq('id', eventId);

  if (error) {
    throw new SaveOutfitError(error.message);
  }
}

/**
 * Assigns an already-saved outfit to a specific calendar date's
 * outfit_plans row (select-then-branch, same rationale as
 * planOutfitForToday — no documented unique constraint on
 * (user_id, planned_date) to target an upsert's onConflict against).
 * Extracted from select-outfit.tsx's Mode B branch so that screen no longer
 * inlines Supabase writes directly.
 */
export async function planOutfitForDate(dateISO: string, outfitId: string): Promise<void> {
  if (!dateISO) {
    throw new SaveOutfitError('A date is required to assign an outfit.');
  }
  if (!outfitId) {
    throw new SaveOutfitError('An outfit id is required to assign it to a date.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new SaveOutfitError('Your session has expired. Please sign in again.');
  }

  const { data: existingPlan, error: lookupError } = await supabase
    .from('outfit_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('planned_date', dateISO)
    .maybeSingle();

  if (lookupError) {
    throw new SaveOutfitError(lookupError.message);
  }

  if (existingPlan?.id) {
    const { error: updateError } = await supabase
      .from('outfit_plans')
      .update({ outfit_id: outfitId })
      .eq('id', existingPlan.id);

    if (updateError) {
      throw new SaveOutfitError(updateError.message);
    }
    return;
  }

  const { error: insertError } = await supabase.from('outfit_plans').insert({
    user_id: user.id,
    outfit_id: outfitId,
    planned_date: dateISO,
  });

  if (insertError) {
    throw new SaveOutfitError(insertError.message);
  }
}
