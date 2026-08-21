-- Monthly usage cap on AI outfit generation (the generate-outfit Edge
-- Function, called from app/ai/generate-outfit.tsx, app/(tabs)/create.tsx's
-- "Recommend" button, and the Planner's AI event-outfit assignment).
-- Vyra doesn't have a paid plan yet — this is a quiet cost guardrail while
-- the app is free for everyone, not a paywall. It intentionally does NOT
-- cover analyze-garment or remove-background (those run when adding a
-- garment, a core onboarding action that shouldn't have friction yet).
--
-- The counter is enforced entirely server-side, inside the Edge Function,
-- using the service role key — never from the React Native client — so it
-- can't be bypassed by calling the Edge Function directly with a user's own
-- session token.

create table if not exists public.ai_generation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null, -- 'YYYY-MM', UTC calendar month
  generation_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key)
);

alter table public.ai_generation_usage enable row level security;

-- Users may read their own usage (e.g. a future "7 of 10 used this month"
-- UI) but can never write directly — only increment_ai_generation_usage()
-- below (SECURITY DEFINER, granted to service_role only) ever changes counts.
create policy "Users can view their own AI generation usage"
  on public.ai_generation_usage
  for select
  using (auth.uid() = user_id);

-- Atomically checks the caller's count for the current UTC month against
-- p_monthly_limit and, if under it, increments and returns allowed = true.
-- The `for update` row lock (inside this single function call's implicit
-- transaction) makes this safe under concurrent calls for the same user —
-- e.g. a rapid double-tap on "Generate" can't both read the same
-- under-the-limit count and both proceed.
create or replace function public.increment_ai_generation_usage(
  p_user_id uuid,
  p_monthly_limit integer
)
returns table (allowed boolean, current_count integer, monthly_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_key text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_count integer;
begin
  insert into public.ai_generation_usage (user_id, month_key, generation_count)
  values (p_user_id, v_month_key, 0)
  on conflict (user_id, month_key) do nothing;

  select generation_count into v_count
  from public.ai_generation_usage
  where user_id = p_user_id and month_key = v_month_key
  for update;

  if v_count >= p_monthly_limit then
    return query select false, v_count, p_monthly_limit;
    return;
  end if;

  update public.ai_generation_usage
  set generation_count = generation_count + 1, updated_at = now()
  where user_id = p_user_id and month_key = v_month_key
  returning generation_count into v_count;

  return query select true, v_count, p_monthly_limit;
end;
$$;

-- Only the Edge Function (via the service role key) may call this — never
-- exposed to authenticated clients, so a user can't call it directly to
-- inflate/reset their own count or read another user's.
revoke all on function public.increment_ai_generation_usage(uuid, integer) from public;
grant execute on function public.increment_ai_generation_usage(uuid, integer) to service_role;
