/**
 * AIProvider — same abstraction boundary pattern as analyze-garment's, scoped
 * to this Edge Function. Deno deploys each Supabase Edge Function as an
 * independent module, so this interface is intentionally re-declared here
 * rather than imported across functions — that keeps analyze-garment and
 * generate-outfit deployable/versionable independently while sharing the
 * exact same architectural shape.
 *
 * Unlike analyze-garment's AIProvider (which takes an image URL), this one
 * takes a fully-assembled text/JSON context — outfit generation is a pure
 * reasoning task over structured data, no vision required.
 */

export interface WeatherInput {
  temperatureCelsius: number | null;
  condition: string | null;
}

/** A single wardrobe item, trimmed to only what the model needs to reason
 * about outfit composition — no image_url, timestamps, or raw AI JSON blobs,
 * to keep prompt size (and cost) down. */
export interface CompactWardrobeItem {
  id: string;
  name: string;
  category: string;
  color: string | null;
  style: string | null;
  occasion: string | null;
  season: string | null;
  material: string[] | null;
  tags: string[] | null;
}

export interface RecentOutfitSummary {
  title: string | null;
  occasion: string | null;
  clothing_item_ids: string[];
}

export interface UserStyleProfile {
  favoriteStyle: string | null;
  favoriteColors: string[];
  climate: string | null;
}

export interface OutfitGenerationContext {
  weather: WeatherInput | null;
  occasion: string;
  profile: UserStyleProfile;
  wardrobe: CompactWardrobeItem[];
  recentOutfits: RecentOutfitSummary[];
}

/** Sub-scores behind a suggestion's overall confidence, each 0-100. Purely
 * additive to the original contract — every field is clamped and defaulted
 * by normalizeOutfitSuggestions() (see normalize.ts), so a provider that
 * omits or mis-shapes them never breaks the response. */
export interface OutfitScores {
  styleMatch: number;
  weatherSuitability: number;
  occasionFit: number;
  colorHarmony: number;
}

export interface OutfitSuggestion {
  title: string;
  reasoning: string;
  /** Model's own confidence in this suggestion, 0.0-1.0. */
  confidence: number;
  /** Ordered list of clothing_items.id — ALWAYS a subset of the ids present
   * in OutfitGenerationContext.wardrobe. Never an invented id. */
  clothing_item_ids: string[];
  /** Breakdown behind `confidence`, 0-100 each. Always present on the
   * normalized response — defaulted if the model didn't provide them. */
  scores: OutfitScores;
}

export interface AIProvider {
  /** Short identifier used in logs (e.g. 'openai', 'gemini'). */
  readonly name: string;

  /**
   * Generates 1-3 outfit suggestions from the given context. Implementations
   * must funnel their raw model output through normalizeOutfitSuggestions()
   * (see normalize.ts) before returning — that's what guarantees every
   * returned id is real and categories aren't duplicated within an outfit,
   * regardless of what the model actually said.
   */
  generateOutfits(context: OutfitGenerationContext): Promise<OutfitSuggestion[]>;
}

/** Thrown by providers on any failure (network, auth, malformed response) so
 * the main handler can map it to a consistent error response shape. */
export class AIProviderError extends Error {
  constructor(message: string, public readonly providerName: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AIProviderError';
  }
}
