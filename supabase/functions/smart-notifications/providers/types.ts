/**
 * AIProvider — same abstraction boundary pattern as daily-suggestion's and
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

/** Tomorrow's forecast vs. today's current conditions — the delta is what
 * powers "weather changes tomorrow" style observations, which a single
 * snapshot can't express. */
export interface WeatherOutlookInput {
  today: WeatherInput | null;
  tomorrow: WeatherInput | null;
}

export interface WardrobeUsageItem {
  id: string;
  name: string;
  category: string;
  color: string | null;
  timesUsed: number;
  /** null when this item has never appeared in a saved outfit. */
  daysSinceLastUsed: number | null;
}

export interface UserStyleProfile {
  favoriteStyle: string | null;
  favoriteColors: string[];
  climate: string | null;
}

/** Upcoming events (next 7 days), reduced to just what a pattern-observation
 * needs — never the full PlannerEvent shape, to keep the prompt small. */
export interface UpcomingEventSummary {
  name: string;
  category: string;
  daysFromToday: number;
  hasOutfit: boolean;
}

/** One outfit's weekday + colors, over the last several weeks — the raw
 * material for "you usually wear blue on workdays" style observations. */
export interface OutfitWeekdaySample {
  /** 0 = Sunday, 6 = Saturday, matching JS Date#getDay(). */
  weekday: number;
  isWeekend: boolean;
  colors: string[];
}

export interface SmartNotificationContext {
  weather: WeatherOutlookInput;
  profile: UserStyleProfile;
  wardrobeUsage: WardrobeUsageItem[];
  upcomingEvents: UpcomingEventSummary[];
  recentOutfitWeekdaySamples: OutfitWeekdaySample[];
  /** Outfits created in the last 7 days — feeds "you haven't created an
   * outfit this week" directly. */
  outfitsCreatedThisWeek: number;
  totalGarments: number;
  totalOutfits: number;
  /** How many distinct top+bottom (+ optional outerwear) combinations the
   * current wardrobe could theoretically assemble — computed server-side
   * (real arithmetic over real counts), given to the AI as a fact it may
   * reference rather than something it has to estimate itself. */
  possibleCombinationsEstimate: number;
}

export interface SmartNotificationItem {
  /** Short, notification-title-appropriate — under ~40 chars. */
  title: string;
  /** The observation itself, 1-2 sentences, matching the spec's own
   * examples ("Your black blazer hasn't been used in over a month."). */
  body: string;
}

export interface SmartNotificationResult {
  /** 0-3 items — the AI selects only the observations genuinely worth
   * surfacing today from the real context given, never padded to a fixed
   * count. */
  notifications: SmartNotificationItem[];
}

export interface AIProvider {
  readonly name: string;
  generateSmartNotifications(context: SmartNotificationContext): Promise<SmartNotificationResult>;
}

export class AIProviderError extends Error {
  constructor(message: string, public readonly providerName: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AIProviderError';
  }
}
