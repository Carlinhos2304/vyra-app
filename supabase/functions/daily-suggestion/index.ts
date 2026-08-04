/**
 * Edge Function: daily-suggestion
 * ============================================================================
 * Vyra — AI Daily Suggestion + Today's Schedule note, for the redesigned Home
 * screen. Same architecture as analyze-garment/generate-outfit: a thin
 * index.ts that assembles real, server-side, RLS-scoped context and
 * delegates all reasoning to whichever AIProvider is configured — zero
 * vendor-specific code here.
 *
 * Contract:
 *   Input:  POST {
 *             weather?: { temperatureCelsius, feelsLikeCelsius, conditionLabel, chanceOfRainPercent } | null,
 *             todayLocalDate: string   // "YYYY-MM-DD", the CLIENT's local calendar day —
 *                                       // this function only sends the two things the
 *                                       // server genuinely cannot know itself: current
 *                                       // weather (device GPS) and "what day is it for
 *                                       // this specific user right now" (timezone).
 *                                       // Everything else (wardrobe usage, profile,
 *                                       // today's plan, next event, history) is fetched
 *                                       // server-side, scoped to the caller's own JWT.
 *           }
 *   Output: 200 { suggestion: string, scheduleNote: string | null }
 *           4xx/5xx { error: string }
 *
 * This feature's output is prose only — nothing here gets saved or acted on
 * by ids the way generate-outfit's suggestions do, so there's no
 * anti-hallucination id-validation layer needed (see normalize.ts's header
 * comment). The AI is still only ever given REAL computed usage stats/events —
 * never asked to invent one.
 * ============================================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIProvider } from './providers/providerFactory.ts';
import {
  AIProviderError,
  DailySuggestionContext,
  NextEventSummary,
  RecentOutfitSummary,
  TodayOutfitSummary,
  WardrobeUsageItem,
} from './providers/types.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// How far back to look for usage/history stats and style-repetition signal.
const OUTFIT_HISTORY_LIMIT = 60;
const RECENT_OUTFITS_FOR_AI = 5;
// Safety cap on prompt size for very large wardrobes, same rationale as
// generate-outfit's MAX_WARDROBE_ITEMS — favors the most "interesting" items
// (never used, or longest since last used) rather than an arbitrary slice.
const MAX_WARDROBE_ITEMS_FOR_AI = 80;

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
      weather?: { temperatureCelsius?: number; feelsLikeCelsius?: number; conditionLabel?: string; chanceOfRainPercent?: number } | null;
      todayLocalDate?: string;
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
      return jsonResponse({ error: '"todayLocalDate" is required, formatted "YYYY-MM-DD" (the caller\'s own local calendar day).' }, 400);
    }

    const weather = body.weather && typeof body.weather === 'object'
      ? {
          temperatureCelsius: typeof body.weather.temperatureCelsius === 'number' ? body.weather.temperatureCelsius : null,
          feelsLikeCelsius: typeof body.weather.feelsLikeCelsius === 'number' ? body.weather.feelsLikeCelsius : null,
          conditionLabel: typeof body.weather.conditionLabel === 'string' ? body.weather.conditionLabel : null,
          chanceOfRainPercent: typeof body.weather.chanceOfRainPercent === 'number' ? body.weather.chanceOfRainPercent : null,
        }
      : null;

    // --- Assemble context server-side (see file header for why) ---

    const [profileResult, outfitsResult, todayPlanResult, nextEventResult, wardrobeResult] = await Promise.all([
      supabaseUser.from('profiles').select('favorite_style, favorite_colors, climate').eq('id', userId).maybeSingle(),
      supabaseUser
        .from('outfits')
        .select('id, name, occasion, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(OUTFIT_HISTORY_LIMIT),
      supabaseUser
        .from('outfit_plans')
        .select('outfit_id, outfits(name, occasion, outfit_items(clothing_items(name)))')
        .eq('user_id', userId)
        .eq('planned_date', todayLocalDate)
        .maybeSingle(),
      supabaseUser
        .from('events')
        .select('name, category, event_date')
        .eq('user_id', userId)
        .gte('event_date', todayLocalDate)
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabaseUser.from('clothing_items').select('id, name, category, color').eq('user_id', userId),
    ]);

    if (profileResult.error) throw new Error(`Could not load profile: ${profileResult.error.message}`);
    if (outfitsResult.error) throw new Error(`Could not load outfit history: ${outfitsResult.error.message}`);
    if (wardrobeResult.error) throw new Error(`Could not load wardrobe: ${wardrobeResult.error.message}`);
    // todayPlanResult/nextEventResult errors are non-fatal (both optional, .maybeSingle()) —
    // a broken embed shouldn't block a suggestion the rest of the data can still support.
    if (todayPlanResult.error) console.error('[daily-suggestion] today plan lookup failed:', todayPlanResult.error.message);
    if (nextEventResult.error) console.error('[daily-suggestion] next event lookup failed:', nextEventResult.error.message);

    const recentOutfits = (outfitsResult.data || []) as { id: string; name: string | null; occasion: string | null; created_at: string }[];
    const wardrobe = (wardrobeResult.data || []) as { id: string; name: string; category: string; color: string | null }[];

    if (wardrobe.length === 0 && recentOutfits.length === 0) {
      // Not an error — a brand new user just doesn't have anything to base a
      // suggestion on yet. Return a graceful, honest, non-fabricated note.
      const emptyResult = {
        suggestion: 'Add a few garments and save an outfit to start getting personalized styling notes here.',
        scheduleNote: null,
      };
      await supabaseAdmin.from('ai_analysis_logs').insert({
        user_id: userId,
        feature: 'daily_suggestion',
        status: 'success',
        request_payload: requestPayload,
        response_payload: emptyResult,
        latency_ms: Date.now() - startedAt,
      });
      return jsonResponse(emptyResult, 200);
    }

    // Real per-garment usage counts + recency, derived from outfit_items
    // across the recent outfit history fetched above.
    const outfitIds = recentOutfits.map((o) => o.id);
    const outfitCreatedAtById = new Map(recentOutfits.map((o) => [o.id, o.created_at]));

    let usageByItemId = new Map<string, { count: number; mostRecentCreatedAt: string }>();
    let colorsByOutfitId = new Map<string, string[]>();

    if (outfitIds.length > 0) {
      const { data: outfitItemsData, error: outfitItemsError } = await supabaseUser
        .from('outfit_items')
        .select('outfit_id, clothing_item_id')
        .in('outfit_id', outfitIds);

      if (outfitItemsError) {
        console.error('[daily-suggestion] outfit_items lookup failed:', outfitItemsError.message);
      } else {
        const colorById = new Map(wardrobe.map((item) => [item.id, item.color]));

        for (const row of outfitItemsData || []) {
          const clothingItemId = (row as any).clothing_item_id as string | null;
          const outfitId = (row as any).outfit_id as string;
          if (!clothingItemId) continue;

          const createdAt = outfitCreatedAtById.get(outfitId);
          if (createdAt) {
            const existing = usageByItemId.get(clothingItemId);
            if (!existing || createdAt > existing.mostRecentCreatedAt) {
              usageByItemId.set(clothingItemId, {
                count: (existing?.count || 0) + 1,
                mostRecentCreatedAt: createdAt,
              });
            } else {
              usageByItemId.set(clothingItemId, { ...existing, count: existing.count + 1 });
            }
          }

          const color = colorById.get(clothingItemId);
          if (color) {
            const list = colorsByOutfitId.get(outfitId) || [];
            list.push(color);
            colorsByOutfitId.set(outfitId, list);
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

    // Most "interesting" first: never-used items, then longest-idle items —
    // this is what actually gets sent to the AI, capped for prompt size.
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

    let todayOutfit: TodayOutfitSummary | null = null;
    const rawTodayPlan = todayPlanResult.data as any;
    if (rawTodayPlan?.outfits) {
      const items = rawTodayPlan.outfits.outfit_items || [];
      todayOutfit = {
        name: rawTodayPlan.outfits.name,
        occasion: rawTodayPlan.outfits.occasion ?? null,
        itemNames: items.map((junction: any) => junction.clothing_items?.name).filter(Boolean),
      };
    }

    let nextEvent: NextEventSummary | null = null;
    const rawNextEvent = nextEventResult.data as any;
    if (rawNextEvent?.name && rawNextEvent?.event_date) {
      nextEvent = {
        name: rawNextEvent.name,
        category: rawNextEvent.category ?? null,
        daysFromToday: daysBetween(todayLocalDate, rawNextEvent.event_date),
      };
    }

    const recentOutfitsForAI: RecentOutfitSummary[] = recentOutfits.slice(0, RECENT_OUTFITS_FOR_AI).map((o) => ({
      title: o.name,
      occasion: o.occasion,
      colors: colorsByOutfitId.get(o.id) || [],
    }));

    const context: DailySuggestionContext = {
      weather,
      profile,
      wardrobeUsage,
      todayOutfit,
      nextEvent,
      recentOutfits: recentOutfitsForAI,
    };

    const provider = getAIProvider();
    const result = await provider.generateDailySuggestion(context);

    await supabaseAdmin.from('ai_analysis_logs').insert({
      user_id: userId,
      feature: 'daily_suggestion',
      status: 'success',
      request_payload: requestPayload,
      response_payload: result,
      latency_ms: Date.now() - startedAt,
    });

    return jsonResponse(result, 200);
  } catch (err) {
    const message = err instanceof AIProviderError
      ? `AI provider (${err.providerName}) failed: ${err.message}`
      : (err as Error)?.message ?? 'Unknown error during daily suggestion generation.';

    console.error('[daily-suggestion] error:', message);

    if (userId) {
      await supabaseAdmin.from('ai_analysis_logs').insert({
        user_id: userId,
        feature: 'daily_suggestion',
        status: 'error',
        request_payload: requestPayload,
        error_message: message,
        latency_ms: Date.now() - startedAt,
      }).then(undefined, (logErr) => console.error('[daily-suggestion] failed to write log:', logErr));
    }

    const status = err instanceof AIProviderError ? 502 : 500;
    return jsonResponse({ error: message }, status);
  }
});
