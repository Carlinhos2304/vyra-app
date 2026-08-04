import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { SectionTitle } from '../ui/SectionTitle';
import { useTheme } from '../../theme';
import { WardrobeInsights } from '../../lib/services/wardrobeInsightsService';
import { useLanguage } from '../../i18n';

interface WardrobeInsightsGridProps {
  insights: WardrobeInsights | null;
  isLoading: boolean;
  delay?: number;
}

interface Tile {
  label: string;
  value: string;
}

function buildTiles(insights: WardrobeInsights, t: (key: string) => string): Tile[] {
  return [
    {
      label: t('home.insights.mostUsedColor'),
      value: insights.mostUsedColor ? insights.mostUsedColor.label : t('home.insights.notEnoughData'),
    },
    {
      label: t('home.insights.favoriteCategory'),
      value: insights.favoriteCategory ? insights.favoriteCategory.label : t('home.insights.notEnoughData'),
    },
    {
      label: t('home.insights.leastUsedGarment'),
      value: insights.leastUsedGarment ? insights.leastUsedGarment.name : '—',
    },
    {
      label: t('home.insights.mostWornShoes'),
      value: insights.mostWornShoes ? insights.mostWornShoes.name : '—',
    },
    {
      label: t('home.insights.unusedItems'),
      value: `${insights.unusedItemsCount}`,
    },
    {
      label: t('home.insights.avgConfidence'),
      value: insights.averageOutfitConfidence !== null ? `${insights.averageOutfitConfidence}%` : '—',
    },
  ];
}

/**
 * WardrobeInsightsGrid — replaces the old Home's hardcoded "Tailoring" /
 * "Monochrome Minimalism" placeholders with real, computed values from
 * wardrobeInsightsService (see that file for exactly how each metric is
 * derived from clothing_items/outfit_items/outfits).
 */
export const WardrobeInsightsGrid: React.FC<WardrobeInsightsGridProps> = ({ insights, isLoading, delay = 0 }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (isLoading || !insights) return null;

  const tiles = buildTiles(insights, t);

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(delay).easing(Easing.out(Easing.cubic))}
      style={styles.section}
    >
      <SectionTitle withBottomMargin style={styles.headerSpacing}>
        {t('home.insights.title')}
      </SectionTitle>

      <View style={styles.grid}>
        {tiles.map((tile) => (
          // Deliberately NOT PremiumCard here: its outer Pressable hardcodes
          // `flex: 1`, which fights this grid's `width: '48%'` two-column
          // wrap (every tile ends up squeezed into one 6-across row instead
          // of wrapping) — same incompatibility already worked around in
          // outfit/[id].tsx's garment carousel and generate-outfit.tsx's
          // result cards. This View replicates PremiumCard's visual (surface
          // background, border, 20px radius) without inheriting that flex.
          <View
            key={tile.label}
            style={[styles.tile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.tileValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {tile.value}
            </Text>
            <Text style={[styles.tileLabel, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {tile.label}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  headerSpacing: {
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  tile: {
    width: '48%',
    padding: 16,
    alignItems: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tileValue: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  tileLabel: {
    fontSize: 11,
    marginTop: 4,
  },
});
