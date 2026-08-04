import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../theme";
import { LanguageProvider } from "../i18n";
import { useNotificationSweep } from "../hooks/useNotificationSweep";

// Note: this is the real root of the app — Expo Router's entry
// (`expo-router/entry`, see package.json's `main`) renders this layout
// directly. `App.tsx` / `index.ts` are leftover pre-Router boilerplate and
// are not part of the render tree, so theme-dependent setup (like the
// status bar) belongs here, not there.

function ThemedStatusBar() {
  const { theme } = useTheme();
  // Light content (white icons) on our dark theme, dark content on light.
  return <StatusBar style={theme.dark ? 'light' : 'dark'} />;
}

/** Renders nothing — mounts the notification sweep + tap-to-deep-link
 * listener for the lifetime of the app. Needs to live inside
 * LanguageProvider (useNotificationSweep reads the current language) and
 * expo-router's tree (it calls useRouter()), so it can't be a plain
 * top-level effect in this file. */
function NotificationBootstrap() {
  useNotificationSweep();
  return null;
}

export default function Layout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <NotificationBootstrap />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </LanguageProvider>
  );
}
