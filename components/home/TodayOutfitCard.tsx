import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PremiumCard } from '../ui/PremiumCard';
import { PremiumTouchable } from '../ui/PremiumTouchable';
import { SectionHeader } from '../ui/SectionHeader';
import { useTheme } from '../../theme';
import { TodayOutfitPlan } from '../../hooks/useTodayOutfit';
import { useLanguage } from '../../i18n';

const { width } = Dimensions.get('window');
const PREMIUM_EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);

interface TodayOutfitCardProps {
  todayPlan: TodayOutfitPlan | null;
  isLoading: boolean;
  onViewOutfit: () => void;
  onRegenerate: () => void;
  onCurateLook: () => void;
  delay?: number;
}

/**
 * TodayOutfitCard — the same magazine-style hero the old Home used for
 * "Today's Ensemble", enriched per the spec: garment count, a real
 * confidence badge when the plan came from the AI generator
 * (outfits.ai_confidence — null for manually-built outfits, in which case
 * the badge is simply omitted rather than showing a fake number), and
 * View Outfit / Regenerate actions.
 */
export const TodayOutfitCard: React.FC<TodayOutfitCardProps> = ({
  todayPlan,
  isLoading,
  onViewOutfit,
  onRegenerate,
  onCurateLook,
  delay = 0,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const scale = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (isLoading) return null;

  const outfit = todayPlan?.outfits;
  const items = outfit?.outfit_items || [];
  const coverUrl = items.length > 0 ? items[0].clothing_items?.image_url : null;
  const garmentCount = items.length;
  const confidencePercent = typeof outfit?.ai_confidence === 'number' ? Math.round(outfit.ai_confidence * 100) : null;

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(delay).easing(Easing.out(Easing.cubic))}
      style={styles.section}
    >
      <SectionHeader title={t('home.todayOutfit.title')} subtitle={t('home.todayOutfit.subtitle')} style={styles.headerSpacing} />

      {outfit ? (
        <Animated.View style={cardAnimatedStyle}>
          <PremiumCard
            style={styles.cardFrame}
            onPress={onViewOutfit}
            onPressIn={() => (scale.value = withTiming(0.98, { duration: 200, easing: PREMIUM_EASE_OUT }))}
            onPressOut={() => (scale.value = withTiming(1, { duration: 200, easing: PREMIUM_EASE_OUT }))}
          >
            <View style={styles.imageWrapper}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={styles.image} />
              ) : (
                <View style={[styles.fallbackContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
                  <Ionicons name="shirt-outline" size={36} color={theme.colors.textTertiary} />
                </View>
              )}

              <View style={styles.scrimOverlay} />

              <View style={styles.floatingTopContent}>
                <Text style={styles.tagText}>{t('home.todayOutfit.todaysLook')}</Text>
                {confidencePercent !== null && (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceBadgeText}>
                      {t('home.todayOutfit.matchPercent', { percent: confidencePercent })}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.floatingBottomContent}>
                <Text style={styles.garmentCountText}>
                  {garmentCount} {garmentCount === 1 ? t('home.todayOutfit.garment') : t('home.todayOutfit.garments')}
                </Text>
                <Text style={styles.titleHeading}>{outfit.name}</Text>
              </View>
            </View>
          </PremiumCard>

          <View style={styles.actionsRow}>
            <PremiumTouchable
              style={[styles.actionButton, styles.actionButtonPrimary, { backgroundColor: theme.colors.accent }]}
              onPress={onViewOutfit}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.accentForeground }]}>{t('home.todayOutfit.viewOutfit')}</Text>
            </PremiumTouchable>
            <PremiumTouchable
              style={[styles.actionButton, styles.actionButtonSecondary, { borderColor: theme.colors.border }]}
              onPress={onRegenerate}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.textPrimary }]}>{t('home.todayOutfit.regenerate')}</Text>
            </PremiumTouchable>
          </View>
        </Animated.View>
      ) : (
        <PremiumCard style={styles.emptyContainer} disabled>
          <View style={[styles.emptyGraphic, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <Ionicons name="shirt-outline" size={32} color={theme.colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>{t('home.todayOutfit.emptyTitle')}</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            {t('home.todayOutfit.emptySubtitle')}
          </Text>
          <PremiumTouchable style={[styles.ctaButton, { backgroundColor: theme.colors.accent }]} onPress={onCurateLook}>
            <Text style={[styles.ctaButtonText, { color: theme.colors.accentForeground }]}>{t('home.todayOutfit.curateLook')}</Text>
          </PremiumTouchable>
        </PremiumCard>
      )}
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
  cardFrame: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: (width - 48) * 1.05,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Photo-context styles — render on top of a garment photo, so these
  // intentionally stay fixed across light/dark, same as the original hero.
  scrimOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
  },
  floatingTopContent: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 9,
    color: '#1C1917',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(28, 25, 23, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  confidenceBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FAFAF9',
    textTransform: 'uppercase',
  },
  floatingBottomContent: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
  },
  garmentCountText: {
    fontSize: 11,
    color: '#E7E5E4',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  titleHeading: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  // --- End photo-context styles ---
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: {},
  actionButtonSecondary: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    width: '100%',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGraphic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  ctaButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaButtonText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
