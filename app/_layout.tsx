import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "../theme";
import { LanguageProvider } from "../i18n";
import { useNotificationSweep } from "../hooks/useNotificationSweep";
import { AppAlertHost } from "../components/ui/AppAlertHost";

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
    // Required by react-native-gesture-handler for its gestures (the Outfit
    // Canvas's drag-to-arrange, see components/outfit/OutfitCanvas.tsx) to
    // work reliably, especially on Android and especially nested inside a
    // ScrollView — must wrap the true root of the app, so it lives outside
    // every other provider here rather than deeper in the tree.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <ThemeProvider>
          <ThemedStatusBar />
          <NotificationBootstrap />
          <Stack screenOptions={{ headerShown: false }} />
          {/* Mounted once here so AppAlert.alert(...) works from any screen
              without that screen needing this in its own tree — see
              lib/ui/appAlert.ts's header comment. */}
          <AppAlertHost />
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
