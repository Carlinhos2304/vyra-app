/**
 * garmentTaxonomy.ts
 *
 * Single source of truth for every closed vocabulary used to describe a garment
 * across the app: manual entry forms (add-garment, edit-garment), onboarding
 * personalization, and the AI garment-analysis feature (Edge Function
 * `analyze-garment`).
 *
 * Rationale: before this file existed, `CREATION_CATEGORIES` and
 * `PALETTE_COLORS` were duplicated independently in add-garment.tsx and
 * edit-garment.tsx and had drifted out of sync (11 vs 6 categories). Centralizing
 * them here means the AI's structured output, the manual entry UI, and any future
 * screen all agree on the exact same set of allowed values — no invented
 * vocabulary, no inconsistency.
 *
 * IMPORTANT: These are UI-facing labels, not database column names. Nothing here
 * renames any existing Supabase column.
 */

export interface PaletteColor {
  label: string;
  hex: string;
}

/** Canonical garment categories. Superset (11 items) — previously the only
 * complete list lived in add-garment.tsx; edit-garment.tsx had a stale 6-item
 * subset that has been unified to match this list. */
export const CREATION_CATEGORIES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
  'Jewelry',
  'Hats',
  'Swimwear',
  'Activewear',
] as const;

export type CreationCategory = (typeof CREATION_CATEGORIES)[number];

/** Canonical named color swatches used by every color picker in the app. */
export const PALETTE_COLORS: PaletteColor[] = [
  { label: 'Black', hex: '#000000' },
  { label: 'Charcoal', hex: '#374151' },
  { label: 'Gray', hex: '#4B5563' },
  { label: 'Light Gray', hex: '#D1D5DB' },
  { label: 'White', hex: '#FFFFFF' },
  { label: 'Cream', hex: '#FFFDD0' },
  { label: 'Beige', hex: '#F5F5DC' },
  { label: 'Camel', hex: '#C19A6B' },
  { label: 'Brown', hex: '#78350F' },
  { label: 'Navy', hex: '#1E3A8A' },
  { label: 'Blue', hex: '#3B82F6' },
  { label: 'Sky Blue', hex: '#93C5FD' },
  { label: 'Teal', hex: '#0D9488' },
  { label: 'Turquoise', hex: '#2DD4BF' },
  { label: 'Olive', hex: '#556B2F' },
  { label: 'Green', hex: '#16A34A' },
  { label: 'Mint', hex: '#A7F3D0' },
  { label: 'Lime', hex: '#84CC16' },
  { label: 'Burgundy', hex: '#800020' },
  { label: 'Red', hex: '#DC2626' },
  { label: 'Coral', hex: '#FF7F50' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Mustard', hex: '#CA8A04' },
  { label: 'Yellow', hex: '#FACC15' },
  { label: 'Violet', hex: '#4C1D95' },
  { label: 'Purple', hex: '#8B5CF6' },
  { label: 'Lavender', hex: '#E9D5FF' },
  { label: 'Rose', hex: '#FDA4AF' },
  { label: 'Pink', hex: '#F43F5E' },
];

/** Canonical garment style tags. Previously defined inline only in
 * onboarding/personalization.tsx (as the user's *personal* style preference) —
 * reused verbatim here since it's the same vocabulary, now also used to tag
 * individual garments (manually or via AI analysis). */
export const STYLE_OPTIONS = [
  'Casual',
  'Minimal',
  'Streetwear',
  'Elegant',
  'Sport',
  'Old Money',
  'Vintage',
  'Business',
] as const;

export type StyleOption = (typeof STYLE_OPTIONS)[number];

/** New taxonomy: what occasion a garment is suited for. Deliberately distinct
 * from the calendar/planner event CATEGORIES (Work, Travel, etc.) — those
 * describe *events*, this describes *garments*. */
export const OCCASION_OPTIONS = [
  'Casual',
  'Formal',
  'Work',
  'Sport',
  'Party',
  'Beach',
  'Special Occasion',
] as const;

export type OccasionOption = (typeof OCCASION_OPTIONS)[number];

/** New taxonomy: the `clothing_items.season` column already existed in the
 * schema but had no defined vocabulary anywhere in the app until now. */
export const SEASON_OPTIONS = [
  'Spring',
  'Summer',
  'Fall',
  'Winter',
  'All Season',
] as const;

export type SeasonOption = (typeof SEASON_OPTIONS)[number];

/** Canonical occasions for a whole OUTFIT (as opposed to OCCASION_OPTIONS
 * above, which tags a single garment). Previously defined inline only in
 * app/(tabs)/create.tsx — centralized here so the AI Outfit Generator
 * (Edge Function `generate-outfit`) validates against the exact same list
 * that already populates real `outfits.occasion` data. Deliberately kept
 * separate from OCCASION_OPTIONS: garment-level and outfit-level occasion
 * vocabularies evolved independently in the app and unifying them would risk
 * silently changing existing outfit data's meaning. */
export const OUTFIT_OCCASIONS = [
  'Casual',
  'Formal',
  'Business Casual',
  'Night Out',
  'Sporty',
  'Vacation',
  'Special Event',
] as const;

export type OutfitOccasion = (typeof OUTFIT_OCCASIONS)[number];

/**
 * Finds the closest matching palette color for a free-text color name or hex
 * value returned by the AI. Falls back to null if nothing matches closely
 * enough, so callers can decide whether to keep the AI's raw suggestion or
 * force a manual pick.
 */
export function matchPaletteColor(aiColorName: string | null | undefined): PaletteColor | null {
  if (!aiColorName) return null;
  const normalized = aiColorName.trim().toLowerCase();

  // Exact hex match
  if (normalized.startsWith('#')) {
    const found = PALETTE_COLORS.find(c => c.hex.toLowerCase() === normalized);
    if (found) return found;
  }

  // Exact label match
  const exact = PALETTE_COLORS.find(c => c.label.toLowerCase() === normalized);
  if (exact) return exact;

  // Partial/contains match (e.g. AI says "off-white" -> "white")
  const partial = PALETTE_COLORS.find(
    c => normalized.includes(c.label.toLowerCase()) || c.label.toLowerCase().includes(normalized)
  );
  return partial || null;
}

/**
 * Finds the closest matching canonical category for a free-text category
 * returned by the AI (case-insensitive, tolerates singular/plural drift).
 */
export function matchCategory(aiCategory: string | null | undefined): CreationCategory | null {
  if (!aiCategory) return null;
  const normalized = aiCategory.trim().toLowerCase().replace(/s$/, '');
  const found = CREATION_CATEGORIES.find(
    c => c.toLowerCase().replace(/s$/, '') === normalized
  );
  return found || null;
}

/** Same idea for style/occasion/season — case-insensitive exact match against
 * the canonical list, otherwise null (caller keeps field empty for manual pick). */
export function matchFromList<T extends string>(list: readonly T[], value: string | null | undefined): T | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const found = list.find(item => item.toLowerCase() === normalized);
  return found ?? null;
}
