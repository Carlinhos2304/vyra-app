/**
 * Provider-agnostic prompt construction AND — critically — the
 * anti-hallucination validation layer for the AI Outfit Generator.
 *
 * Every provider implementation must funnel its raw parsed JSON through
 * normalizeOutfitSuggestions() before returning. This is what actually
 * enforces "the AI must never invent garments or ids" — the prompt asks
 * nicely, but this function is what guarantees it: every returned id is
 * checked against the real wardrobe the caller was given, categories are
 * deduplicated within each outfit, and anything that doesn't hold up is
 * dropped rather than trusted.
 */

import { OutfitGenerationContext, OutfitScores, OutfitSuggestion } from './types.ts';

const MAX_OUTFITS = 3;
const MIN_ITEMS_PER_OUTFIT = 2;
const DEFAULT_SCORE = 70;

/** Static rules, identical across every request — kept separate from the
 * per-request data (buildUserPrompt) so providers that support prompt
 * caching can cache this prefix and only pay for the dynamic wardrobe/
 * profile/history data on each call. */
export function buildSystemPrompt(): string {
  return `You are an outfit generation engine for a wardrobe app called Vyra. You will be given the user's full wardrobe (each item with an id and attributes), their style profile, recent outfit history, current weather, and a target occasion.

Return ONLY a JSON object (no markdown, no prose) with this exact shape:
{
  "outfits": [
    {
      "title": string,
      "reasoning": string,
      "confidence": number,
      "clothing_item_ids": string[],
      "scores": {
        "styleMatch": number,
        "weatherSuitability": number,
        "occasionFit": number,
        "colorHarmony": number
      }
    }
  ]
}

Rules:
- Return between 1 and 3 outfits. If you genuinely cannot assemble even one coherent, appropriate outfit from the wardrobe provided, return an empty "outfits" array — do NOT force a bad combination.
- "clothing_item_ids" MUST be ids taken EXACTLY from the wardrobe list you are given. NEVER invent an id, and NEVER reference an item not present in that list. This is the most important rule.
- Order "clothing_item_ids" the way a person would naturally put the outfit together: base/inner layers first, then bottoms, then shoes, with outerwear and accessories last.
- Do NOT include two items from the same category in one outfit (e.g. two jackets, two pairs of shoes) — pick the single best fit for each role, unless the wardrobe truly offers no alternative and skipping that role would leave the outfit incomplete.
- Respect the target occasion and the season/weather implied by the current conditions. Favor general color compatibility (avoid visually clashing combinations) over exact color matching.
- Actively avoid repeating the user's recent outfit history: don't reproduce the exact same set of items as a recent outfit, and prefer varying away from combinations used very recently when reasonable alternatives exist in the wardrobe.
- When multiple valid combinations exist, prefer the user's favorite style and favorite colors — but occasion and weather appropriateness always come first.
- "reasoning" is 1-2 short, factual sentences explaining why the combination works (occasion, weather, color/style logic). No sales language, no generic compliments.
- "confidence" is your own confidence that this is a strong, coherent, appropriate suggestion, from 0.0 to 1.0.
- "scores" breaks that confidence down into four independent 0-100 ratings: "styleMatch" (fit with the user's style profile/favorite style), "weatherSuitability" (fit with the given weather, or with the item's season attributes if weather is unknown), "occasionFit" (fit with the target occasion), and "colorHarmony" (how well the chosen items' colors work together). Be honest and differentiate them — they should not all be the same number.
- Stay strictly within outfit selection from the given wardrobe. Do not suggest buying anything, and do not include conversational text outside the JSON.`;
}

/** The per-request dynamic payload: wardrobe, profile, history, weather,
 * occasion. Deliberately separate from buildSystemPrompt() (see above). */
export function buildUserPrompt(context: OutfitGenerationContext): string {
  return `Occasion: ${context.occasion}

Weather: ${context.weather ? JSON.stringify(context.weather) : 'unknown — rely on the wardrobe\'s own season/occasion attributes instead'}

User style profile: ${JSON.stringify(context.profile)}

Wardrobe (${context.wardrobe.length} items — use ONLY these ids):
${JSON.stringify(context.wardrobe)}

Recent outfit history (avoid repeating these combinations):
${JSON.stringify(context.recentOutfits)}

Generate 1-3 outfit suggestions now, following every rule above.`;
}

/** Clamps a raw score-like value to an integer 0-100, falling back to a
 * neutral default when the model omitted it or returned something
 * unusable (NaN, a string, out of range). Keeps the UI safe from ever
 * rendering a broken progress bar regardless of provider output quality. */
function clampScore(value: unknown, fallback: number = DEFAULT_SCORE): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(Math.min(100, Math.max(0, num)));
}

function normalizeScores(raw: unknown): OutfitScores {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    styleMatch: clampScore(source.styleMatch),
    weatherSuitability: clampScore(source.weatherSuitability),
    occasionFit: clampScore(source.occasionFit),
    colorHarmony: clampScore(source.colorHarmony),
  };
}

/**
 * Validates and sanitizes whatever the model returned. This is the real
 * enforcement point for "never invent garments or ids" — independent of how
 * well the model actually followed the prompt.
 */
export function normalizeOutfitSuggestions(raw: any, context: OutfitGenerationContext): OutfitSuggestion[] {
  if (!raw || !Array.isArray(raw.outfits)) {
    return [];
  }

  const validIds = new Set(context.wardrobe.map(item => item.id));
  const itemsById = new Map(context.wardrobe.map(item => [item.id, item]));

  const results: OutfitSuggestion[] = [];

  for (const rawOutfit of raw.outfits.slice(0, MAX_OUTFITS)) {
    if (!rawOutfit || !Array.isArray(rawOutfit.clothing_item_ids)) continue;

    // Keep only ids that genuinely exist in the wardrobe we provided, and
    // dedupe repeats, preserving the model's intended ordering.
    const seenIds = new Set<string>();
    const realIds: string[] = rawOutfit.clothing_item_ids.filter((id: unknown) => {
      if (typeof id !== 'string' || !validIds.has(id) || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    // Drop any second-or-later item sharing a category with one already kept
    // (e.g. two jackets) — keep the first (highest-priority) pick per category.
    const seenCategories = new Set<string>();
    const finalIds = realIds.filter((id) => {
      const category = itemsById.get(id)?.category;
      if (!category) return true;
      if (seenCategories.has(category)) return false;
      seenCategories.add(category);
      return true;
    });

    if (finalIds.length < MIN_ITEMS_PER_OUTFIT) continue; // not a wearable suggestion

    const rawConfidence = Number(rawOutfit.confidence);
    const confidence = Number.isFinite(rawConfidence) ? Math.min(1, Math.max(0, rawConfidence)) : 0.6;

    const title = typeof rawOutfit.title === 'string' && rawOutfit.title.trim()
      ? rawOutfit.title.trim().slice(0, 80)
      : 'Suggested Outfit';

    const reasoning = typeof rawOutfit.reasoning === 'string' && rawOutfit.reasoning.trim()
      ? rawOutfit.reasoning.trim().slice(0, 400)
      : 'Generated based on your wardrobe, the selected occasion, and current conditions.';

    const scores = normalizeScores(rawOutfit.scores);

    results.push({ title, reasoning, confidence, clothing_item_ids: finalIds, scores });
  }

  return results;
}
