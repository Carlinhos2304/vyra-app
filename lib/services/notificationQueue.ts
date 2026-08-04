/**
 * notificationQueue.ts
 *
 * The outbox. Every category service (notificationPlanner,
 * weatherNotifications, wardrobeNotifications, the AI/weekly-summary paths
 * in notificationService.ts) funnels its content through
 * `enqueueAndSchedule()` instead of calling notificationScheduler or
 * Supabase directly — this is the one place that:
 *   1. Dedupes against notification_log (`unique(user_id, dedupe_key)`) so
 *      re-running a sweep (app foreground, several times a day) can't
 *      double-schedule the same notification.
 *   2. Applies quiet-hours/weekend shaping via
 *      notificationScheduler.resolveDeliveryTime() exactly once, centrally.
 *   3. Writes the outbox row BEFORE the local schedule call — see
 *      `enqueueAndSchedule`'s comment for why that ordering matters for the
 *      future push migration.
 */

import { supabase } from '../supabase';
import * as Scheduler from './notificationScheduler';
import type { NotificationCategory, NotificationPreferences, NotificationRequest } from './notificationTypes';

export type EnqueueOutcome =
  | { status: 'scheduled'; logId: string; identifier: string; scheduledFor: Date }
  | { status: 'skipped-duplicate' }
  | { status: 'skipped-suppressed' } // quiet hours / weekend rules dropped it entirely
  | { status: 'skipped-no-permission' }
  | { status: 'skipped-past' }
  | { status: 'error'; message: string };

async function alreadyLogged(userId: string, dedupeKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();

  if (error) {
    // Fail open toward "assume not logged" would risk duplicate spam; fail
    // closed toward "assume logged" is the safer default for a dedupe check.
    console.error('[notificationQueue] dedupe check failed, treating as already logged:', error.message);
    return true;
  }

  return !!data;
}

/**
 * Resolves delivery time, dedupes, schedules the local notification, and
 * records it in notification_log — in that order except that the log row is
 * written with status 'scheduled' right after a successful
 * scheduleLocal() call, using the identifier scheduleLocal returned. If
 * writing the log row fails after a successful local schedule, the
 * notification still fires (local scheduling already happened) but a future
 * sweep could re-attempt it since the dedupe row is missing — an accepted
 * trade-off (a rare duplicate is far better than a silently dropped
 * reminder), logged loudly so it's visible in dev tools.
 *
 * `alwaysAllowWeekend` is forwarded to resolveDeliveryTime as-is — see that
 * function's doc for why Planner reminders pass `true` while every
 * discretionary category (weather, AI, wardrobe, weekly summary) leaves it
 * `false`.
 */
export async function enqueueAndSchedule(
  request: NotificationRequest,
  prefs: NotificationPreferences,
  options?: { alwaysAllowWeekend?: boolean }
): Promise<EnqueueOutcome> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'No authenticated user.' };

  if (await alreadyLogged(user.id, request.dedupeKey)) {
    return { status: 'skipped-duplicate' };
  }

  const resolvedTime = Scheduler.resolveDeliveryTime(request.triggerDate, prefs, {
    alwaysAllowWeekend: options?.alwaysAllowWeekend,
  });
  if (!resolvedTime) return { status: 'skipped-suppressed' };

  if (resolvedTime.getTime() <= Date.now()) return { status: 'skipped-past' };

  const permitted = await Scheduler.hasPermission();
  if (!permitted) return { status: 'skipped-no-permission' };

  const identifier = request.identifier ?? request.dedupeKey;
  const localIdentifier = await Scheduler.scheduleLocal({
    identifier,
    title: request.title,
    body: request.body,
    data: {
      category: request.category,
      actionRoute: request.actionRoute ?? null,
      actionParams: request.actionParams ?? null,
    },
    triggerDate: resolvedTime,
    channelId: request.category,
  });

  if (!localIdentifier) return { status: 'skipped-no-permission' };

  const { data: logRow, error: logError } = await supabase
    .from('notification_log')
    .insert({
      user_id: user.id,
      category: request.category,
      dedupe_key: request.dedupeKey,
      title: request.title,
      body: request.body,
      action_route: request.actionRoute ?? null,
      local_identifier: localIdentifier,
      status: 'scheduled',
      scheduled_for: resolvedTime.toISOString(),
    })
    .select('id')
    .single();

  if (logError || !logRow) {
    console.error('[notificationQueue] Failed to log scheduled notification (it still fired):', logError?.message);
    return { status: 'error', message: logError?.message || 'Could not record notification in the outbox.' };
  }

  return { status: 'scheduled', logId: logRow.id, identifier: localIdentifier, scheduledFor: resolvedTime };
}

/** Cancels a previously-scheduled notification by its dedupe key — used by
 * notificationPlanner when an event is deleted/edited. Cancels both the OS
 * timer and marks the outbox row 'cancelled' so it doesn't count as "already
 * generated" for a future re-schedule under the same dedupe key. */
export async function cancelByDedupeKey(dedupeKey: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('notification_log')
    .select('id, local_identifier')
    .eq('user_id', user.id)
    .eq('dedupe_key', dedupeKey)
    .eq('status', 'scheduled')
    .maybeSingle();

  if (!data) return;

  if (data.local_identifier) {
    await Scheduler.cancelLocal(data.local_identifier);
  }

  await supabase.from('notification_log').update({ status: 'cancelled' }).eq('id', data.id);
}

/** Cancels every scheduled notification whose dedupe key starts with
 * `prefix` — e.g. `planner-${eventId}-` to clear every reminder for one
 * event regardless of how many offsets were scheduled for it. */
export async function cancelByDedupeKeyPrefix(prefix: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('notification_log')
    .select('id, local_identifier, dedupe_key')
    .eq('user_id', user.id)
    .eq('status', 'scheduled')
    .like('dedupe_key', `${prefix}%`);

  if (!data || data.length === 0) return;

  await Promise.all(data.map((row) => (row.local_identifier ? Scheduler.cancelLocal(row.local_identifier) : Promise.resolve())));
  await supabase
    .from('notification_log')
    .update({ status: 'cancelled' })
    .in(
      'id',
      data.map((row) => row.id)
    );
}

/** Recent history for a category — foundation for a future in-app
 * notification center. Not wired into any screen yet; exposed here so it
 * exists the moment it's needed instead of requiring another queue-layer
 * change. */
export async function getRecentNotifications(category?: NotificationCategory, limit = 20) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('notification_log')
    .select('id, category, dedupe_key, title, body, action_route, status, scheduled_for, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) {
    console.error('[notificationQueue] getRecentNotifications failed:', error.message);
    return [];
  }
  return data || [];
}
