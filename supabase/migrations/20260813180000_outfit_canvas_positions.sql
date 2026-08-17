-- ============================================================================
-- Vyra — Outfit Canvas positions (freeform drag-to-arrange outfit builder)
-- ============================================================================
-- Purpose: the redesigned "Create Outfit" screen (app/(tabs)/create.tsx) lets
-- the user drag each garment around a canvas to see how pieces look layered
-- together, instead of just picking from a flat list — see
-- components/outfit/OutfitCanvas.tsx. Where the user drops each garment
-- needs to be remembered per outfit, or reopening a saved outfit to edit it
-- would silently discard the exact arrangement the user built.
--
-- Rules followed (same as every other purely-additive migration in this
-- project):
--   - No existing column on outfit_items is renamed, retyped, or dropped.
--   - All three new columns are nullable. Every outfit_items row written
--     before this feature existed (and any future insert path that doesn't
--     set them) simply has null here — lib/services/outfitCanvasLayout.ts's
--     arrangeGarmentsOnCanvas() is the documented fallback: the canvas
--     auto-arranges by garment category instead of crashing or showing
--     nothing when a row has no saved position.
-- ============================================================================

alter table public.outfit_items
  add column if not exists position_x double precision,
  add column if not exists position_y double precision,
  add column if not exists z_index integer;

comment on column public.outfit_items.position_x is 'Normalized (0.0-1.0) horizontal position of this garment''s center on the Outfit Canvas, as a fraction of canvas width — resolution-independent across devices. Null for rows written before the canvas feature (2026-08-13) or by an insert path that does not set it; the canvas falls back to an auto-arranged-by-category layout (see lib/services/outfitCanvasLayout.ts) when null.';
comment on column public.outfit_items.position_y is 'Normalized (0.0-1.0) vertical position of this garment''s center on the Outfit Canvas, as a fraction of canvas height. Same null fallback behavior as position_x.';
comment on column public.outfit_items.z_index is 'Stacking order on the Outfit Canvas — a higher value draws on top of lower ones. Null falls back to the same auto-arranged-by-category ordering used for position_x/position_y.';
