import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { MOTION } from '../../constants/motion';

// Reanimated's withTiming() runs on the UI thread and requires its easing
// function to be a "worklet" — MOTION.curves.* is built with react-native's
// own Easing (for the classic Animated API, e.g. PremiumModal.tsx) and isn't
// worklet-compatible. Same bezier coefficients as MOTION.curves.premiumEaseOut,
// just constructed via reanimated's own Easing so it works here. Durations
// (plain numbers) from MOTION.timings are still reused as-is below.
const PREMIUM_EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);

interface PremiumScoreBarProps {
  /** Short label, e.g. "Style Match". */
  label: string;
  /** 0-100. Values outside this range are clamped. */
  value: number;
  /** Optional stagger delay (ms) so a stack of bars fills in sequence
   * instead of all at once — kept subtle, matching MOTION.timings.stagger. */
  delay?: number;
  style?: ViewStyle;
}

/**
 * PremiumScoreBar — a thin, minimalist score indicator: label, numeric
 * value, and a slim fill track. No gauges, no charts, per the AI Outfit
 * Generation spec. The fill animates in with MOTION's premium ease-out
 * curve only — no spring, no bounce.
 *
 * There was no existing progress/score-indicator component in the codebase
 * (PremiumLoader is a loading treatment, not a value indicator), so this is
 * a new, reusable primitive rather than a one-off inline bar.
 */
export const PremiumScoreBar: React.FC<PremiumScoreBarProps> = ({ label, value, delay = 0, style }) => {
  const { theme } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(clamped, {
        duration: MOTION.timings.panel,
        easing: PREMIUM_EASE_OUT,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, delay]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{Math.round(clamped)}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceSecondary }]}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.colors.accent }, fillStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  value: {
    fontSize: 11,
    fontWeight: '600',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
