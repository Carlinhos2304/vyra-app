/**
 * Edge Function: remove-background
 * ============================================================================
 * Vyra — automatic garment background removal (Whering-style).
 *
 * Contract:
 *   Input:  POST { storage_path: string }  (path inside the "garments" bucket,
 *           expected to start with "<user_id>/", already uploaded by the
 *           client — same convention as analyze-garment)
 *   Output: 200 { cutout_path: string, cutout_url: string }
 *           4xx/5xx { error: string }
 *
 * Responsibilities of THIS file only:
 *   - Verify the caller's identity (JWT) and that they own the image (same
 *     defense-in-depth pattern as analyze-garment).
 *   - Download the original photo from the "garments" bucket, forward it to
 *     remove.bg's REST API asking for a TRANSPARENT cutout (a real alpha
 *     channel, not a solid white background flattened into the pixels — see
 *     the comment above the remove.bg form fields for why this matters for
 *     the Outfit Canvas), and upload the result back to the SAME bucket
 *     under a sibling "<original-name>-cutout.png" path.
 *   - Never touches clothing_items — same "analysis only, client decides
 *     what to persist" separation as analyze-garment.
 *   - Logs every call to ai_analysis_logs (feature: 'background_removal'),
 *     same cost/observability reasons analyze-garment already does — this
 *     hits a paid third-party API per call (free tier: 50/month), so a
 *     record matters even more here.
 *
 * Provider: remove.bg only, for now (see REMOVE_BG_API_KEY). Deliberately NOT
 * built with the same providers/ abstraction analyze-garment uses — that
 * pattern exists there because Gemini/OpenAI are both genuinely in play for
 * text+vision reasoning. Background removal only needed one provider at
 * launch; if a second (e.g. Photoroom) is ever wanted, extracting a small
 * BgRemovalProvider interface later is a quick, contained follow-up, not a
 * rewrite of this file.
 * ============================================================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GARMENTS_BUCKET = 'garments';
const REMOVE_BG_ENDPOINT = 'https://api.remove.bg/v1.0/removebg';

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** Inserts "-cutout" right before the file extension, e.g.
 * "user123/172-ab12.jpg" -> "user123/172-ab12-cutout.png". Always ends in
 * .png regardless of the original's extension, since remove.bg's default
 * (transparent) output is PNG — a JPG can't hold an alpha channel. Re-running
 * this on the same original always yields the same cutout path, so a re-try
 * (or a future "regenerate cutout" action) safely overwrites rather than
 * accumulating orphaned files. */
function cutoutPathFor(storagePath: string): string {
  const withoutExt = storagePath.replace(/\.[^./]+$/, '');
  return `${withoutExt}-cutout.png`;
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
  const removeBgApiKey = Deno.env.get('REMOVE_BG_API_KEY');

  // Client scoped to the caller's own JWT — used ONLY to verify identity.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Admin client (service role) — used for storage read/write and audit
  // logging, bypassing RLS deliberately since this is trusted server-side code.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let userId: string | null = null;
  let requestPayload: unknown = null;

  try {
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Unauthorized. A valid session is required.' }, 401);
    }
    userId = userData.user.id;

    if (!removeBgApiKey) {
      // Configuration error, not a per-request one — fail fast with a clear
      // message instead of a confusing downstream fetch failure.
      throw new Error('REMOVE_BG_API_KEY is not configured on this project.');
    }

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

    // Download the original photo's raw bytes (service role — bypasses RLS).
    // Simpler than analyze-garment's signed-URL approach: we need the actual
    // bytes to forward to remove.bg's multipart endpoint, not just a URL for
    // a vision model to fetch on its own.
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from(GARMENTS_BUCKET)
      .download(storagePath);

    if (downloadError || !fileBlob) {
      throw new Error(`Could not read "${storagePath}" from storage: ${downloadError?.message}`);
    }

    const removeBgForm = new FormData();
    removeBgForm.append('image_file', fileBlob, 'photo.jpg');
    removeBgForm.append('size', 'auto');
    // Deliberately transparent (no bg_color/format params — remove.bg's
    // default is a transparent PNG). Earlier this flattened to a solid white
    // JPG, which looked right in card/grid contexts but breaks the Outfit
    // Canvas (2026-08-13): stacking garments to see them combined only works
    // if each cutout has a real alpha channel — a solid white rectangle on
    // top just hides whatever's underneath it. The white "product photo"
    // look every other screen wants is now achieved by giving those
    // containers their own white background instead of baking it into the
    // pixels — see components/outfit/OutfitCanvas.tsx and the white
    // `previewContainer`/`imageWrapper` backgrounds added alongside this change.

    const removeBgResponse = await fetch(REMOVE_BG_ENDPOINT, {
      method: 'POST',
      headers: { 'X-Api-Key': removeBgApiKey },
      body: removeBgForm,
    });

    if (!removeBgResponse.ok) {
      // remove.bg returns a JSON error body ({ errors: [{ title, detail }] })
      // on 4xx/5xx — surface its own message when present, since "quota
      // exceeded" vs "no foreground detected" are genuinely different and
      // worth distinguishing in logs/ai_analysis_logs.
      let detail = `remove.bg returned HTTP ${removeBgResponse.status}.`;
      try {
        const errBody = await removeBgResponse.json();
        const firstError = errBody?.errors?.[0];
        if (firstError?.title) detail = firstError.title;
      } catch {
        // Non-JSON error body — keep the generic status message.
      }
      throw new Error(detail);
    }

    const cutoutBlob = new Blob([await removeBgResponse.arrayBuffer()], { type: 'image/png' });
    const cutoutPath = cutoutPathFor(storagePath);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(GARMENTS_BUCKET)
      .upload(cutoutPath, cutoutBlob, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      throw new Error(`Could not save the cutout image: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(GARMENTS_BUCKET).getPublicUrl(cutoutPath);

    const responsePayload = { cutout_path: cutoutPath, cutout_url: publicUrlData.publicUrl };

    await supabaseAdmin.from('ai_analysis_logs').insert({
      user_id: userId,
      feature: 'background_removal',
      status: 'success',
      request_payload: requestPayload,
      response_payload: responsePayload,
      latency_ms: Date.now() - startedAt,
    });

    return jsonResponse(responsePayload, 200);
  } catch (err) {
    const message = (err as Error)?.message ?? 'Unknown error during background removal.';
    console.error('[remove-background] error:', message);

    if (userId) {
      // Best-effort logging — a logging failure must never mask the real error.
      await supabaseAdmin.from('ai_analysis_logs').insert({
        user_id: userId,
        feature: 'background_removal',
        status: 'error',
        request_payload: requestPayload,
        error_message: message,
        latency_ms: Date.now() - startedAt,
      }).then(undefined, (logErr) => console.error('[remove-background] failed to write log:', logErr));
    }

    return jsonResponse({ error: message }, 502);
  }
});
