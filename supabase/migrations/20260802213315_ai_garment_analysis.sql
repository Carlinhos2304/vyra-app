-- ============================================================================
-- Vyra — AI Garment Analysis (Phase 1)
-- ============================================================================
-- Purpose: support the first AI feature described in CLAUDE.md's AI Roadmap —
-- automatic structured analysis of a garment photo (category, colors, style,
-- occasion, season, materials, description, tags). No recommendation or
-- conversational features are introduced here.
--
-- Rules followed:
--   - Purely additive. No existing column on clothing_items is renamed, typed
--     differently, or dropped.
--   - Existing columns are reused wherever the schema already has an obvious
--     home for an AI-produced value (category, color, season, tags,
--     ai_description) instead of creating redundant duplicate columns.
--   - New columns are nullable with safe defaults so existing rows and existing
--     app code paths that don't know about AI analysis keep working unchanged.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. New columns on clothing_items
-- ----------------------------------------------------------------------------
-- category, color, season, tags, ai_description already exist and are reused
-- directly by the AI analysis flow (never renamed, never redefined).

alter table public.clothing_items
  add column if not exists occasion text,
  add column if not exists style text,
  add column if not exists material text[],
  add column if not exists ai_analyzed boolean not null default false,
  add column if not exists ai_analyzed_at timestamptz,
  add column if not exists ai_confidence_score numeric,
  add column if not exists ai_analysis_raw jsonb;

comment on column public.clothing_items.occasion is 'AI- or user-assigned occasion tag (see constants/garmentTaxonomy.ts OCCASION_OPTIONS).';
comment on column public.clothing_items.style is 'AI- or user-assigned style tag (see constants/garmentTaxonomy.ts STYLE_OPTIONS).';
comment on column public.clothing_items.material is 'Free-form list of materials detected by AI or entered manually (e.g. {cotton, polyester}).';
comment on column public.clothing_items.ai_analyzed is 'True once this item has gone through the analyze-garment Edge Function at least once.';
comment on column public.clothing_items.ai_analyzed_at is 'Timestamp of the most recent successful AI analysis.';
comment on column public.clothing_items.ai_confidence_score is 'Self-reported confidence (0.0-1.0) from the AI model for its most recent analysis.';
comment on column public.clothing_items.ai_analysis_raw is 'Full raw structured JSON returned by the AI provider, kept for audit/debugging and to allow future re-processing without re-calling the model.';

-- ----------------------------------------------------------------------------
-- 2. AI request/response audit log
-- ----------------------------------------------------------------------------
-- Generalized across ALL future AI phases (garment analysis now; outfit
-- recommendation and stylist chat later), so this table does not need another
-- migration when Phase 2/3 land. Gives cost/latency observability and a
-- foundation for future per-user rate limiting.

create table if not exists public.ai_analysis_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clothing_item_id uuid references public.clothing_items(id) on delete set null,
  feature text not null, -- 'garment_analysis' | 'outfit_recommendation' | 'stylist_chat' (future)
  status text not null,  -- 'success' | 'error'
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  latency_ms integer,
  created_at timestamptz not null default now()
);

comment on table public.ai_analysis_logs is 'Audit log for every AI feature call (analysis, and future recommendation/chat phases). Not surfaced in the UI in Phase 1 — used for debugging, cost tracking, and future rate limiting.';

create index if not exists ai_analysis_logs_user_id_idx on public.ai_analysis_logs(user_id);
create index if not exists ai_analysis_logs_clothing_item_id_idx on public.ai_analysis_logs(clothing_item_id);
create index if not exists ai_analysis_logs_feature_created_at_idx on public.ai_analysis_logs(feature, created_at desc);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
-- Mirrors the same ownership model already used by clothing_items: a user can
-- only see/insert their own AI logs. Only the Edge Function (via the
-- service_role key, which bypasses RLS) writes rows in practice, but RLS is
-- still enabled so a compromised anon/user JWT can never read another user's
-- AI request history.

alter table public.ai_analysis_logs enable row level security;

create policy "Users can view their own AI analysis logs"
  on public.ai_analysis_logs
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own AI analysis logs"
  on public.ai_analysis_logs
  for insert
  with check (auth.uid() = user_id);

-- No update/delete policies: logs are append-only from the client's perspective.
