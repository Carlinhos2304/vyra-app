/**
 * wardrobeNotifications.ts
 *
 * Category 4 (Wardrobe Notifications) — never-worn garments, duplicate
 * garments, missing essential categories, wardrobe balance. Deterministic,
 * built on top of wardrobeInsightsService.ts (the same real-usage-derived
 * data Home's Wardrobe Insights card already computes) plus two small
 * additional queries (duplicates, category coverage) that don't belong in
 * that file since it's scoped to the 6 specific Home-card metrics.
 *
 * Runs on a weekly cadence (see WEEKLY_DEDUPE_WINDOW below) — these
 * observations don't change meaningfully day to day, so scheduling them
 * daily would just be noise.
 */

import { supabase } from '../supabase';
import { getWardrobeInsights } from './wardrobeInsightsService';
import * as Queue from './notificationQueue';
import type { NotificationPreferences, NotificationRequest, SupportedNotificationLanguage } from './notificationTypes';

/** A garment unused for at least this many days is worth surfacing —
 * shorter than "never used" so recently-added items aren't flagged
 * immediately. */
const STALE_GARMENT_DAYS = 30;
/** Core categories most wardrobes should have at least one item in. Not the
 * full 11-item CREATION_CATEGORIES list — Jewelry/Swimwear/Hats are
 * legitimately optional for many users, so checking against those would
 * false-positive constantly rather than surface a genuine gap. */
const ESSENTIAL_CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes'] as const;

function isoWeekKey(date: Date): string {
  // ISO week number, good enough as a stable weekly dedupe bucket — doesn't
  // need to be calendar-perfect, just consistent within a given week.
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

interface WardrobeTip {
  dedupeSuffix: string;
  title: string;
  body: string;
}

async function findDuplicateGarmentTip(userId: string, language: SupportedNotificationLanguage): Promise<WardrobeTip | null> {
  const { data, error } = await supabase.from('clothing_items').select('id, name, category, color').eq('user_id', userId);
  if (error || !data) return null;

  const tally = new Map<string, { count: number; category: string; color: string }>();
  for (const item of data as { id: string; name: string; category: string | null; color: string | null }[]) {
    if (!item.category || !item.color) continue;
    const key = `${item.category}::${item.color}`;
    const existing = tally.get(key);
    tally.set(key, { count: (existing?.count || 0) + 1, category: item.category, color: item.color });
  }

  let best: { count: number; category: string; color: string } | null = null;
  for (const entry of tally.values()) {
    if (entry.count >= 3 && (!best || entry.count > best.count)) best = entry;
  }
  if (!best) return null;

  return {
    dedupeSuffix: 'duplicate',
    title: language === 'es' ? 'Armario' : 'Wardrobe',
    body:
      language === 'es'
        ? `Tienes ${best.count} prendas ${best.category.toLowerCase()} en ${best.color.toLowerCase()}. Considera variar tu guardarropa.`
        : `You have ${best.count} ${best.category.toLowerCase()} items in ${best.color.toLowerCase()}. Consider diversifying your wardrobe.`,
  };
}

async function findMissingCategoryTip(userId: string, language: SupportedNotificationLanguage): Promise<WardrobeTip | null> {
  const { data, error } = await supabase.from('clothing_items').select('category').eq('user_id', userId);
  if (error || !data || data.length === 0) return null; // Empty wardrobe is onboarding's job to flag, not this.

  const owned = new Set((data as { category: string | null }[]).map((row) => row.category).filter(Boolean));
  const missing = ESSENTIAL_CATEGORIES.filter((category) => !owned.has(category));
  if (missing.length === 0) return null;

  const firstMissing = missing[0];
  return {
    dedupeSuffix: 'missing-category',
    title: language === 'es' ? 'Armario' : 'Wardrobe',
    body:
      language === 'es'
        ? `Tu armario no tiene ${firstMissing.toLowerCase()} — quizás valga la pena agregar algunos.`
        : `Your wardrobe has no ${firstMissing.toLowerCase()} — might be worth adding a few.`,
  };
}

function buildInsightsTips(
  insights: Awaited<ReturnType<typeof getWardrobeInsights>>,
  language: SupportedNotificationLanguage
): WardrobeTip[] {
  const tips: WardrobeTip[] = [];
  const title = language === 'es' ? 'Armario' : 'Wardrobe';

  if (insights.unusedItemsCount >= 5) {
    tips.push({
      dedupeSuffix: 'unused-count',
      title,
      body:
        language === 'es'
          ? `Tienes ${insights.unusedItemsCount} prendas sin usar en tu armario.`
          : `You have ${insights.unusedItemsCount} unused garments in your wardrobe.`,
    });
  }

  if (insights.leastUsedGarment) {
    tips.push({
      dedupeSuffix: `stale-${insights.leastUsedGarment.id}`,
      title,
      body:
        language === 'es'
          ? `${insights.leastUsedGarment.name} casi no la has usado. ¿La incluyes en tu próximo outfit?`
          : `${insights.leastUsedGarment.name} has barely been used. Consider it for your next outfit?`,
    });
  }

  return tips;
}

/**
 * Generates and schedules this week's wardrobe tips, each deduped per
 * (tip-type, ISO week) so re-running the sweep any day that week is a no-op.
 * Schedules at most `MAX_TIPS_PER_WEEK` — a real wardrobe can trigger
 * several rules at once, and firing all of them the same week reads as spam
 * rather than a "smart" assistant.
 */
const MAX_TIPS_PER_WEEK = 2;

export async function scheduleWardrobeTips(prefs: NotificationPreferences, language: SupportedNotificationLanguage): Promise<void> {
  if (!prefs.wardrobeEnabled) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const insights = await getWardrobeInsights();
  if (insights.totalGarments === 0) return;

  const [duplicateTip, missingCategoryTip] = await Promise.all([
    findDuplicateGarmentTip(user.id, language),
    findMissingCategoryTip(user.id, language),
  ]);

  const allTips = [...buildInsightsTips(insights, language), duplicateTip, missingCategoryTip].filter(
    (tip): tip is WardrobeTip => !!tip
  );

  const weekKey = isoWeekKey(new Date());
  const [hh, mm] = prefs.notificationTime.split(':').map(Number);
  const triggerDate = new Date();
  triggerDate.setHours(hh, mm, 0, 0);
  if (triggerDate.getTime() <= Date.now()) triggerDate.setDate(triggerDate.getDate() + 1);

  for (const tip of allTips.slice(0, MAX_TIPS_PER_WEEK)) {
    const request: NotificationRequest = {
      category: 'wardrobe',
      dedupeKey: `wardrobe-${tip.dedupeSuffix}-${weekKey}`,
      title: tip.title,
      body: tip.body,
      actionRoute: '/(tabs)/closet',
      triggerDate,
    };
    await Queue.enqueueAndSchedule(request, prefs);
  }

  void STALE_GARMENT_DAYS; // Reserved for a future per-item "hasn't been used since <date>" rule once outfit_items gains real wear-event timestamps (see wardrobeInsightsService's header note on usage being a proxy).
}
