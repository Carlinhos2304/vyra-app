/**
 * OpenAIProvider — first concrete implementation of AIProvider.
 *
 * Uses OpenAI's Chat Completions API with a vision-capable model and JSON
 * object response mode. Model name is read from the OPENAI_VISION_MODEL
 * secret so it can be swapped (e.g. to a newer/cheaper vision model) without
 * touching any code — defaults to "gpt-5-mini", the current cost-effective
 * vision-capable model as of mid-2026 (gpt-4.1-mini has been retired).
 *
 * This file is the ONLY place in the codebase that knows about OpenAI's
 * request/response shape. If OpenAI changes their API, only this file needs
 * to change.
 */

import { AIProvider, AIProviderError, GarmentAnalysisResult } from './types.ts';
import { buildSystemPrompt, normalizeAnalysisResult } from './normalize.ts';

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5-mini';
const REQUEST_TIMEOUT_MS = 25_000;

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new AIProviderError('OPENAI_API_KEY secret is not configured.', 'openai');
    }
    this.apiKey = apiKey;
    this.model = Deno.env.get('OPENAI_VISION_MODEL') || DEFAULT_MODEL;
  }

  async analyzeGarmentImage(imageUrl: string): Promise<GarmentAnalysisResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          max_tokens: 500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this garment photo and return the JSON described in the system prompt.' },
                { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new AIProviderError(`OpenAI API error (${response.status}): ${errBody}`, 'openai');
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content || typeof content !== 'string') {
        throw new AIProviderError('OpenAI response did not include message content.', 'openai');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        throw new AIProviderError('OpenAI response content was not valid JSON.', 'openai', parseError);
      }

      return normalizeAnalysisResult(parsed);
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIProviderError('OpenAI request timed out.', 'openai', err);
      }
      throw new AIProviderError(`Unexpected OpenAI provider failure: ${(err as Error)?.message ?? err}`, 'openai', err);
    } finally {
      clearTimeout(timeout);
    }
  }
}
