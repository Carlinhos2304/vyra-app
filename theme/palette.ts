/**
 * Vyra — Primitive color palette.
 *
 * Raw values only. No semantic meaning lives here — that mapping happens in
 * `theme.ts`. Nothing outside `theme/` should import this file directly;
 * always consume colors through `useTheme().theme.colors`.
 *
 * These values are the exact hex colors already used throughout the app
 * (editorial onyx ink, bone canvas, stone text/borders). Dark mode is the
 * same visual language inverted, not a new palette.
 */

export const palette = {
  light: {
    ink: '#1C1917',       // brand ink — primary text, icons, buttons
    stone700: '#44403C',
    stone500: '#78716C',  // secondary text / muted icons
    stone400: '#A8A29E',  // tertiary text / disabled / placeholders
    stone200: '#E7E5E4',  // borders / dividers
    stone100: '#F5F5F4',  // secondary/inset surfaces (search bars, chip tracks)
    canvas: '#FAFAF9',    // screen background
    surface: '#FFFFFF',   // cards, modals, raised surfaces
    danger: '#EF4444',
    success: '#16A34A',
  },
  dark: {
    ink: '#F4F4F4',       // inverted brand ink — light on dark
    stone700: '#D6D3D1',
    stone500: '#B8B8B8',
    stone400: '#7A7A7A',
    stone200: '#2E2E2E',
    stone100: '#242424',
    canvas: '#121212',
    surface: '#1B1B1B',
    danger: '#F87171',
    success: '#4ADE80',
  },
} as const;

export type PaletteMode = keyof typeof palette;
