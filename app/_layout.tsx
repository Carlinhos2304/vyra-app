import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../theme";
import { LanguageProvider } from "../i18n";

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

export default function Layout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </LanguageProvider>
  );
}
