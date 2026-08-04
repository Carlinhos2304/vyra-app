import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { PremiumCard } from '../ui/PremiumCard';
import { SectionHeader } from '../ui/SectionHeader';
import { useTheme } from '../../theme';
import { DailySuggestionResult } from '../../lib/services/aiService';
import { useLanguage } from '../../i18n';

const PREMIUM_EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);
const BREATHE_EASE = Easing.bezier(0.445, 0.05, 0.55, 0.95);

interface AIDailySuggestionCardProps {
  suggestion: DailySuggestionResult | null;
  isLoading: boolean;
  delay?: number;
}

function SkeletonLine({ widthPercent }: { widthPercent: number }) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 900, easing: BREATHE_EASE }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.skeletonLine,
        { width: `${widthPercent}%`, backgroundColor: theme.colors.surfaceSecondary },
        style,
      ]}
    />
  );
}

/**
 * AIDailySuggestionCard — the most important new card per the spec. Never
 * blocks Home's initial paint: while the AI call is in flight it shows a
 * quiet skeleton, and if the call ultimately fails, it renders nothing at
 * all rather than an error state (a broken/empty AI card would work against
 * the "premium" feel more than simply not showing it).
 */
export const AIDailySuggestionCard: React.FC<AIDailySuggestionCardProps> = ({ suggestion, isLoading, delay = 0 }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!isLoading && !suggestion) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(delay).easing(Easing.out(Easing.cubic))}
      exiting={FadeOut.duration(250)}
      style={styles.section}
    >
      <SectionHeader title={t('home.dailySuggestion.title')} style={styles.headerSpacing} />

      <PremiumCard style={[styles.card, { borderColor: theme.colors.accent }]} disabled>
        <View style={styles.iconRow}>
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.accent }]}>
            <Ionicons name="sparkles" size={14} color={theme.colors.accentForeground} />
          </View>
        </View>

        {suggestion ? (
          <Animated.Text
            entering={FadeIn.duration(500).easing(PREMIUM_EASE_OUT)}
            style={[styles.suggestionText, { color: theme.colors.textPrimary }]}
          >
            {suggestion.suggestion}
          </Animated.Text>
        ) : (
          <View style={styles.skeletonBlock}>
            <SkeletonLine widthPercent={100} />
            <SkeletonLine widthPercent={72} />
          </View>
        )}
      </PremiumCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  headerSpacing: {
    marginBottom: 12,
  },
  card: {
    width: '100%',
    padding: 18,
    borderWidth: 1,
  },
  iconRow: {
    marginBottom: 10,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  skeletonBlock: {
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
  },
});
