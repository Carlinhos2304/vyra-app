/**
 * Edge Function: analyze-garment
 * ============================================================================
 * Vyra — AI Garment Analysis, Phase 1.
 *
 * Contract:
 *   Input:  POST { storage_path: string }  (path inside the "garments" bucket,
 *           expected to start with "<user_id>/")
 *   Output: 200 GarmentAnalysisResult (see providers/types.ts)
 *           4xx/5xx { error: string }
 *
 * Responsibilities of THIS file only:
 *   - Verify the caller's identity (JWT) and that they own the image.
 *   - Turn the storage path into a short-lived signed URL (works whether the
 *     "garments" bucket is public or private — never trusts a client-supplied
 *     external URL, which would be an SSRF vector).
 *   - Delegate the actual image understanding to whichever AIProvider is
 *     configured (see providers/providerFactory.ts) — this file has ZERO
 *     vendor-specific code.
 *   - Record every call (success or failure) to ai_analysis_logs for
 *     observability/cost-tracking, generalized across future AI phases.
 *   - Return structured JSON only. No persistence to clothing_items happens
 *     here — the client reviews/edits the suggestion and saves it itself
 *     (see lib/services/aiService.ts + app/clothing/add-garment.tsx).
 *   - No recommendations, no conversation — analysis only, by design.
 * ============================================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAIProvider } from './providers/providerFactory.ts';
import { AIProviderError } from './providers/types.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SIGNED_URL_TTL_SECONDS = 60;
const GARMENTS_BUCKET = 'garments';

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

  // Client scoped to the caller's own JWT — used ONLY to verify identity.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Admin client (service role) — used for signed URLs and audit logging,
  // bypassing RLS deliberately since this is trusted server-side code.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let userId: string | null = null;
  let requestPayload: unknown = null;

  try {
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Unauthorized. A valid session is required.' }, 401);
    }
    userId = userData.user.id;

    let body: { storage_path?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }
    requestPayload = body;

    const storagePath = body.storage_path;
    if (!storagePath || typeof storagePath !== 'string') {
      return jsonResponse({ error: '"storage_path" is required.' }, 400);
    }

    // Defense in depth: the app's own upload convention already scopes files
    // under "<user_id>/...", but we don't trust the client — verify it here
    // too, so no user can ever point this function at someone else's photo.
    if (!storagePath.startsWith(`${userId}/`)) {
      return jsonResponse({ error: 'storage_path does not belong to the authenticated user.' }, 403);
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(GARMENTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(`Could not create a signed URL for "${storagePath}": ${signedUrlError?.message}`);
    }

    const provider = getAIProvider();
    const result = await provider.analyzeGarmentImage(signedUrlData.signedUrl);

    await supabaseAdmin.from('ai_analysis_logs').insert({
      user_id: userId,
      feature: 'garment_analysis',
      status: 'success',
      request_payload: requestPayload,
      response_payload: result,
      latency_ms: Date.now() - startedAt,
    });

    return jsonResponse(result, 200);
  } catch (err) {
    const message = err instanceof AIProviderError
      ? `AI provider (${err.providerName}) failed: ${err.message}`
      : (err as Error)?.message ?? 'Unknown error during garment analysis.';

    console.error('[analyze-garment] error:', message);

    if (userId) {
      // Best-effort logging — a logging failure must never mask the real error.
      await supabaseAdmin.from('ai_analysis_logs').insert({
        user_id: userId,
        feature: 'garment_analysis',
        status: 'error',
        request_payload: requestPayload,
        error_message: message,
        latency_ms: Date.now() - startedAt,
      }).then(undefined, (logErr) => console.error('[analyze-garment] failed to write log:', logErr));
    }

    const status = err instanceof AIProviderError ? 502 : 500;
    return jsonResponse({ error: message }, status);
  }
});
