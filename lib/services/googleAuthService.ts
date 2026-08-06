/**
 * googleAuthService.ts
 *
 * Native Google Sign-In, wired to Supabase's ID-token exchange
 * (`supabase.auth.signInWithIdToken`) rather than the browser-redirect OAuth
 * flow (`supabase.auth.signInWithOAuth`) that app/auth/login.tsx used to call
 * with no deep-link handler to receive the result. This app already
 * requires a custom development build (see expo-notifications' own Expo Go
 * limitations, and expo-dev-client already being a dependency), so the
 * native SDK is available and gives a one-tap in-app credential picker with
 * no redirect URI, PKCE, or Linking listener to maintain.
 *
 * One value has to be filled in outside this file before this works:
 * app.json's `expo.extra.googleWebClientId` — the WEB client id from Google
 * Cloud Console (not the Android one). Supabase's dashboard (Authentication
 * → Providers → Google) needs that same web client id + its secret pasted
 * in, since that's what it uses to verify the ID token's audience.
 */

import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { supabase } from '../supabase';

const webClientId = (Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined)?.googleWebClientId;

GoogleSignin.configure({
  // Deliberately the WEB client id here, even on Android — see file header.
  webClientId,
});

export class GoogleSignInError extends Error {}

/** Thrown when the user backs out of the native credential picker.
 * Deliberately a distinct class from GoogleSignInError so callers can tell
 * "user changed their mind" apart from "something actually broke" — a
 * cancellation should never surface an error banner. */
export class GoogleSignInCancelledError extends Error {}

export function isGoogleSignInCancelled(err: unknown): boolean {
  return (
    err instanceof GoogleSignInCancelledError ||
    (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED)
  );
}

/**
 * Ensures a `profiles` row exists for a Google-authenticated user. Google
 * sign-in skips app/auth/register.tsx entirely (which is what normally
 * creates this row via `.upsert(...)` right after `supabase.auth.signUp`),
 * and every onboarding screen (personalization.tsx, first-garment.tsx) only
 * `.update()`s this row rather than upserting it — an update against a
 * row that doesn't exist silently affects zero rows, which would leave
 * `onboarding_completed` permanently unset and trap a new Google user in an
 * onboarding loop that never persists. Safe to call on every sign-in
 * (returning users already have a row, so this is a no-op for them).
 */
async function ensureProfileRow(userId: string, displayName: string | null): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  // A read failure here is non-fatal to the sign-in itself — the app's
  // onboarding guard (useOnboardingGuard.ts) already treats a
  // missing/unreadable profile row as "send to onboarding," so at worst this
  // user re-lands on the same flow a brand-new email/password signup goes
  // through.
  if (fetchError || existing) return;

  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    username: displayName,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('[googleAuthService] Failed to create profile row for new Google user (non-fatal):', insertError.message);
  }
}

/**
 * Runs the native Google credential picker, then exchanges the resulting ID
 * token for a Supabase session — no browser hop, no redirect URI. Throws
 * GoogleSignInCancelledError if the user backs out (check with
 * isGoogleSignInCancelled before treating a catch as a real failure), or
 * GoogleSignInError for any other failure, with a message safe to show
 * directly or map through the caller's existing error-mapping function.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!webClientId) {
    throw new GoogleSignInError('Google Sign-In is not configured yet (missing extra.googleWebClientId in app.json).');
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    // Some Play Services versions resolve with a non-success response
    // instead of throwing SIGN_IN_CANCELLED — normalize both paths to the
    // same cancellation type so callers only check one thing.
    throw new GoogleSignInCancelledError();
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new GoogleSignInError('Google did not return an ID token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error || !data.user) {
    throw new GoogleSignInError(error?.message || 'Could not complete Google sign-in.');
  }

  await ensureProfileRow(data.user.id, response.data.user.name ?? response.data.user.email ?? null);
}
