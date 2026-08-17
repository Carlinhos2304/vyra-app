/**
 * outfitCanvasLayout.ts
 *
 * Pure layout math for the Outfit Canvas (components/outfit/OutfitCanvas.tsx
 * + app/(tabs)/create.tsx) — no React, no Supabase. Kept separate so the
 * "how do we auto-arrange garments that don't have a saved position yet"
 * logic is one small, easily-reasoned-about unit, reused from three call
 * sites in create.tsx: adding a single garment from the picker, loading a
 * saved outfit whose outfit_items predate this feature (position_x/y are
 * null — see the 2026-08-13 migration), and dropping a full AI recommendation
 * onto the canvas at once.
 *
 * The zones below are a deliberately simple category -> body-region heuristic
 * (roughly: hats/jewelry near the top, tops+outerwear in the torso — with
 * outerwear layered ABOVE tops in z-order so a jacket visually sits over a
 * shirt like it would in real life, bottoms below that, shoes at the very
 * bottom, bags/accessories off to a side). It is NOT garment-shape-aware —
 * it doesn't know a specific photo's actual silhouette — that's out of scope
 * (see the analysis discussed with the user before building this).
 */

export interface OutfitCanvasPosition {
  /** Normalized 0.0-1.0, fraction of canvas width — see the
   * outfit_items.position_x column comment for why normalized, not pixels. */
  x: number;
  /** Normalized 0.0-1.0, fraction of canvas height. */
  y: number;
  /** Stacking order — higher draws on top. */
  zIndex: number;
}

interface CanvasGarmentLike {
  id: string;
  category: string;
}

/** Anchor point for a category's "home" position on the canvas — center of
 * where that kind of garment naturally sits on a body. */
const CATEGORY_ZONES: Record<string, { x: number; y: number }> = {
  Hats: { x: 0.5, y: 0.1 },
  Jewelry: { x: 0.68, y: 0.22 },
  Outerwear: { x: 0.5, y: 0.4 },
  Tops: { x: 0.5, y: 0.36 },
  Dresses: { x: 0.5, y: 0.48 },
  Activewear: { x: 0.5, y: 0.46 },
  Swimwear: { x: 0.5, y: 0.48 },
  Bottoms: { x: 0.5, y: 0.64 },
  Shoes: { x: 0.5, y: 0.88 },
  Bags: { x: 0.8, y: 0.58 },
  Accessories: { x: 0.22, y: 0.32 },
};
const DEFAULT_ZONE = { x: 0.5, y: 0.5 };

/** Base stacking tier per category — higher sits on top of lower. Chosen so
 * a jacket (Outerwear) layers over a shirt (Tops), and small worn pieces
 * (hats, jewelry, bags) stay visible above the torso/leg layers rather than
 * getting buried under them. */
const CATEGORY_Z_TIER: Record<string, number> = {
  Hats: 60,
  Jewelry: 55,
  Bags: 50,
  Accessories: 48,
  Outerwear: 40,
  Tops: 30,
  Dresses: 28,
  Activewear: 28,
  Swimwear: 28,
  Bottoms: 20,
  Shoes: 10,
};
const DEFAULT_Z_TIER = 25;

/** How far apart (as a fraction of canvas width) same-category duplicates
 * fan out from their shared zone's x — e.g. two Tops in one outfit — so
 * they don't land in the exact same spot and stay individually draggable. */
const DUPLICATE_SPREAD = 0.14;

/**
 * Where a single garment should default to when it doesn't have a saved
 * position yet (a freshly picked item, or a legacy outfit_items row with
 * null position_x/position_y).
 *
 * @param indexInCategory 0-based position of this garment among others of
 *   the same category in the same outfit (order doesn't matter beyond
 *   producing a stable, non-overlapping spread).
 * @param countInCategory How many garments of this category are in the
 *   outfit — used to center the spread around the category's zone.
 */
export function computeDefaultCanvasPosition(
  category: string,
  indexInCategory = 0,
  countInCategory = 1
): OutfitCanvasPosition {
  const zone = CATEGORY_ZONES[category] || DEFAULT_ZONE;
  const zTier = CATEGORY_Z_TIER[category] ?? DEFAULT_Z_TIER;
  const spread = countInCategory > 1 ? (indexInCategory - (countInCategory - 1) / 2) * DUPLICATE_SPREAD : 0;

  return {
    x: Math.min(0.9, Math.max(0.1, zone.x + spread)),
    y: zone.y,
    zIndex: zTier + indexInCategory,
  };
}

/**
 * Auto-arranges a whole list of garments at once — used when loading a
 * legacy saved outfit (no saved positions at all) and when an AI
 * recommendation gets dropped onto the canvas (see create.tsx's
 * handleRecommend). Every garment gets computeDefaultCanvasPosition()'s
 * placement for its category, with same-category duplicates correctly fanned
 * out around their shared zone (this function does the category tally that
 * computeDefaultCanvasPosition's caller would otherwise have to do by hand).
 */
export function arrangeGarmentsOnCanvas(items: CanvasGarmentLike[]): Record<string, OutfitCanvasPosition> {
  const totals: Record<string, number> = {};
  items.forEach((item) => {
    totals[item.category] = (totals[item.category] || 0) + 1;
  });

  const runningIndex: Record<string, number> = {};
  const positions: Record<string, OutfitCanvasPosition> = {};
  items.forEach((item) => {
    const idx = runningIndex[item.category] ?? 0;
    runningIndex[item.category] = idx + 1;
    positions[item.id] = computeDefaultCanvasPosition(item.category, idx, totals[item.category]);
  });

  return positions;
}

/** Next stacking value for "bring this garment to the front" — one higher
 * than whatever is currently frontmost. Starts at 1 for an empty canvas. */
export function getNextZIndex(positions: Record<string, OutfitCanvasPosition>): number {
  let max = 0;
  for (const key in positions) {
    if (positions[key].zIndex > max) max = positions[key].zIndex;
  }
  return max + 1;
}
