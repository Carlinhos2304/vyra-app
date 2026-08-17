/**
 * outfitWeatherRecommendation.ts
 *
 * Deterministic (no AI call) scoring for "which of my ALREADY-SAVED outfits
 * fits today's weather best" — powers app/outfit/recommend-today.tsx, reached
 * from Home's "Recommend" button (no outfit assigned to today yet) and the
 * repurposed "Regenerate" button (an outfit is already assigned; show other
 * existing options instead of generating a brand-new one from scratch with
 * AI — see app/(tabs)/home.tsx and the 2026-08-13 discussion that decided
 * this split: the full AI generator, app/ai/generate-outfit.tsx, stays
 * reachable from Quick Actions and the Planner's "Generate Outfit" entry
 * point, untouched).
 *
 * Deliberately not an AI call: this only needs two data points already
 * tagged on real records — clothing_items.season and the current
 * temperature/condition (see useWeather()) — the exact same inputs
 * plannerConflictService.ts's detectWeatherMismatchConflicts() already
 * reasons over, just for the opposite purpose (flagging a bad match instead
 * of ranking good ones). Kept in its own small, pure file, matching the
 * project's existing "zero-latency, real-data-driven, no extra AI cost for
 * something this mechanical" pattern (see lib/utils/weatherRecommendation.ts).
 *
 * Scope, per the user's own call (2026-08-13): this quick "today" flow is
 * purely weather-driven, not occasion-aware — an occasion-aware version for
 * a specific Planner day is a natural, separate future addition, not this
 * file's job.
 */

import type { WeatherConditionKey } from './weatherService';

export interface WeatherRecommendationInput {
  temperatureCelsius: number;
  conditionKey: WeatherConditionKey;
}

export interface ScorableOutfitGarment {
  season: string | null;
  category: string;
}

export type WeatherFitLabel = 'great' | 'good' | 'off';

// Same thresholds as plannerConflictService.ts's conflict detector — staying
// in sync matters: an outfit this file ranks a "great match" should never be
// one the Planner would simultaneously flag as a weather-mismatch conflict.
const COLD_THRESHOLD_C = 10;
const HOT_THRESHOLD_C = 26;

type TemperatureBucket = 'cold' | 'mild' | 'hot';

function temperatureBucket(tempC: number): TemperatureBucket {
  if (tempC <= COLD_THRESHOLD_C) return 'cold';
  if (tempC >= HOT_THRESHOLD_C) return 'hot';
  return 'mild';
}

const BUCKET_MATCHING_SEASONS: Record<TemperatureBucket, string[]> = {
  cold: ['Winter', 'Fall'],
  mild: ['Spring', 'Fall'],
  hot: ['Summer'],
};
const BUCKET_CLASHING_SEASONS: Record<TemperatureBucket, string[]> = {
  cold: ['Summer'],
  mild: [],
  hot: ['Winter'],
};

const WET_CONDITIONS: WeatherConditionKey[] = ['drizzle', 'rain', 'storm', 'snow'];

/**
 * 0-100. 'All Season' garments and garments with no season tag at all are
 * treated as neutral (never penalized for missing data) — only garments with
 * a real, specific season tag move the score, up or down.
 */
export function scoreOutfitForWeather(garments: ScorableOutfitGarment[], weather: WeatherRecommendationInput): number {
  const bucket = temperatureBucket(weather.temperatureCelsius);
  const taggedSeasons = garments.map((g) => g.season).filter((s): s is string => !!s && s !== 'All Season');

  let score = 65;
  if (taggedSeasons.length > 0) {
    const matching = taggedSeasons.filter((s) => BUCKET_MATCHING_SEASONS[bucket].includes(s)).length;
    const clashing = taggedSeasons.filter((s) => BUCKET_CLASHING_SEASONS[bucket].includes(s)).length;
    const matchRatio = matching / taggedSeasons.length;
    const clashRatio = clashing / taggedSeasons.length;
    score = Math.round(60 + matchRatio * 40 - clashRatio * 50);
  }

  if (WET_CONDITIONS.includes(weather.conditionKey)) {
    const hasOuterwear = garments.some((g) => g.category === 'Outerwear');
    score += hasOuterwear ? 6 : -12;
  }

  return Math.max(5, Math.min(100, score));
}

export function weatherFitLabel(score: number): WeatherFitLabel {
  if (score >= 78) return 'great';
  if (score >= 55) return 'good';
  return 'off';
}

export interface RankedByWeather<T> {
  outfit: T;
  score: number;
  fitLabel: WeatherFitLabel;
}

/** Sorts descending by weather score — ties broken by the original array
 * order (Array.prototype.sort is stable in every JS engine this app
 * targets), so ranking the same input twice is always deterministic. */
export function rankOutfitsForWeather<T extends { garments: ScorableOutfitGarment[] }>(
  outfits: T[],
  weather: WeatherRecommendationInput
): RankedByWeather<T>[] {
  return outfits
    .map((outfit) => {
      const score = scoreOutfitForWeather(outfit.garments, weather);
      return { outfit, score, fitLabel: weatherFitLabel(score) };
    })
    .sort((a, b) => b.score - a.score);
}
