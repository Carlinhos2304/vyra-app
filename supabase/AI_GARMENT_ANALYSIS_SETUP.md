# Vyra — AI Features: Deployment Guide

This covers the steps to run yourself so Vyra's Edge Functions go live. None
of this can be run from within this session — it needs your Supabase CLI
logged into your own project. Covers Phase 1 (`analyze-garment`) below, and
Phase 2 (`generate-outfit`) further down.

## 0. Prerequisites (one-time)

```bash
npm install -g supabase
supabase login
```

If this is the first Supabase CLI usage in this repo, link it to your
existing project (find your project ref in the Supabase dashboard URL, or
it's `nscpuxrsdqjclelhhzts` based on your current `lib/supabase.ts`):

```bash
supabase link --project-ref nscpuxrsdqjclelhhzts
```

## 1. Run the database migration

The migration only adds new nullable columns to `clothing_items` and a new
`ai_analysis_logs` table — nothing existing is renamed or altered.

```bash
supabase db push
```

If you prefer to review the SQL first, it's at
`supabase/migrations/20260802213315_ai_garment_analysis.sql` — you can also
paste it directly into the Supabase Dashboard's SQL Editor and run it there
instead of using the CLI.

## 2. Verify the `garments` storage bucket

The Edge Function generates a short-lived **signed URL** for every image it
analyzes (via the service-role key), so it works whether the bucket is public
or private — you don't need to change its visibility. No action needed here
unless you want to double check the bucket name is exactly `garments`
(Dashboard → Storage).

## 3. Set the required secrets

The AI provider's API key must live ONLY here — never in the app.

**Default provider: Gemini (free tier).** Get a free API key at
https://aistudio.google.com/apikey — no credit card required. As of writing,
the free tier gives ~15-30 requests/minute and ~1,500 requests/day on the
Flash-Lite models, which is generous for an early-stage app. Note: Google may
use free-tier requests (including the images you send) to improve their
models — this doesn't happen on paid tiers. Worth deciding consciously since
these are your users' garment photos; switch to a paid tier or to OpenAI
below if you'd rather avoid that.

```bash
supabase secrets set GEMINI_API_KEY=AIza...

# Optional — override the default vision model (defaults to "gemini-3.5-flash-lite" if unset)
supabase secrets set GEMINI_VISION_MODEL=gemini-3.5-flash-lite

# AI_PROVIDER defaults to "gemini" — only set this if you want to switch.
```

**Alternative: OpenAI.** To use OpenAI instead (paid, no free tier — see the
pricing conversation for current rates):

```bash
# Get an API key from https://platform.openai.com/api-keys
supabase secrets set OPENAI_API_KEY=sk-...

# Optional — override the default vision model (defaults to "gpt-5-mini" if unset)
supabase secrets set OPENAI_VISION_MODEL=gpt-5-mini

supabase secrets set AI_PROVIDER=openai
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` do not
need to be set manually — Supabase injects them automatically into every
Edge Function.

## 4. Deploy the function

```bash
supabase functions deploy analyze-garment
```

## 5. Smoke test

From the Supabase Dashboard → Edge Functions → analyze-garment → Invoke, or
via curl with a real user JWT and a real `storage_path` that already exists
in the `garments` bucket for that user:

```bash
curl -X POST 'https://nscpuxrsdqjclelhhzts.supabase.co/functions/v1/analyze-garment' \
  -H "Authorization: Bearer <user JWT>" \
  -H "Content-Type: application/json" \
  -d '{"storage_path": "<user_id>/<some-existing-file>.jpg"}'
```

Expected response: a `200` with the structured JSON described in
`supabase/functions/analyze-garment/providers/types.ts`, e.g.:

```json
{
  "name": "Beige Relaxed Fit Cotton T-Shirt",
  "brand": null,
  "category": "Tops",
  "colors": { "primary": "Beige", "secondary": null },
  "style": "Minimal",
  "occasion": "Casual",
  "season": "All Season",
  "materials": ["cotton"],
  "description": "A relaxed-fit beige crewneck t-shirt.",
  "tags": ["basic", "neutral", "cotton"],
  "confidence_score": 0.87
}
```

`brand` will only be non-null when a logo or legible tag is visible in the
photo — the model is instructed to never guess a brand from style alone.

## 6. Try it in the app

Open `add-garment.tsx`, pick or take a garment photo, and tap **"Analyze
with AI"**. The form should pre-fill category, color, and the new AI
Suggestions section (style, occasion, season, materials, description, tags)
— all still editable before you save.

## Switching AI providers later

Nothing in the app or in `index.ts` needs to change — both Gemini and OpenAI
are already implemented; switching between them today is just flipping the
`AI_PROVIDER` secret (and making sure the matching API key secret is set). To
add a third vendor (e.g. Claude) later:

1. Create `supabase/functions/analyze-garment/providers/claudeProvider.ts`
   implementing the `AIProvider` interface from `providers/types.ts`.
2. Register it in `providers/providerFactory.ts`'s switch statement.
3. Set that vendor's own secret (e.g. `supabase secrets set
   ANTHROPIC_API_KEY=...`) and `supabase secrets set AI_PROVIDER=claude`.
4. Redeploy: `supabase functions deploy analyze-garment`.

---

# Phase 2: AI Outfit Generator (`generate-outfit`)

Same architecture as Phase 1 (`AIProvider` abstraction, `AI_PROVIDER` /
`GEMINI_API_KEY` / `OPENAI_API_KEY` secrets — nothing new to configure if
you already set those up above). Two things ARE different, worth knowing:

- **No database migration needed.** This function reads the `clothing_items`,
  `profiles`, and `outfits`/`outfit_items` tables that already exist, and
  logs to the same `ai_analysis_logs` table Phase 1 created (it was already
  designed to generalize to `feature: 'outfit_recommendation'`).
- **The function fetches wardrobe/profile/history itself** — scoped to the
  caller's own JWT (RLS applies). The client only sends `occasion` and
  optionally `weather`. This is deliberate: it's what guarantees the AI can
  never reference a garment id that isn't genuinely yours — the id universe
  is defined by our own server-side query, not by anything the client sends.

## 1. Set the text-model secrets (optional)

The vision-specific secrets from Phase 1 (`GEMINI_VISION_MODEL`,
`OPENAI_VISION_MODEL`) don't apply here — outfit generation is text-only.
Defaults are used unless you override them:

```bash
# Optional — defaults to "gemini-3.5-flash-lite" if unset
supabase secrets set GEMINI_TEXT_MODEL=gemini-3.5-flash-lite

# Optional — only relevant if AI_PROVIDER=openai; defaults to "gpt-5-mini"
supabase secrets set OPENAI_TEXT_MODEL=gpt-5-mini
```

## 2. Deploy

```bash
supabase functions deploy generate-outfit
```

## 3. Smoke test

```bash
curl -X POST 'https://nscpuxrsdqjclelhhzts.supabase.co/functions/v1/generate-outfit' \
  -H "Authorization: Bearer <user JWT>" \
  -H "Content-Type: application/json" \
  -d '{"occasion": "Casual", "weather": {"temperatureCelsius": 18, "condition": "cloudy"}}'
```

`occasion` must be one of: Casual, Formal, Business Casual, Night Out,
Sporty, Vacation, Special Event (see `constants/garmentTaxonomy.ts`'s
`OUTFIT_OCCASIONS`) — anything else returns a `400`. `weather` is optional;
omit it entirely if the app doesn't have a weather source wired up yet (a
live weather integration wasn't part of this build — this function is ready
to accept it whenever you add one, client-side).

Expected response — 0 to 3 outfits (an empty array is a valid "couldn't find
a coherent combination" outcome, not an error):

```json
{
  "outfits": [
    {
      "title": "Relaxed Weekend Layers",
      "reasoning": "Cotton tee and denim keep it casual and breathable for mild, cloudy weather.",
      "confidence": 0.82,
      "clothing_item_ids": ["<real-uuid-1>", "<real-uuid-2>", "<real-uuid-3>"]
    }
  ]
}
```

A `422` with `"Your wardrobe is empty..."` means the test user has no
`clothing_items` rows yet — add a few garments first.

## 4. Wiring it into the app

Already wired: `app/ai/generate-outfit.tsx` is the full-screen "AI Stylist"
generation + results experience (reachable from Home's Quick Actions and
from "Regenerate" on the Today's Outfit card), and it saves a chosen
suggestion via `lib/services/outfitService.ts`'s `saveOutfit()`.

---

# Phase 3: AI Daily Suggestion (`daily-suggestion`) + Home redesign

Same architecture as Phases 1-2 — nothing new to configure if you already
set up `AI_PROVIDER` / `GEMINI_API_KEY` / `OPENAI_API_KEY` above. This phase
also touches things that are NOT Edge Functions, listed below since they
each need a manual step you'll have to run yourself.

## 1. Run the new migration

Purely additive: two new nullable columns on `outfits` (`ai_confidence`,
`ai_scores`) — nothing existing is renamed or altered. **This is required
for the app to even load Home now**, not just a nice-to-have: `useTodayOutfit`
and `wardrobeInsightsService` both select `outfits.ai_confidence`, so
without this migration those queries fail.

```bash
supabase db push
```

SQL is at `supabase/migrations/20260803140027_outfit_ai_scores.sql` if you'd
rather paste it into the Dashboard's SQL Editor.

## 2. Install expo-location

The redesigned Home shows real weather, which needs the device's GPS
coordinates. `expo-location` isn't installed yet — I only edited `app.json`
to register its config plugin (with a permission description string); I
can't run an install inside this session against your real project.

```bash
npx expo install expo-location
```

Since this adds a native module, if you're using a custom dev client
(`expo-dev-client` is already in your dependencies) you'll need to rebuild it
once (`npx expo prebuild` then `npx expo run:ios` / `npx expo run:android`,
or a new EAS build) before the location permission/API actually works. If
you're developing in plain Expo Go, no rebuild is needed — Expo Go already
bundles `expo-location`.

No API key needed for weather itself — the default provider (Open-Meteo) is
free and keyless.

## 3. Deploy the new Edge Function

```bash
supabase functions deploy daily-suggestion
```

## 4. Smoke test

```bash
curl -X POST 'https://nscpuxrsdqjclelhhzts.supabase.co/functions/v1/daily-suggestion' \
  -H "Authorization: Bearer <user JWT>" \
  -H "Content-Type: application/json" \
  -d '{"todayLocalDate": "2026-08-03", "weather": {"temperatureCelsius": 14, "feelsLikeCelsius": 12, "conditionLabel": "Partly Cloudy", "chanceOfRainPercent": 20}}'
```

Expected response:

```json
{
  "suggestion": "You've saved three outfits this month in similar dark neutrals — a lighter piece could balance today's look.",
  "scheduleNote": "Business casual is recommended."
}
```

`todayLocalDate` is required (`YYYY-MM-DD`) — the function needs the
caller's own local calendar day to resolve "today" correctly; it deliberately
does not compute this from the server's clock (see index.ts's header comment
for why). `weather` is optional — omit it (or send `null`) if location
permission was denied client-side; the AI still reasons from wardrobe usage,
today's plan, and the next event.

## 5. Everything else

Home (`app/(tabs)/home.tsx`) already calls all of this — weather, today's
outfit, next event, wardrobe insights, and the daily suggestion all load
automatically once you've done steps 1-3 above. Nothing else to wire up.
