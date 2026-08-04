/**
 * Prompt construction and output sanitization for AI Smart Notifications.
 * Same "no hallucinated ids, prose only" posture as daily-suggestion's
 * normalize.ts — nothing here gets acted on by id, so the only real risk is
 * a malformed/missing/oversized field, which this file defaults or clamps
 * rather than letting propagate to the client.
 */

import { SmartNotificationContext, SmartNotificationItem, SmartNotificationResult } from './types.ts';

const MAX_ITEMS = 3;
const MAX_TITLE_LENGTH = 40;
const MAX_BODY_LENGTH = 160;

export function buildSystemPrompt(): string {
  return `You are a personal styling assistant for a wardrobe app called Vyra, generating "AI Smart Notifications" — short, genuinely useful proactive observations about the user's wardrobe, outfit habits, and upcoming schedule.

Return ONLY a JSON object (no markdown, no prose) with this exact shape:
{
  "notifications": [ { "title": string, "body": string }, ... ]
}

Rules:
- Return between 0 and 3 items. Quality over quantity — only include an observation if it is genuinely interesting and TRUE given the real data below. It is correct and expected to return an empty array if nothing in the data is worth surfacing today.
- Every "body" must reference REAL data given to you (a real garment name, a real event, a real count, a real weekday pattern). Never invent a garment, event, statistic, or pattern that isn't supported by the data.
- "title" is a short label for the notification (under 40 characters), e.g. "Outfit Idea", "Wardrobe Pattern", "Heads Up". "body" is 1-2 short sentences, editorial and confident, matching this style (do not copy verbatim, generate fresh from the real data): "You have three formal events this week. Consider preparing your outfits today.", "Your black blazer hasn't been used in over a month.", "Weather changes tomorrow. You may need warmer clothing.", "You usually wear blue on workdays.", "You haven't created an outfit this week.", "You have enough clothes to create 15 new combinations."
- Prefer variety: don't return multiple items making the same kind of observation (e.g. two different "unused item" notes) — if several qualify, pick the single most useful one per theme.
- Do not include conversational text outside the JSON.`;
}

export function buildUserPrompt(context: SmartNotificationContext): string {
  return `User style profile: ${JSON.stringify(context.profile)}

Weather outlook (today vs tomorrow): ${JSON.stringify(context.weather)}

Wardrobe usage (reference by name only):
${JSON.stringify(context.wardrobeUsage.map(({ name, category, color, timesUsed, daysSinceLastUsed }) => ({ name, category, color, timesUsed, daysSinceLastUsed })))}

Upcoming events (next 7 days): ${JSON.stringify(context.upcomingEvents)}

Recent outfit weekday/color samples (last several weeks, for weekday-pattern observations like "usually wears blue on workdays"): ${JSON.stringify(context.recentOutfitWeekdaySamples)}

Outfits created in the last 7 days: ${context.outfitsCreatedThisWeek}

Total garments: ${context.totalGarments}, total saved outfits: ${context.totalOutfits}

Estimated possible new outfit combinations from the current wardrobe: ${context.possibleCombinationsEstimate}

Generate the JSON now, following every rule above.`;
}

function clampString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function normalizeSmartNotifications(raw: any): SmartNotificationResult {
  const rawItems = Array.isArray(raw?.notifications) ? raw.notifications : [];

  const notifications: SmartNotificationItem[] = [];
  for (const item of rawItems) {
    const title = clampString(item?.title, MAX_TITLE_LENGTH);
    const body = clampString(item?.body, MAX_BODY_LENGTH);
    if (!title || !body) continue;
    notifications.push({ title, body });
    if (notifications.length >= MAX_ITEMS) break;
  }

  return { notifications };
}
