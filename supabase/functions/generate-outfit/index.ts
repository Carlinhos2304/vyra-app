/**
 * Edge Function: generate-outfit
 * ============================================================================
 * Vyra — AI Outfit Generator, Phase 2 (per CLAUDE.md's AI Roadmap).
 *
 * Contract:
 *   Input:  POST { occasion: string, weather?: { temperatureCelsius?: number, condition?: string } | null }
 *   Output: 200 { outfits: OutfitSuggestion[] }   (0 to 3 items — an empty
 *           array is a valid, non-error outcome: "nothing coherent to suggest")
 *           4xx/5xx { error: string }
 *
 * Responsibilities of THIS file only (mirrors analyze-garment's structure):
 *   - Verify the caller's identity (JWT).
 *   - Assemble the AI's context ENTIRELY server-side: wardrobe, style
 *     profile, and recent outfit history are read directly from Postgres
 *     scoped to the authenticated user (RLS + explicit .eq('user_id', ...)).
 *     The client only supplies request-time context the server can't know:
 *     occasion and current weather. This is the same principle as
 *     analyze-garment resolving the image itself instead of trusting a
 *     client-supplied URL — it's what makes "the AI can never invent an id"
 *     an enforceable guarantee rather than a prompt request: the universe of
 *     valid ids is defined by OUR query, not by anything the client sends.
 *   - Delegate reasoning to whichever AIProvider is configured (see
 *     providers/providerFactory.ts) — zero vendor-specific code here.
 *   - Record every call to ai_analysis_logs (feature: 'outfit_recommendation')
 *     — the same table Sprint 1 built, generalized across AI phases.
 *   - Return suggestions only. Saving a chosen outfit reuses the EXISTING
 *     outfits / outfit_items write path already in app/(tabs)/create.tsx —
 *     this function never writes to those tables itself.
 *   - Enforce MONTHLY_GENERATION_LIMIT per user (see
 *     increment_ai_generation_usage() in supabase/migrations) BEFORE reading
 *     any wardrobe/profile context or calling the AI provider — a cost
 *     guardrail while Vyra has no paid plan yet, not a paywall. Checked here
 *     (service role, server-side) rather than trusted from the client, so it
 *     can't be bypassed by calling this function directly with a valid JWT.
 * ============================================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIProvider } from './providers/providerFactory.ts';
import { AIProviderError, CompactWardrobeItem, RecentOutfitSummary } from './providers/types.ts';
import { OUTFIT_OCCASIONS, matchFromList } from '../../../constants/garmentTaxonomy.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RECENT_OUTFITS_LIMIT = 15;
// Safety cap on prompt size for very large wardrobes — favors the most
// recently added items (most likely to be missing AI analysis / most top of
// mind) rather than silently truncating in an arbitrary order.
const MAX_WARDROBE_ITEMS = 300;
// Quiet cost guardrail, not a paywall — Vyra has no paid plan yet. Generous
// enough that normal use (a few outfits a week) never hits it. Bump this
// single constant if it needs tuning; no migration required, the limit is
// passed as a parameter into increment_ai_generation_usage() each call.
const MONTHLY_GENERATION_LIMIT = 10;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
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

  // Client scoped to the caller's own JWT — used for EVERY data read (auth,
  // wardrobe, profile, outfit history), so Postgres RLS enforces ownership
  // on top of our own explicit .eq('user_id', ...) filters (defense in depth).
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Admin client (service role) — used ONLY for audit logging, mirroring
  // analyze-garment's narrow use of elevated privileges.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let userId: string | null = null;
  let requestPayload: unknown = null;

  try {
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Unauthorized. A valid session is required.' }, 401);
    }
    userId = userData.user.id;

    // --- Monthly cost guardrail (see file header) — checked before parsing
    // the body or touching the wardrobe, so a user over their limit never
    // triggers those reads either. ---
    const { data: usageResult, error: usageError } = await supabaseAdmin.rpc('increment_ai_generation_usage', {
      p_user_id: userId,
      p_monthly_limit: MONTHLY_GENERATION_LIMIT,
    });

    if (usageError) {
      // Fail OPEN: a broken quota check must never block a working feature
      // for everyone. The cost risk from a transient DB error here is far
      // smaller than the support/trust cost of a working feature going down.
      console.error('[generate-outfit] usage check failed, allowing request:', usageError.message);
    } else {
      const usage = Array.isArray(usageResult) ? usageResult[0] : usageResult;
      if (usage && usage.allowed === false) {
        return jsonResponse(
          { error: 'AI_MONTHLY_LIMIT_REACHED', limit: usage.monthly_limit },
          429
        );
      }
    }

    let body: { occasion?: string; weather?: { temperatureCelsius?: number; condition?: string } | null };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }
    requestPayload = body;

    const occasion = matchFromList(OUTFIT_OCCASIONS, body.occasion);
    if (!occasion) {
      return jsonResponse(
        { error: `"occasion" is required and must be one of: ${OUTFIT_OCCASIONS.join(', ')}.` },
        400
      );
    }

    const weather = body.weather && typeof body.weather === 'object'
      ? {
          temperatureCelsius: typeof body.weather.temperatureCelsius === 'number' ? body.weather.temperatureCelsius : null,
          condition: typeof body.weather.condition === 'string' ? body.weather.condition : null,
        }
      : null;

    // --- Assemble context server-side (see file header for why) ---

    const [profileResult, wardrobeResult, recentOutfitsResult] = await Promise.all([
      supabaseUser.from('profiles').select('favorite_style, favorite_colors, climate').eq('id', userId).maybeSingle(),
      supabaseUser
        .from('clothing_items')
        .select('id, name, category, color, style, occasion, season, material, tags')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_WARDROBE_ITEMS),
      supabaseUser
        .from('outfits')
        .select('name, occasion, created_at, outfit_items(clothing_item_id)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(RECENT_OUTFITS_LIMIT),
    ]);

    if (profileResult.error) throw new Error(`Could not load profile: ${profileResult.error.message}`);
    if (wardrobeResult.error) throw new Error(`Could not load wardrobe: ${wardrobeResult.error.message}`);
    if (recentOutfitsResult.error) throw new Error(`Could not load outfit history: ${recentOutfitsResult.error.message}`);

    const wardrobe: CompactWardrobeItem[] = (wardrobeResult.data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      color: item.color ?? null,
      style: item.style ?? null,
      occasion: item.occasion ?? null,
      season: item.season ?? null,
      material: item.material ?? null,
      tags: item.tags ?? null,
    }));

    if (wardrobe.length === 0) {
      return jsonResponse(
        { error: 'Your wardrobe is empty. Add some garments before generating outfits.' },
        422
      );
    }

    const recentOutfits: RecentOutfitSummary[] = (recentOutfitsResult.data || []).map((row: any) => ({
      title: row.name ?? null,
      occasion: row.occasion ?? null,
      clothing_item_ids: (row.outfit_items || []).map((junction: any) => junction.clothing_item_id).filter(Boolean),
    }));

    const profile = {
      favoriteStyle: profileResult.data?.favorite_style ?? null,
      favoriteColors: Array.isArray(profileResult.data?.favorite_colors) ? profileResult.data.favorite_colors : [],
      climate: profileResult.data?.climate ?? null,
    };

    const context = { weather, occasion, profile, wardrobe, recentOutfits };

    const provider = getAIProvider();
    const outfits = await provider.generateOutfits(context);

    await supabaseAdmin.from('ai_analysis_logs').insert({
      user_id: userId,
      feature: 'outfit_recommendation',
      status: 'success',
      request_payload: requestPayload,
      response_payload: { outfits },
      latency_ms: Date.now() - startedAt,
    });

    return jsonResponse({ outfits }, 200);
  } catch (err) {
    const message = err instanceof AIProviderError
      ? `AI provider (${err.providerName}) failed: ${err.message}`
      : (err as Error)?.message ?? 'Unknown error during outfit generation.';

    console.error('[generate-outfit] error:', message);

    if (userId) {
      await supabaseAdmin.from('ai_analysis_logs').insert({
        user_id: userId,
        feature: 'outfit_recommendation',
        status: 'error',
        request_payload: requestPayload,
        error_message: message,
        latency_ms: Date.now() - startedAt,
      }).then(undefined, (logErr) => console.error('[generate-outfit] failed to write log:', logErr));
    }

    const status = err instanceof AIProviderError ? 502 : 500;
    return jsonResponse({ error: message }, status);
  }
});
