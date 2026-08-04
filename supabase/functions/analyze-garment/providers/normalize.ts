/**
 * Provider-agnostic normalization of whatever raw JSON a vendor's model
 * returns into a GarmentAnalysisResult that matches Vyra's canonical
 * taxonomies exactly (constants/garmentTaxonomy.ts — the SAME file the React
 * Native app imports, kept as a single source of truth across the client and
 * every Edge Function).
 *
 * Every provider implementation should funnel its raw output through
 * `normalizeAnalysisResult()` before returning, so the rest of the app never
 * has to defend against provider-specific quirks (different casing, slightly
 * different wording, missing fields, etc).
 */

import {
  CREATION_CATEGORIES,
  PALETTE_COLORS,
  STYLE_OPTIONS,
  OCCASION_OPTIONS,
  SEASON_OPTIONS,
  matchCategory,
  matchPaletteColor,
  matchFromList,
} from '../../../../constants/garmentTaxonomy.ts';
import { GarmentAnalysisResult } from './types.ts';

/** Builds the exact taxonomy block injected into every provider's prompt, so
 * the model is steered toward Vyra's closed vocabularies instead of
 * inventing its own. */
export function buildTaxonomyPromptBlock(): string {
  return `
Allowed categories: ${CREATION_CATEGORIES.join(', ')}
Allowed colors (pick the closest named color): ${PALETTE_COLORS.map(c => c.label).join(', ')}
Allowed styles: ${STYLE_OPTIONS.join(', ')}
Allowed occasions: ${OCCASION_OPTIONS.join(', ')}
Allowed seasons: ${SEASON_OPTIONS.join(', ')}
`.trim();
}

export function buildSystemPrompt(): string {
  return `You are a garment analysis engine for a wardrobe app. You are given a single photo of one clothing item.

Return ONLY a JSON object (no markdown, no prose) with this exact shape:
{
  "name": string,
  "brand": string | null,
  "category": string,
  "colors": { "primary": string, "secondary": string | null },
  "style": string,
  "occasion": string,
  "season": string,
  "materials": string[],
  "description": string,
  "tags": string[],
  "confidence_score": number
}

Rules:
- "name" is a short, consistent, descriptive title using EXACTLY this order: Color + Main Characteristic + Garment Type. Example: "White Oversized Cotton T-Shirt", "Navy Slim Fit Wool Blazer", "Black Ribbed Knit Sweater". Title Case, no punctuation at the start/end, no marketing language, 3-6 words. The "Main Characteristic" is the single most visually obvious trait (fit, texture, pattern, cut — e.g. "Oversized", "Slim Fit", "Ribbed", "Cropped", "Striped", "Pleated"). If genuinely nothing distinctive stands out, you may omit that word rather than inventing one, but always keep Color and Garment Type.
- "brand" MUST be null UNLESS a logo, woven label, or printed brand name is clearly legible in the photo. If you are not highly confident, return null. NEVER guess or infer a brand from style, cut, or general appearance alone — a null brand is the correct, expected answer for the vast majority of photos.
- "category", "style", "occasion", and "season" MUST be chosen from the allowed lists below — pick the single closest match, never invent a new value.
- "colors.primary" and "colors.secondary" MUST be chosen from the allowed colors list below. Set "secondary" to null if the garment is a single dominant color.
- "materials" is a free-form list of likely fabrics/materials (e.g. ["cotton", "polyester"]). Use your best visual judgement; return an empty array if you cannot tell.
- "description" is one short, neutral sentence describing the garment (max ~20 words). No opinions, no styling advice, no recommendations.
- "tags" is 3-6 short lowercase descriptive keywords.
- "confidence_score" is your own confidence in this analysis, from 0.0 to 1.0.
- Do NOT suggest outfit pairings, styling advice, or anything conversational. Analysis only.

${buildTaxonomyPromptBlock()}`;
}

/** Title-cases a fallback name built from color + category when the model
 * omits "name" or returns something unusable — keeps the field always
 * populated without ever inventing a brand or characteristic. */
function buildFallbackName(primaryColor: string, category: string): string {
  return [primaryColor, category].filter(Boolean).join(' ').trim();
}

export function normalizeAnalysisResult(raw: any): GarmentAnalysisResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI response was not a JSON object.');
  }

  const category = matchCategory(raw.category) ?? String(raw.category ?? '').trim();
  const primaryColor = matchPaletteColor(raw?.colors?.primary)?.label ?? String(raw?.colors?.primary ?? '').trim();
  const secondaryColorMatch = raw?.colors?.secondary ? matchPaletteColor(raw.colors.secondary) : null;
  const style = matchFromList(STYLE_OPTIONS, raw.style) ?? String(raw.style ?? '').trim();
  const occasion = matchFromList(OCCASION_OPTIONS, raw.occasion) ?? String(raw.occasion ?? '').trim();
  const season = matchFromList(SEASON_OPTIONS, raw.season) ?? String(raw.season ?? '').trim();

  const materials = Array.isArray(raw.materials)
    ? raw.materials.filter((m: unknown) => typeof m === 'string').slice(0, 10)
    : [];

  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t: unknown) => typeof t === 'string').slice(0, 8)
    : [];

  const description = typeof raw.description === 'string' ? raw.description.slice(0, 300) : '';

  const rawConfidence = Number(raw.confidence_score);
  const confidence_score = Number.isFinite(rawConfidence) ? Math.min(1, Math.max(0, rawConfidence)) : 0.6;

  if (!category) {
    throw new Error('AI response did not include a recognizable category.');
  }

  const finalPrimaryColor = primaryColor || 'Black';

  const name = typeof raw.name === 'string' && raw.name.trim()
    ? raw.name.trim().slice(0, 80)
    : buildFallbackName(finalPrimaryColor, category);

  // Defense in depth against the model ignoring instructions: only ever keep
  // a brand if it reads like a real brand token (short, no filler phrases
  // like "unknown" or "not visible" that some models return instead of null).
  const rawBrand = typeof raw.brand === 'string' ? raw.brand.trim() : '';
  const looksLikeNonAnswer = /^(n\/?a|none|null|unknown|not visible|no brand|unbranded)$/i.test(rawBrand);
  const brand = rawBrand && !looksLikeNonAnswer ? rawBrand.slice(0, 60) : null;

  return {
    name,
    brand,
    category,
    colors: {
      primary: finalPrimaryColor,
      secondary: secondaryColorMatch?.label ?? null,
    },
    style,
    occasion,
    season,
    materials,
    description,
    tags,
    confidence_score,
  };
}
