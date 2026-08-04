/**
 * GeminiProvider — Google Gemini implementation of AIProvider.
 *
 * Default provider for Vyra's Phase 1 AI analysis, chosen for its generous
 * free tier (as of writing: ~1,500 requests/day on Flash-Lite models, no
 * card required) — appropriate for an early-stage app's volume. Swappable
 * for OpenAI/Claude/etc at any time via the AI_PROVIDER secret; nothing
 * outside this file needs to know which vendor is active.
 *
 * IMPORTANT DIFFERENCE FROM OpenAIProvider: Gemini's generateContent endpoint
 * does not reliably accept an arbitrary external HTTPS URL as image input —
 * only inline base64 data or a URI from Gemini's own Files API. So unlike
 * OpenAIProvider (which just hands the signed URL to the vendor), this
 * provider downloads the signed URL's bytes itself and inlines them as
 * base64. The AIProvider interface stays identical either way — this detail
 * is fully contained here.
 *
 * NOTE: Free-tier Gemini API usage may be used by Google to improve their
 * models (unlike paid tiers). This is a product/privacy decision, not a
 * purely technical one — flagged in AI_GARMENT_ANALYSIS_SETUP.md.
 */

import { AIProvider, AIProviderError, GarmentAnalysisResult } from './types.ts';
import { buildSystemPrompt, normalizeAnalysisResult } from './normalize.ts';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const REQUEST_TIMEOUT_MS = 25_000;

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new AIProviderError('GEMINI_API_KEY secret is not configured.', 'gemini');
    }
    this.apiKey = apiKey;
    this.model = Deno.env.get('GEMINI_VISION_MODEL') || DEFAULT_MODEL;
  }

  async analyzeGarmentImage(imageUrl: string): Promise<GarmentAnalysisResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const imageResponse = await fetch(imageUrl, { signal: controller.signal });
      if (!imageResponse.ok) {
        throw new AIProviderError(
          `Could not download the garment photo for analysis (HTTP ${imageResponse.status}).`,
          'gemini'
        );
      }
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = encodeBase64(imageBuffer);

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${buildSystemPrompt()}\n\nAnalyze this garment photo and return the JSON described above.` },
                { inline_data: { mime_type: mimeType, data: base64Image } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new AIProviderError(`Gemini API error (${response.status}): ${errBody}`, 'gemini');
      }

      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content || typeof content !== 'string') {
        throw new AIProviderError('Gemini response did not include text content.', 'gemini');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        throw new AIProviderError('Gemini response content was not valid JSON.', 'gemini', parseError);
      }

      return normalizeAnalysisResult(parsed);
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIProviderError('Gemini request timed out.', 'gemini', err);
      }
      throw new AIProviderError(`Unexpected Gemini provider failure: ${(err as Error)?.message ?? err}`, 'gemini', err);
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Chunked base64 encoding — avoids call-stack blowups on larger images from
 * spreading too many arguments into String.fromCharCode at once, and avoids
 * pulling in an extra Deno std dependency for a single conversion. */
function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
