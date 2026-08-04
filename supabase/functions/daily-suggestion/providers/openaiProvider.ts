/**
 * OpenAIProvider for daily-suggestion — same shape as generate-outfit's,
 * short text-only reasoning call. Lower max_tokens since the whole output is
 * 1-2 sentences plus an optional short phrase.
 */

import { AIProvider, AIProviderError, DailySuggestionContext, DailySuggestionResult } from './types.ts';
import { buildSystemPrompt, buildUserPrompt, normalizeDailySuggestion } from './normalize.ts';

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-5-mini';
const REQUEST_TIMEOUT_MS = 20_000;

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
    this.model = Deno.env.get('OPENAI_TEXT_MODEL') || DEFAULT_MODEL;
  }

  async generateDailySuggestion(context: DailySuggestionContext): Promise<DailySuggestionResult> {
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
          temperature: 0.5,
          max_tokens: 300,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: buildUserPrompt(context) },
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

      return normalizeDailySuggestion(parsed);
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
