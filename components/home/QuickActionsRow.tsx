import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { PremiumCard } from '../ui/PremiumCard';
import { SectionTitle } from '../ui/SectionTitle';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

interface QuickActionsRowProps {
  onAddGarment: () => void;
  onGenerateOutfit: () => void;
  onCalendar: () => void;
  onCloset: () => void;
  delay?: number;
}

/**
 * QuickActionsRow — the one closing section per the spec: fast entry points
 * to the four things people do most from Home, so they never have to hunt
 * through tabs. Reuses PremiumCard as a pressable tile, same as the rest of
 * the redesigned Home.
 */
export const QuickActionsRow: React.FC<QuickActionsRowProps> = ({
  onAddGarment,
  onGenerateOutfit,
  onCalendar,
  onCloset,
  delay = 0,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const actions = [
    { key: 'add', label: t('home.quickActions.addGarment'), icon: 'add-circle-outline' as const, onPress: onAddGarment },
    { key: 'generate', label: t('home.quickActions.generateOutfit'), icon: 'sparkles-outline' as const, onPress: onGenerateOutfit },
    { key: 'calendar', label: t('home.quickActions.calendar'), icon: 'calendar-outline' as const, onPress: onCalendar },
    { key: 'closet', label: t('home.quickActions.closet'), icon: 'shirt-outline' as const, onPress: onCloset },
  ];

  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(delay).easing(Easing.out(Easing.cubic))}
      style={[styles.section, styles.bottomSpacing]}
    >
      <SectionTitle withBottomMargin style={styles.headerSpacing}>
        {t('home.quickActions.title')}
      </SectionTitle>

      <View style={styles.row}>
        {actions.map((action) => (
          <PremiumCard key={action.key} style={styles.tile} onPress={action.onPress}>
            <Ionicons name={action.icon} size={22} color={theme.colors.accent} />
            <Text style={[styles.tileLabel, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {action.label}
            </Text>
          </PremiumCard>
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
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  tile: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSpacing: {
    paddingBottom: 20,
  },
});
