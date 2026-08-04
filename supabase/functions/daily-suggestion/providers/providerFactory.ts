/**
 * providerFactory — same switch-point pattern as analyze-garment's and
 * generate-outfit's. Reuses the SAME AI_PROVIDER / GEMINI_API_KEY /
 * OPENAI_API_KEY secrets already configured for those functions — no new
 * secrets to set up for this one.
 */

import { AIProvider } from './types.ts';
import { OpenAIProvider } from './openaiProvider.ts';
import { GeminiProvider } from './geminiProvider.ts';

export function getAIProvider(): AIProvider {
  const providerName = (Deno.env.get('AI_PROVIDER') || 'gemini').trim().toLowerCase();

  switch (providerName) {
    case 'gemini':
      return new GeminiProvider();

    case 'openai':
      return new OpenAIProvider();

    default:
      throw new Error(`Unknown AI_PROVIDER "${providerName}". Supported providers: gemini, openai.`);
  }
}
