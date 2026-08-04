-- Smart Planner: additive-only schema support for per-event time-of-day and
-- recurring events. See CLAUDE.md's migration rules — nothing here renames
-- or removes an existing column, and every new column is nullable so every
-- existing row (and every existing query) keeps working unchanged.
--
-- Context: audited on 2026-08-04. `events.event_date` was date-only with no
-- time-of-day column anywhere in the schema (confirmed against every query
-- in app/planner/*.tsx, app/(tabs)/calendar.tsx, hooks/useNextEvent.ts).
-- That made a real "Day Timeline" (08:00 Work -> 13:00 Lunch -> ...) and
-- recurring events impossible to build honestly. This migration adds the
-- minimum columns needed for both, without touching anything that already
-- works.

-- 1. Optional time-of-day. Both nullable — an event with only a date (the
--    only kind that existed before this migration) is still fully valid and
--    renders in the Day Timeline's "no time set" bucket instead of a
--    fabricated slot. end_time is optional even when start_time is set.
alter table public.events
  add column if not exists start_time time null,
  add column if not exists end_time time null;

-- 2. Recurrence. A recurring event is modeled as one "parent" row (the
--    occurrence the user actually created, carrying the recurrence rule)
--    plus zero or more "child" rows — one per additional generated
--    occurrence, each a normal event row with recurrence_parent_id pointing
--    back at the parent. This keeps every existing query that reads
--    `events` (calendar day lookups, upcoming-events lists, useNextEvent,
--    etc.) working with zero changes, since a recurring event's occurrences
--    are just ordinary rows — nothing downstream needs to know how to
--    "expand" a recurrence rule at read time.
--
--    ON DELETE CASCADE on recurrence_parent_id: deleting the parent
--    occurrence removes every generated child occurrence with it, so a
--    recurring series can't be left half-deleted. Deleting a single child
--    occurrence only removes that one row, as expected for "delete just
--    this occurrence."
alter table public.events
  add column if not exists recurrence_type text null,
  add column if not exists recurrence_interval integer null,
  add column if not exists recurrence_end_date date null,
  add column if not exists recurrence_parent_id uuid null references public.events(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_recurrence_type_check'
  ) then
    alter table public.events
      add constraint events_recurrence_type_check
      check (recurrence_type is null or recurrence_type in ('daily', 'weekly', 'monthly', 'custom'));
  end if;
end $$;

-- 3. Indexes to keep the Smart Planner's per-day/per-range queries cheap —
--    the audit flagged calendar.tsx's outfit_plans fetch as unbounded; the
--    rebuilt query is now date-bounded (see hooks/planner/usePlannerCalendarData.ts)
--    and this index is what makes that bound actually fast.
create index if not exists idx_events_user_date on public.events (user_id, event_date);
create index if not exists idx_events_recurrence_parent on public.events (recurrence_parent_id) where recurrence_parent_id is not null;
