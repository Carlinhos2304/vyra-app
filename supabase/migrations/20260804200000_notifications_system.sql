-- ============================================================================
-- Vyra — Production Notification System
-- ============================================================================
-- Purpose: schema support for a full-featured notification system (Planner
-- reminders, weather/outfit reminders, AI smart notifications, wardrobe
-- reminders, Planner AI outfit nudges, weekly summaries) with per-category
-- user preferences and a delivery-agnostic outbox.
--
-- Rules followed (see CLAUDE.md):
--   - Purely additive. `profiles.notifications_enabled` — the existing master
--     toggle already relied on by onboarding/personalization.tsx,
--     app/(tabs)/profile.tsx, and app/planner/create-event.tsx — is untouched.
--     It remains the top-level on/off switch; everything added here is a
--     finer-grained layer underneath it, never a replacement.
--   - No existing column is renamed, retyped, or dropped.
--   - New columns/tables are nullable or default-populated so every existing
--     row and every existing query keeps working unchanged.
--
-- Design note — why a `notification_log` outbox table exists:
-- Today every notification is scheduled as a purely local expo-notifications
-- call. This table is what lets that stay true today while making a future
-- move to real push delivery a change in *who writes rows here and how they
-- get delivered*, not a schema/architecture rewrite. It also gives:
--   1. Dedupe — `(user_id, dedupe_key)` is unique, so re-opening the app
--      several times in one day can't schedule the same "today's outfit is  
--      ready" or weekly-summary notification twice.
--   2. A natural home for a future server-side cron job to write into
--      (instead of the client generating content on app foreground) without
--      touching the client's read path.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Push-readiness: capture the device's Expo push token when the OS grants
--    notification permission, even though nothing sends push yet. This way
--    turning on push later never requires re-prompting every existing user.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists expo_push_token text;

comment on column public.profiles.expo_push_token is 'Expo push token (ExponentPushToken[...]), captured when OS notification permission is granted. Not consumed by any sender yet — future push delivery reads this column without any client rework.';

-- ----------------------------------------------------------------------------
-- 2. notification_preferences — one row per user. Granular, additive layer
--    UNDER profiles.notifications_enabled (the existing master switch, left
--    untouched). Every column defaults to an "on"/sensible value so existing
--    users get the new categories enabled by default the moment this ships,
--    without needing to visit the new preferences screen first.
-- ----------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  -- Per-category toggles (see notificationTypes.ts NotificationCategory for
  -- the exact set these map to).
  planner_enabled boolean not null default true,
  weather_enabled boolean not null default true,
  outfit_reminders_enabled boolean not null default true,
  ai_suggestions_enabled boolean not null default true,
  wardrobe_enabled boolean not null default true,
  planner_ai_enabled boolean not null default true,
  weekly_summary_enabled boolean not null default true,

  -- Delivery-time shaping, enforced centrally by notificationScheduler.ts —
  -- category services never implement their own quiet-hours/weekend logic.
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '07:00',
  notification_time time not null default '08:00',
  weekend_notifications_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is 'Per-user, per-category notification preferences. Sits underneath profiles.notifications_enabled (the pre-existing master toggle, unchanged) — if that is false, nothing here schedules regardless of these values.';

create index if not exists idx_notification_preferences_user on public.notification_preferences (user_id);

-- updated_at auto-touch, same convention as any other "last modified" column
-- in this schema — keeps notificationPreferences.ts from having to set it manually.
create or replace function public.touch_notification_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_notification_preferences on public.notification_preferences;
create trigger trg_touch_notification_preferences
  before update on public.notification_preferences
  for each row execute function public.touch_notification_preferences_updated_at();

-- ----------------------------------------------------------------------------
-- 3. notification_log — the outbox. Every notification the app decides to
--    show (local today, local-or-push later) gets one row here first.
-- ----------------------------------------------------------------------------
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  category text not null check (category in (
    'planner', 'weather', 'outfit_reminder', 'ai_suggestion',
    'wardrobe', 'planner_ai', 'weekly_summary'
  )),

  -- Stable per-notification dedupe key, e.g. "weekly_summary-2026-W32",
  -- "outfit_reminder-2026-08-04", "planner-<event_id>-30", "ai_suggestion-2026-08-04".
  -- Unique per user so regenerating the same day/period/event is a no-op.
  dedupe_key text not null,

  title text not null,
  body text not null,
  -- Deep link consumed by the tap handler (expo-router path), e.g.
  -- "/planner/event-details?id=..." or "/ai/generate-outfit?...". Null when a
  -- notification has no specific destination beyond opening the app.
  action_route text,

  -- expo-notifications identifier for the locally-scheduled notification, so
  -- notificationScheduler.ts can cancel/reschedule it later by id. Null once
  -- push delivery exists and a given row is server-delivered instead.
  local_identifier text,

  status text not null default 'scheduled' check (status in ('scheduled', 'delivered', 'cancelled', 'failed')),
  scheduled_for timestamptz,

  created_at timestamptz not null default now(),

  unique (user_id, dedupe_key)
);

comment on table public.notification_log is 'Outbox/history for every notification the app has generated, local or (future) push. dedupe_key prevents regenerating the same notification across repeated app opens; also the natural table for a future server-side generator to write into.';

create index if not exists idx_notification_log_user_category on public.notification_log (user_id, category);
create index if not exists idx_notification_log_scheduled_for on public.notification_log (scheduled_for) where status = 'scheduled';

-- ----------------------------------------------------------------------------
-- 4. Row Level Security — same ownership model as every other user-scoped
--    table in this schema (clothing_items, events, ai_analysis_logs, ...).
-- ----------------------------------------------------------------------------
alter table public.notification_preferences enable row level security;

create policy "Users can view their own notification preferences"
  on public.notification_preferences
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notification preferences"
  on public.notification_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notification preferences"
  on public.notification_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.notification_log enable row level security;

create policy "Users can view their own notification log"
  on public.notification_log
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notification log entries"
  on public.notification_log
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notification log entries"
  on public.notification_log
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own notification log entries"
  on public.notification_log
  for delete
  using (auth.uid() = user_id);
