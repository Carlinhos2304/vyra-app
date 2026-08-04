/**
 * providerFactory — same switch-point pattern as analyze-garment's. Selected
 * via the AI_PROVIDER secret (defaults to "gemini"). index.ts only ever
 * calls getAIProvider().generateOutfits(context) — no vendor-specific code
 * anywhere outside this folder.
 *
 * TO ADD A NEW PROVIDER LATER (e.g. Claude):
 *   1. Create ./claudeProvider.ts implementing AIProvider (from ./types.ts).
 *   2. Import it below and add a case to the switch.
 *   3. Set the AI_PROVIDER secret to 'claude' and add that vendor's own API
 *      key as its own secret (e.g. ANTHROPIC_API_KEY).
 *   4. Deploy. No changes needed anywhere else in this function or in the app.
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

    // case 'claude':
    //   return new ClaudeProvider();

    default:
      throw new Error(`Unknown AI_PROVIDER "${providerName}". Supported providers: gemini, openai.`);
  }
}
