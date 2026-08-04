/**
 * useNotificationSweep — mounted once at the app root (see
 * app/_layout.tsx's NotificationBootstrap). Two responsibilities:
 *
 *   1. Fires notificationService.runNotificationSweep() on app foreground —
 *      that function is itself throttled to once/day and every category
 *      write inside it is deduped, so calling this on every foreground
 *      (not just cold start) is what makes reminders stay fresh across a
 *      day without needing a push server yet.
 *   2. Listens for notification taps and deep-links via expo-router, using
 *      the `actionRoute`/`actionParams` every category service already
 *      attaches to its notification's `data` payload (see
 *      notificationQueue.enqueueAndSchedule).
 *
 * Deliberately a hook, not inline JSX in _layout.tsx, so the root layout
 * file stays about layout/providers and this stays a single, testable unit
 * — same separation the rest of the app's hooks/ directory already follows.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { runNotificationSweep } from '../lib/services/notificationService';
import { useLanguage } from '../i18n';

export function useNotificationSweep(): void {
  const router = useRouter();
  const { language } = useLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;

  useEffect(() => {
    runNotificationSweep(languageRef.current).catch((err) => {
      console.error('[useNotificationSweep] initial sweep failed (non-fatal):', err);
    });

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        runNotificationSweep(languageRef.current).catch((err) => {
          console.error('[useNotificationSweep] foreground sweep failed (non-fatal):', err);
        });
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { actionRoute?: string | null; actionParams?: Record<string, string> | null }
        | undefined;
      if (!data?.actionRoute) return;

      try {
        router.push({ pathname: data.actionRoute as any, params: data.actionParams ?? undefined });
      } catch (err) {
        console.error('[useNotificationSweep] failed to navigate from notification tap:', err);
      }
    });

    return () => {
      appStateSubscription.remove();
      responseSubscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
