-- ============================================================================
-- Vyra — Outfit AI confidence/scores (Home redesign support)
-- ============================================================================
-- Purpose: the AI Outfit Generator (generate-outfit) already computes a
-- confidence value and a styleMatch/weatherSuitability/occasionFit/
-- colorHarmony breakdown for every suggestion (see
-- supabase/functions/generate-outfit/providers/normalize.ts), but
-- lib/services/outfitService.ts's saveOutfit() previously discarded that data
-- once the user saved an outfit — there was nowhere to put it. That blocks a
-- real "Average Outfit Confidence" wardrobe insight (it would otherwise have
-- to be faked).
--
-- Rules followed (same as the Phase 1 migration):
--   - Purely additive. No existing column on outfits is renamed, retyped, or
--     dropped.
--   - Both new columns are nullable — manually-created outfits (from the
--     "Create Outfit" screen, no AI involved) simply leave them null, and any
--     insight computed over them must treat null as "no AI data available"
--     rather than assuming every outfit has a confidence score.
-- ============================================================================

alter table public.outfits
  add column if not exists ai_confidence numeric,
  add column if not exists ai_scores jsonb;

comment on column public.outfits.ai_confidence is 'AI Outfit Generator''s own confidence (0.0-1.0) for this outfit at the time it was saved, if it originated from generate-outfit. Null for manually-assembled outfits (via the Create Outfit screen).';
comment on column public.outfits.ai_scores is 'Breakdown behind ai_confidence: {styleMatch, weatherSuitability, occasionFit, colorHarmony}, each 0-100, from generate-outfit''s normalize.ts. Null for manually-assembled outfits.';
