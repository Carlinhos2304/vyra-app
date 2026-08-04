/**
 * wardrobeInsightsService.ts
 *
 * Computes the "Wardrobe Insights" section entirely from real data already
 * in Postgres — no AI call, no hardcoded placeholders (the old Home screen
 * showed fixed strings "Tailoring" / "Monochrome Minimalism" here; those are
 * gone). "Usage" below means "appears in a saved outfit" (an outfit_items
 * row) — that's the only real signal Vyra has; there's no separate
 * wear-tracking column (no "I actually put this on my body today" event),
 * so this is an honest proxy for wear frequency, not literal wear-tracking.
 */

import { supabase } from '../supabase';

export interface WardrobeInsightItem {
  id: string;
  name: string;
  count: number;
}

export interface WardrobeInsights {
  totalGarments: number;
  totalOutfits: number;
  mostUsedColor: { label: string; count: number } | null;
  favoriteCategory: { label: string; count: number } | null;
  /** Garment used at least once, but the least among those. Null if every
   * garment is unused (see unusedItemsCount) or the wardrobe is empty. */
  leastUsedGarment: WardrobeInsightItem | null;
  /** Highest-usage item in the "Shoes" category. Null if no shoes, or none used yet. */
  mostWornShoes: WardrobeInsightItem | null;
  /** Garments that have never appeared in any saved outfit. */
  unusedItemsCount: number;
  /** 0-100, averaged over outfits.ai_confidence (only AI-generated, saved
   * outfits have this — see supabase/migrations/20260803140027_outfit_ai_scores.sql).
   * Null when no AI-generated outfit has been saved yet. */
  averageOutfitConfidence: number | null;
}

const EMPTY_INSIGHTS: WardrobeInsights = {
  totalGarments: 0,
  totalOutfits: 0,
  mostUsedColor: null,
  favoriteCategory: null,
  leastUsedGarment: null,
  mostWornShoes: null,
  unusedItemsCount: 0,
  averageOutfitConfidence: null,
};

export async function getWardrobeInsights(): Promise<WardrobeInsights> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return EMPTY_INSIGHTS;

  const [garmentsRes, outfitsRes] = await Promise.all([
    supabase.from('clothing_items').select('id, name, category, color').eq('user_id', user.id),
    supabase.from('outfits').select('id, ai_confidence').eq('user_id', user.id),
  ]);

  if (garmentsRes.error || outfitsRes.error) {
    console.error('[wardrobeInsightsService] failed to load base data:', garmentsRes.error || outfitsRes.error);
    return EMPTY_INSIGHTS;
  }

  const garments = (garmentsRes.data || []) as { id: string; name: string; category: string | null; color: string | null }[];
  const outfits = (outfitsRes.data || []) as { id: string; ai_confidence: number | null }[];

  const totalGarments = garments.length;
  const totalOutfits = outfits.length;

  if (totalGarments === 0) {
    return { ...EMPTY_INSIGHTS, totalOutfits };
  }

  // Real per-garment usage counts, derived from outfit_items across the
  // user's own outfits (two-step query rather than a nested-filter join, to
  // stay predictable regardless of the exact FK relationship PostgREST infers).
  const outfitIds = outfits.map((o) => o.id);
  const usageCounts = new Map<string, number>();

  if (outfitIds.length > 0) {
    const { data: outfitItems, error: itemsError } = await supabase
      .from('outfit_items')
      .select('clothing_item_id')
      .in('outfit_id', outfitIds);

    if (itemsError) {
      console.error('[wardrobeInsightsService] failed to load outfit_items:', itemsError);
    } else {
      for (const row of outfitItems || []) {
        const id = (row as any).clothing_item_id;
        if (!id) continue;
        usageCounts.set(id, (usageCounts.get(id) || 0) + 1);
      }
    }
  }

  // Most Used Color / Favorite Category: weighted by real usage whenever any
  // outfit exists; falls back to raw wardrobe distribution otherwise (still
  // real data — "what you own" rather than "what you wear" — rather than hiding the card).
  const hasUsageData = usageCounts.size > 0;
  const colorTally = new Map<string, number>();
  const categoryTally = new Map<string, number>();

  for (const item of garments) {
    const weight = hasUsageData ? usageCounts.get(item.id) || 0 : 1;
    if (weight === 0) continue;
    if (item.color) colorTally.set(item.color, (colorTally.get(item.color) || 0) + weight);
    if (item.category) categoryTally.set(item.category, (categoryTally.get(item.category) || 0) + weight);
  }

  const topOf = (tally: Map<string, number>): { label: string; count: number } | null => {
    let best: { label: string; count: number } | null = null;
    for (const [label, count] of tally.entries()) {
      if (!best || count > best.count) best = { label, count };
    }
    return best;
  };

  const mostUsedColor = topOf(colorTally);
  const favoriteCategory = topOf(categoryTally);

  // Least Used Garment / Most Worn Shoes / Unused Items — always from real
  // per-item usage counts (0 = never appeared in any saved outfit).
  let leastUsedGarment: WardrobeInsightItem | null = null;
  let mostWornShoes: WardrobeInsightItem | null = null;
  let unusedItemsCount = 0;

  for (const item of garments) {
    const count = usageCounts.get(item.id) || 0;
    if (count === 0) {
      unusedItemsCount += 1;
      continue;
    }
    if (!leastUsedGarment || count < leastUsedGarment.count) {
      leastUsedGarment = { id: item.id, name: item.name, count };
    }
    if (item.category === 'Shoes' && (!mostWornShoes || count > mostWornShoes.count)) {
      mostWornShoes = { id: item.id, name: item.name, count };
    }
  }

  // Average Outfit Confidence — only over outfits that actually came from
  // the AI generator (ai_confidence is null for manually-built outfits).
  const confidences = outfits
    .map((o) => o.ai_confidence)
    .filter((c): c is number => typeof c === 'number' && Number.isFinite(c));

  const averageOutfitConfidence = confidences.length > 0
    ? Math.round((confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 100)
    : null;

  return {
    totalGarments,
    totalOutfits,
    mostUsedColor,
    favoriteCategory,
    leastUsedGarment,
    mostWornShoes,
    unusedItemsCount,
    averageOutfitConfidence,
  };
}
