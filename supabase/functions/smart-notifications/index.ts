/**
 * Edge Function: smart-notifications
 * ============================================================================
 * Vyra — AI Smart Notifications (category 3 of the notification system).
 * Same architecture as analyze-garment/generate-outfit/daily-suggestion: a
 * thin index.ts that assembles real, server-side, RLS-scoped context and
 * delegates all reasoning to whichever AIProvider is configured — zero
 * vendor-specific code here.
 *
 * Contract:
 *   Input:  POST {
 *             todayLocalDate: string,   // "YYYY-MM-DD", caller's local day
 *             weatherToday?: {...} | null,
 *             weatherTomorrow?: {...} | null,
 *           }
 *   Output: 200 { notifications: [{ title, body }, ...] }   // 0-3 items
 *           4xx/5xx { error: string }
 *
 * Called at most once/day per user by lib/services/notificationAI.ts (see
 * that file and notificationService.runNotificationSweep for the throttle —
 * this function itself doesn't rate-limit, same as daily-suggestion).
 * ============================================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIProvider } from './providers/providerFactory.ts';
import {
  AIProviderError,
  OutfitWeekdaySample,
  SmartNotificationContext,
  UpcomingEventSummary,
  WardrobeUsageItem,
} from './providers/types.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OUTFIT_HISTORY_LIMIT = 60;
const MAX_WARDROBE_ITEMS_FOR_AI = 80;
const UPCOMING_EVENT_WINDOW_DAYS = 7;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00Z`).getTime();
  const to = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

function addDaysISO(dateISO: string, days: number): string {
  const dt = new Date(`${dateISO}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let userId: string | null = null;
  let requestPayload: unknown = null;

  try {
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Unauthorized. A valid session is required.' }, 401);
    }
    userId = userData.user.id;

    let body: {
      todayLocalDate?: string;
      weatherToday?: Record<string, unknown> | null;
      weatherTomorrow?: Record<string, unknown> | null;
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }
    requestPayload = body;

    const todayLocalDate = typeof body.todayLocalDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.todayLocalDate)
      ? body.todayLocalDate
      : null;
    if (!todayLocalDate) {
      return jsonResponse({ error: '"todayLocalDate" is required, formatted "YYYY-MM-DD".' }, 400);
    }

    const weekAgoISO = addDaysISO(todayLocalDate, -7);
    const windowEndISO = addDaysISO(todayLocalDate, UPCOMING_EVENT_WINDOW_DAYS);

    const [profileResult, outfitsResult, wardrobeResult, upcomingEventsResult] = await Promise.all([
      supabaseUser.from('profiles').select('favorite_style, favorite_colors, climate').eq('id', userId).maybeSingle(),
      supabaseUser
        .from('outfits')
        .select('id, name, occasion, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(OUTFIT_HISTORY_LIMIT),
      supabaseUser.from('clothing_items').select('id, name, category, color').eq('user_id', userId),
      supabaseUser
        .from('events')
        .select('name, category, event_date, outfit_id')
        .eq('user_id', userId)
        .gte('event_date', todayLocalDate)
        .lte('event_date', windowEndISO)
        .order('event_date', { ascending: true }),
    ]);

    if (profileResult.error) throw new Error(`Could not load profile: ${profileResult.error.message}`);
    if (outfitsResult.error) throw new Error(`Could not load outfit history: ${outfitsResult.error.message}`);
    if (wardrobeResult.error) throw new Error(`Could not load wardrobe: ${wardrobeResult.error.message}`);
    if (upcomingEventsResult.error) console.error('[smart-notifications] upcoming events lookup failed:', upcomingEventsResult.error.message);

    const recentOutfits = (outfitsResult.data || []) as { id: string; name: string | null; occasion: string | null; created_at: string }[];
    const wardrobe = (wardrobeResult.data || []) as { id: string; name: string; category: string; color: string | null }[];

    if (wardrobe.length === 0 && recentOutfits.length === 0) {
      // Not enough real data to base ANY observation on — an empty result is
      // the honest answer, not an error.
      const emptyResult = { notifications: [] };
      await supabaseAdmin.from('ai_analysis_logs').insert({
        user_id: userId,
        feature: 'smart_notifications',
        status: 'success',
        request_payload: requestPayload,
        response_payload: emptyResult,
        latency_ms: Date.now() - startedAt,
      });
      return jsonResponse(emptyResult, 200);
    }

    // Per-garment usage counts + recency (identical derivation to
    // daily-suggestion's, kept independent per-function per the "each Edge
    // Function is deployed independently" convention).
    const outfitIds = recentOutfits.map((o) => o.id);
    const outfitCreatedAtById = new Map(recentOutfits.map((o) => [o.id, o.created_at]));

    let usageByItemId = new Map<string, { count: number; mostRecentCreatedAt: string }>();
    let outfitItemsRaw: { outfit_id: string; clothing_item_id: string | null }[] = [];

    if (outfitIds.length > 0) {
      const { data: outfitItemsData, error: outfitItemsError } = await supabaseUser
        .from('outfit_items')
        .select('outfit_id, clothing_item_id')
        .in('outfit_id', outfitIds);

      if (outfitItemsError) {
        console.error('[smart-notifications] outfit_items lookup failed:', outfitItemsError.message);
      } else {
        outfitItemsRaw = (outfitItemsData || []) as { outfit_id: string; clothing_item_id: string | null }[];
        for (const row of outfitItemsRaw) {
          if (!row.clothing_item_id) continue;
          const createdAt = outfitCreatedAtById.get(row.outfit_id);
          if (!createdAt) continue;
          const existing = usageByItemId.get(row.clothing_item_id);
          if (!existing || createdAt > existing.mostRecentCreatedAt) {
            usageByItemId.set(row.clothing_item_id, { count: (existing?.count || 0) + 1, mostRecentCreatedAt: createdAt });
          } else {
            usageByItemId.set(row.clothing_item_id, { ...existing, count: existing.count + 1 });
          }
        }
      }
    }

    const now = new Date(`${todayLocalDate}T00:00:00Z`).getTime();
    const wardrobeUsageAll: WardrobeUsageItem[] = wardrobe.map((item) => {
      const usage = usageByItemId.get(item.id);
      const daysSinceLastUsed = usage
        ? Math.max(0, Math.round((now - new Date(usage.mostRecentCreatedAt).getTime()) / 86_400_000))
        : null;
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        color: item.color,
        timesUsed: usage?.count || 0,
        daysSinceLastUsed,
      };
    });

    const wardrobeUsage = [...wardrobeUsageAll]
      .sort((a, b) => {
        if (a.timesUsed === 0 && b.timesUsed !== 0) return -1;
        if (b.timesUsed === 0 && a.timesUsed !== 0) return 1;
        return (b.daysSinceLastUsed ?? 0) - (a.daysSinceLastUsed ?? 0);
      })
      .slice(0, MAX_WARDROBE_ITEMS_FOR_AI);

    const profile = {
      favoriteStyle: profileResult.data?.favorite_style ?? null,
      favoriteColors: Array.isArray(profileResult.data?.favorite_colors) ? profileResult.data.favorite_colors : [],
      climate: profileResult.data?.climate ?? null,
    };

    const upcomingEvents: UpcomingEventSummary[] = ((upcomingEventsResult.data || []) as any[]).map((ev) => ({
      name: ev.name,
      category: ev.category,
      daysFromToday: daysBetween(todayLocalDate, ev.event_date),
      hasOutfit: !!ev.outfit_id,
    }));

    // Weekday/color samples for the last OUTFIT_HISTORY_LIMIT outfits — the
    // raw material for "usually wears blue on workdays" style observations.
    const colorById = new Map(wardrobe.map((item) => [item.id, item.color]));
    const colorsByOutfitId = new Map<string, string[]>();
    for (const row of outfitItemsRaw) {
      if (!row.clothing_item_id) continue;
      const color = colorById.get(row.clothing_item_id);
      if (!color) continue;
      const list = colorsByOutfitId.get(row.outfit_id) || [];
      list.push(color);
      colorsByOutfitId.set(row.outfit_id, list);
    }

    const recentOutfitWeekdaySamples: OutfitWeekdaySample[] = recentOutfits.map((o) => {
      const weekday = new Date(o.created_at).getUTCDay();
      return {
        weekday,
        isWeekend: weekday === 0 || weekday === 6,
        colors: colorsByOutfitId.get(o.id) || [],
      };
    });

    const outfitsCreatedThisWeek = recentOutfits.filter((o) => o.created_at.slice(0, 10) >= weekAgoISO).length;

    // Simple, honest combinatorics: (tops x bottoms) minus outfits already
    // saved, floored at 0 — not a claim about STYLE compatibility, just "how
    // many top+bottom pairings exist that you haven't already saved as an
    // outfit". Given to the AI as a computed fact, never left for it to
    // estimate itself (that's exactly the kind of number a model invents
    // convincingly but wrongly).
    const topsCount = wardrobe.filter((item) => item.category === 'Tops').length;
    const bottomsCount = wardrobe.filter((item) => item.category === 'Bottoms').length;
    const possibleCombinationsEstimate = Math.max(0, topsCount * bottomsCount - recentOutfits.length);

    const context: SmartNotificationContext = {
      weather: {
        today: (body.weatherToday as any) ?? null,
        tomorrow: (body.weatherTomorrow as any) ?? null,
      },
      profile,
      wardrobeUsage,
      upcomingEvents,
      recentOutfitWeekdaySamples,
      outfitsCreatedThisWeek,
      totalGarments: wardrobe.length,
      totalOutfits: recentOutfits.length,
      possibleCombinationsEstimate,
    };

    const provider = getAIProvider();
    const result = await provider.generateSmartNotifications(context);

    await supabaseAdmin.from('ai_analysis_logs').insert({
      user_id: userId,
      feature: 'smart_notifications',
      status: 'success',
      request_payload: requestPayload,
      response_payload: result,
      latency_ms: Date.now() - startedAt,
    });

    return jsonResponse(result, 200);
  } catch (err) {
    const message = err instanceof AIProviderError
      ? `AI provider (${err.providerName}) failed: ${err.message}`
      : (err as Error)?.message ?? 'Unknown error during smart notification generation.';

    console.error('[smart-notifications] error:', message);

    if (userId) {
      await supabaseAdmin.from('ai_analysis_logs').insert({
        user_id: userId,
        feature: 'smart_notifications',
        status: 'error',
        request_payload: requestPayload,
        error_message: message,
        latency_ms: Date.now() - startedAt,
      }).then(undefined, (logErr) => console.error('[smart-notifications] failed to write log:', logErr));
    }

    const status = err instanceof AIProviderError ? 502 : 500;
    return jsonResponse({ error: message }, status);
  }
});
