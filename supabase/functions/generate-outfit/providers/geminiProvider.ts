/**
 * GeminiProvider for generate-outfit — default provider (free tier), same
 * rationale as analyze-garment's. Pure text/JSON reasoning task, no image
 * download/base64 step needed here (that complexity was specific to
 * analyze-garment's vision input).
 */

import { AIProvider, AIProviderError, OutfitGenerationContext, OutfitSuggestion } from './types.ts';
import { buildSystemPrompt, buildUserPrompt, normalizeOutfitSuggestions } from './normalize.ts';

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
    this.model = Deno.env.get('GEMINI_TEXT_MODEL') || DEFAULT_MODEL;
  }

  async generateOutfits(context: OutfitGenerationContext): Promise<OutfitSuggestion[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
      const prompt = `${buildSystemPrompt()}\n\n${buildUserPrompt(context)}`;

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
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 900,
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

      return normalizeOutfitSuggestions(parsed, context);
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
