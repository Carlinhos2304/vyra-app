/**
 * AIProvider — the abstraction boundary between the analyze-garment Edge
 * Function and whichever AI vendor actually performs the image analysis.
 *
 * WHY THIS EXISTS: Vyra must never be hard-coupled to a single AI vendor.
 * Every provider-specific detail (API shape, auth header, model name, prompt
 * formatting quirks) lives inside a class that implements this interface.
 * The rest of the function (auth, signed URLs, logging, response shaping)
 * knows nothing about OpenAI, Claude, Gemini, or any other vendor — it only
 * calls `provider.analyzeGarmentImage(url)` and gets back a normalized
 * GarmentAnalysisResult.
 *
 * To add a new provider later (Claude, Gemini, etc.):
 *   1. Create providers/<vendor>Provider.ts implementing AIProvider.
 *   2. Register it in providers/providerFactory.ts.
 *   3. Set the AI_PROVIDER secret to the new vendor's key.
 * No other file in this function needs to change.
 */

export interface GarmentAnalysisResult {
  /** Descriptive, consistent title: "Color + Main Characteristic + Garment Type"
   * (e.g. "White Oversized Cotton T-Shirt"). Always populated — providers fall
   * back to a simpler "{color} {category}" title if the model omits it. */
  name: string;
  /** Brand name, ONLY when a logo or legible tag/label is clearly visible in
   * the photo with high confidence. Never guessed/inferred from style alone —
   * null means "not determinable", not "no brand". */
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
  /** Self-reported confidence from the model, 0.0–1.0. Providers that don't
   * report one should return a conservative default (e.g. 0.6) rather than
   * omitting the field, so downstream code never has to special-case it. */
  confidence_score: number;
}

export interface AIProvider {
  /** Short identifier used in logs (e.g. 'openai', 'claude', 'gemini'). */
  readonly name: string;

  /**
   * Analyzes a single garment photo and returns structured data only.
   * Implementations must NOT add recommendations, styling advice, or
   * conversational text — Phase 1 is analysis-only by explicit design.
   *
   * @param imageUrl A short-lived signed URL the provider can fetch directly.
   */
  analyzeGarmentImage(imageUrl: string): Promise<GarmentAnalysisResult>;
}

/** Thrown by providers on any failure (network, auth, malformed response) so
 * the main handler can map it to a consistent error response shape. */
export class AIProviderError extends Error {
  constructor(message: string, public readonly providerName: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AIProviderError';
  }
}
