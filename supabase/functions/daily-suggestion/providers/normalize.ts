/**
 * Prompt construction and output sanitization for the AI Daily Suggestion.
 * Unlike generate-outfit, this feature's output is prose only (no ids to
 * validate, nothing gets persisted or acted on by the app) — so there's no
 * anti-hallucination id-checking layer here. The only real risk is a
 * malformed/missing field, which this file defaults safely so the Home
 * screen never has to handle "the AI returned garbage" as a special case.
 */

import { DailySuggestionContext, DailySuggestionResult } from './types.ts';

const FALLBACK_SUGGESTION = 'Your wardrobe is ready when you are — check back after adding a few outfits for personalized styling notes.';
const MAX_SUGGESTION_LENGTH = 220;
const MAX_SCHEDULE_NOTE_LENGTH = 120;

export function buildSystemPrompt(): string {
  return `You are a personal styling assistant for a wardrobe app called Vyra. You will be given: the user's style profile, real usage statistics for their wardrobe (how many times each item has appeared in a saved outfit, and how many days since it last did), today's planned outfit (if any), the next upcoming event (if any), recent outfit history, and current weather.

Return ONLY a JSON object (no markdown, no prose) with this exact shape:
{
  "suggestion": string,
  "scheduleNote": string | null
}

Rules:
- "suggestion" is the single most useful, concrete, specific styling observation you can make from the REAL data given — reference an actual fact (a real garment name, a real weather change, a real repeated pattern in recent outfits, or a real unused item and how long it's been). Never invent a garment, event, or statistic that wasn't given to you. 1-2 short sentences, editorial and confident, no generic compliments, no sales language. Good examples of the STYLE to aim for (do not copy verbatim, generate fresh from the real data): "Because temperatures will drop this afternoon, consider swapping your sneakers for boots.", "You haven't worn this jacket in three weeks — today could be a good day for it.", "You've been favoring monochrome looks in your last few outfits."
- If there isn't enough real data to say anything specific and true (e.g. an almost-empty wardrobe and no outfit history), it's fine to give a brief, honest, encouraging note instead of forcing a fake insight — but never state something as fact that wasn't in the data you were given.
- "scheduleNote" is a short phrase (under 15 words) tied to the next event and weather/occasion — e.g. "Business casual is recommended.", "Rain expected before your evening plans." Return null if no next event was provided, or if there's nothing meaningful to add.
- Do not include conversational text outside the JSON.`;
}

export function buildUserPrompt(context: DailySuggestionContext): string {
  return `User style profile: ${JSON.stringify(context.profile)}

Current weather: ${context.weather ? JSON.stringify(context.weather) : 'unknown'}

Wardrobe usage (id omitted, not needed — these are for you to reference by name only):
${JSON.stringify(context.wardrobeUsage.map(({ name, category, color, timesUsed, daysSinceLastUsed }) => ({ name, category, color, timesUsed, daysSinceLastUsed })))}

Today's planned outfit: ${context.todayOutfit ? JSON.stringify(context.todayOutfit) : 'none planned yet'}

Next upcoming event: ${context.nextEvent ? JSON.stringify(context.nextEvent) : 'none'}

Recent outfit history: ${JSON.stringify(context.recentOutfits)}

Generate the JSON now, following every rule above.`;
}

function clampString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function normalizeDailySuggestion(raw: any): DailySuggestionResult {
  const suggestion = clampString(raw?.suggestion, MAX_SUGGESTION_LENGTH) ?? FALLBACK_SUGGESTION;
  const scheduleNote = clampString(raw?.scheduleNote, MAX_SCHEDULE_NOTE_LENGTH);

  return { suggestion, scheduleNote };
}
