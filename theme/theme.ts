import { palette } from './palette';

/**
 * Vyra — Semantic theme tokens.
 *
 * This is the single source of truth for color across the app. Screens and
 * components must consume colors exclusively through `useTheme().theme.colors`
 * — never a raw hex value and never `palette` directly.
 *
 * `card`, `primary`, `secondaryText`, `text` and `disabled` are kept as
 * aliases of the newer semantic names below (`surface`, `accent`,
 * `textSecondary`, `textPrimary`, `textTertiary`) so any code still on the
 * previous token names keeps working while the full app migration lands.
 * Once every screen is confirmed on the new names, the aliases can be
 * dropped.
 */
export type Theme = {
  dark: boolean;
  colors: {
    // Surfaces
    background: string;       // screen background
    surface: string;          // default card / raised surface
    surfaceElevated: string;  // modals, bottom sheets, popovers
    surfaceSecondary: string; // inset surfaces — search bars, chip tracks
    // Structure
    border: string;
    divider: string;
    // Text & icons
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;      // text/icons placed on top of `accent`
    // Brand / accent
    accent: string;           // Vyra ink — inverts between light and dark
    accentForeground: string; // content drawn on top of `accent`
    // Status
    danger: string;
    success: string;
    // Overlays & effects
    overlay: string;          // scrims over photos, modal backdrops
    shadow: string;

    // --- Back-compat aliases (see note above) ---
    card: string;
    primary: string;
    secondaryText: string;
    text: string;
    disabled: string;
  };
};

function buildTheme(dark: boolean): Theme {
  const p = dark ? palette.dark : palette.light;

  return {
    dark,
    colors: {
      background: p.canvas,
      surface: p.surface,
      surfaceElevated: p.surface,
      surfaceSecondary: p.stone100,
      border: p.stone200,
      divider: p.stone200,
      textPrimary: p.ink,
      textSecondary: p.stone500,
      textTertiary: p.stone400,
      textInverse: p.canvas,
      accent: p.ink,
      accentForeground: p.canvas,
      danger: p.danger,
      success: p.success,
      overlay: dark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(28, 25, 23, 0.45)',
      shadow: dark ? 'transparent' : p.ink,

      // Aliases
      card: p.surface,
      primary: p.ink,
      secondaryText: p.stone500,
      text: p.ink,
      disabled: p.stone400,
    },
  };
}

export const lightTheme: Theme = buildTheme(false);
export const darkTheme: Theme = buildTheme(true);
