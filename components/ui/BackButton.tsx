import React from 'react';
import { StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface BackButtonProps {
  /** Defaults to router.back() — pass a custom handler only when a screen
   * needs different behavior (e.g. confirming unsaved changes first). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * BackButton — the "go back" affordance already used, hand-copied with
 * drifting icon names and styles, on app/profile/favorites.tsx,
 * app/profile/history.tsx, app/profile/edit-profile.tsx,
 * app/outfit/[id].tsx, app/clothing/[id].tsx, and app/auth/register.tsx.
 * Extracted here (2026-08-04, after a Planner review found create-event.tsx
 * /event-details.tsx/select-outfit.tsx had no way back at all) so every new
 * screen that needs one imports this instead of re-typing a TouchableOpacity
 * + Ionicons pair — matches the exact visual spec of the profile screens'
 * version (22px `arrow-back`, theme.textPrimary) since that's the pattern
 * the user pointed to as the reference.
 *
 * Usage — identical row shape to app/profile/favorites.tsx's header:
 *   <View style={styles.headerRow}>
 *     <BackButton />
 *     <SectionHeader title={...} style={styles.headerFlexOverride} />
 *   </View>
 *   // headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, marginBottom: 16 }
 *   // headerFlexOverride: { flex: 1, paddingVertical: 0, paddingHorizontal: 0 }
 */
export function BackButton({ onPress, style }: BackButtonProps) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      style={[styles.backButton, style]}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginRight: 12,
    padding: 4,
    marginTop: 2,
  },
});
