/**
 * AIProvider — same abstraction boundary pattern as analyze-garment's and
 * generate-outfit's (re-declared here, not imported across functions, since
 * Deno deploys each Edge Function independently — see those functions'
 * providers/types.ts for the same note). Pure text/JSON reasoning, no vision.
 */

export interface WeatherInput {
  temperatureCelsius: number | null;
  feelsLikeCelsius: number | null;
  conditionLabel: string | null;
  chanceOfRainPercent: number | null;
}

/** A wardrobe item reduced to just what matters for a usage-pattern
 * observation — not the full attribute set generate-outfit needs for actual
 * outfit assembly. */
export interface WardrobeUsageItem {
  id: string;
  name: string;
  category: string;
  color: string | null;
  timesUsed: number;
  /** null when this item has never appeared in a saved outfit. This is a
   * proxy for "worn" (Vyra has no separate physical wear-tracking event) —
   * it really means "days since it last appeared in a saved outfit". */
  daysSinceLastUsed: number | null;
}

export interface UserStyleProfile {
  favoriteStyle: string | null;
  favoriteColors: string[];
  climate: string | null;
}

export interface NextEventSummary {
  name: string;
  category: string | null;
  /** 0 = today, 1 = tomorrow, etc. */
  daysFromToday: number;
}

export interface TodayOutfitSummary {
  name: string;
  occasion: string | null;
  itemNames: string[];
}

export interface RecentOutfitSummary {
  title: string | null;
  occasion: string | null;
  colors: string[];
}

export interface DailySuggestionContext {
  weather: WeatherInput | null;
  profile: UserStyleProfile;
  wardrobeUsage: WardrobeUsageItem[];
  todayOutfit: TodayOutfitSummary | null;
  nextEvent: NextEventSummary | null;
  recentOutfits: RecentOutfitSummary[];
}

export interface DailySuggestionResult {
  /** The main "AI Daily Suggestion" editorial card text — 1-2 sentences. */
  suggestion: string;
  /** Short phrase for the "Today's Schedule" card, tied to nextEvent. Null
   * when there's no upcoming event to speak to. */
  scheduleNote: string | null;
}

export interface AIProvider {
  /** Short identifier used in logs (e.g. 'openai', 'gemini'). */
  readonly name: string;
  generateDailySuggestion(context: DailySuggestionContext): Promise<DailySuggestionResult>;
}

/** Thrown by providers on any failure (network, auth, malformed response) so
 * the main handler can map it to a consistent error response shape. */
export class AIProviderError extends Error {
  constructor(message: string, public readonly providerName: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AIProviderError';
  }
}
