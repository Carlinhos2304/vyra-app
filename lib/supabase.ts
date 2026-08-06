import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = 'https://nscpuxrsdqjclelhhzts.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zY3B1eHJzZHFqY2xlbGhoenRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzc3NzcsImV4cCI6MjA5NTY1Mzc3N30.4R5d6WI717f4Mc6eGdf0DAwPuLztfkv7H9dT_hkr5Q4';

/**
 * Session persistence — added 2026-08-05. Without an explicit `auth` config,
 * supabase-js falls back to an in-memory-only session on React Native (its
 * default storage adapter assumes a browser's `localStorage`, which doesn't
 * exist here), so every full app restart silently logged the user back out
 * even though `@react-native-async-storage/async-storage` was already a
 * dependency and never wired in. `storage: AsyncStorage` is what makes
 * `persistSession` actually survive a cold start.
 *
 * `autoRefreshToken: true` keeps the access token refreshed while the app is
 * open; `detectSessionInUrl: false` is the standard RN setting (there's no
 * browser URL to parse a session out of on native).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * supabase-js's auto-refresh timer keeps running in the background even
 * while the app is backgrounded unless told otherwise, which wastes battery
 * and can fire a refresh right as the app is being killed. This is the
 * official Supabase-recommended pattern for React Native: pause the refresh
 * loop when the app isn't in the foreground, resume it when it is — it does
 * NOT affect whether the session persists (AsyncStorage already handles
 * that above), only when the token-refresh timer is allowed to tick.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});