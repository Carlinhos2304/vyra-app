/**
 * useTabBarClearance — extra bottom space every tab screen's scrollable
 * content needs so its last item never ends up hidden behind the floating
 * tab bar (app/(tabs)/_layout.tsx's PremiumFloatingTabBar).
 *
 * That tab bar is rendered as an absolutely-positioned pill OVER the screen
 * content, not as normal flex-flow chrome that would automatically push
 * content up — so a ScrollView's own default padding has no idea the pill
 * exists. Every tab screen (home, closet, create, calendar, profile) had a
 * small hardcoded paddingBottom (24-64px) that was never enough to clear
 * it: the pill itself is 68px tall, floating `dynamicBottomPadding` above
 * the screen bottom (mirrors _layout.tsx's own math: safe-area inset minus
 * a hair, or a 16px fallback with no inset) — so the last ~90-120px of
 * every tab screen's content was unreachable by scrolling.
 *
 * This hook mirrors _layout.tsx's dynamicBottomPadding calculation exactly
 * (same insets source, same fallback) so the clearance always matches the
 * pill's real on-screen position, on any device/notch configuration, and
 * adds a small visual gap on top so content doesn't stop flush against it.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_PILL_HEIGHT = 68;
const VISUAL_GAP_ABOVE_PILL = 20;

export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  const dynamicBottomPadding = insets.bottom > 0 ? insets.bottom - 4 : 16;
  return dynamicBottomPadding + TAB_BAR_PILL_HEIGHT + VISUAL_GAP_ABOVE_PILL;
}
