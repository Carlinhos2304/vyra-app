import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAlert } from '../../lib/ui/appAlert';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import { useNotifications } from '../../hooks/useNotifications';
import { STYLE_OPTIONS } from '../../constants/garmentTaxonomy';

// React Native Reanimated 3
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

// STYLE_OPTIONS now comes from constants/garmentTaxonomy.ts (single source of
// truth shared with garment-level style tagging, including AI analysis).
const COLOR_OPTIONS = [
  { name: 'Monochrome', hex: '#1C1917' },
  { name: 'Warm Stone', hex: '#E7E5E4' },
  { name: 'Sage Green', hex: '#87986A' },
  { name: 'Navy Ocean', hex: '#1E3A8A' },
  { name: 'Crimson', hex: '#991B1B' },
  { name: 'Camel Tan', hex: '#C2410C' }
];
const CLIMATE_OPTIONS = ['Mostly Hot', 'Mixed', 'Mostly Cold'];

// Luxury calibration spring physics
const PREMIUM_SPRING = {
  damping: 18,
  stiffness: 100,
  mass: 0.8,
};

const CHIP_SPRING = {
  damping: 15,
  stiffness: 120,
};

// ==========================================
// Sub-Components to handle hooks safely
// ==========================================

interface StyleChipProps {
  styleName: string;
  isActive: boolean;
  onPress: () => void;
}

function StyleChip({ styleName, isActive, onPress }: StyleChipProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.97, CHIP_SPRING))}
        onPressOut={() => (scale.value = withSpring(1, CHIP_SPRING))}
        onPress={onPress}
        style={[
          styles.chipSelectionItem,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          isActive && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
        ]}
      >
        <Text style={[styles.chipText, { color: theme.colors.textPrimary }, isActive && { color: theme.colors.accentForeground }]}>{styleName}</Text>
      </Pressable>
    </Animated.View>
  );
}

interface ColorCircleProps {
  colorName: string;
  hex?: string;
  isSelected: boolean;
  onPress: () => void;
}

function ColorCircle({ colorName, hex, isSelected, onPress }: ColorCircleProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.95, CHIP_SPRING))}
        onPressOut={() => (scale.value = withSpring(1, CHIP_SPRING))}
        onPress={onPress}
        accessibilityLabel={colorName}
        accessibilityState={{ selected: isSelected }}
        style={[
          styles.colorCircleOuterBorder,
          isSelected && { borderColor: theme.colors.accent }
        ]}
      >
        {/* Swatch fill is a literal selectable color, not app chrome — stays fixed across themes */}
        <View
          style={[
            styles.colorCircleInnerFill,
            hex ? { backgroundColor: hex } : undefined
          ]}
        />
      </Pressable>
    </Animated.View>
  );
}

interface ClimateChipProps {
  climateName: string;
  isActive: boolean;
  onPress: () => void;
}

function ClimateChip({ climateName, isActive, onPress }: ClimateChipProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.97, CHIP_SPRING))}
        onPressOut={() => (scale.value = withSpring(1, CHIP_SPRING))}
        onPress={onPress}
        style={[
          styles.chipSelectionItem,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          isActive && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
        ]}
      >
        <Text style={[styles.chipText, { color: theme.colors.textPrimary }, isActive && { color: theme.colors.accentForeground }]}>{climateName}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ==========================================
// Main Personalization Screen
// ==========================================

export default function PersonalizationScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { syncNotifications } = useNotifications();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedClimate, setSelectedClimate] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- Animation Shared Values ---
  const headingOpacity = useSharedValue(0);
  const headingTranslateY = useSharedValue(20);

  const styleSecOpacity = useSharedValue(0);
  const styleSecTranslateY = useSharedValue(20);

  const colorSecOpacity = useSharedValue(0);
  const colorSecTranslateY = useSharedValue(20);

  const climateSecOpacity = useSharedValue(0);
  const climateSecTranslateY = useSharedValue(20);

  const notifySecOpacity = useSharedValue(0);
  const notifySecTranslateY = useSharedValue(20);

  const footerOpacity = useSharedValue(0);
  const footerTranslateY = useSharedValue(30);
  const buttonPressScale = useSharedValue(1);

  // Staggered Entrance on Mount
  useEffect(() => {
    headingOpacity.value = withTiming(1, { duration: 600 });
    headingTranslateY.value = withSpring(0, PREMIUM_SPRING);

    styleSecOpacity.value = withDelay(150, withTiming(1, { duration: 600 }));
    styleSecTranslateY.value = withDelay(150, withSpring(0, PREMIUM_SPRING));

    colorSecOpacity.value = withDelay(250, withTiming(1, { duration: 600 }));
    colorSecTranslateY.value = withDelay(250, withSpring(0, PREMIUM_SPRING));

    climateSecOpacity.value = withDelay(350, withTiming(1, { duration: 600 }));
    climateSecTranslateY.value = withDelay(350, withSpring(0, PREMIUM_SPRING));

    notifySecOpacity.value = withDelay(450, withTiming(1, { duration: 600 }));
    notifySecTranslateY.value = withDelay(450, withSpring(0, PREMIUM_SPRING));

    footerOpacity.value = withDelay(550, withTiming(1, { duration: 600 }));
    footerTranslateY.value = withDelay(550, withSpring(0, PREMIUM_SPRING));
  }, []);

  // --- Animated Styles ---
  const animatedHeadingStyle = useAnimatedStyle(() => ({
    opacity: headingOpacity.value,
    transform: [{ translateY: headingTranslateY.value }],
  }));

  const animatedStyleSecStyle = useAnimatedStyle(() => ({
    opacity: styleSecOpacity.value,
    transform: [{ translateY: styleSecTranslateY.value }],
  }));

  const animatedColorSecStyle = useAnimatedStyle(() => ({
    opacity: colorSecOpacity.value,
    transform: [{ translateY: colorSecTranslateY.value }],
  }));

  const animatedClimateSecStyle = useAnimatedStyle(() => ({
    opacity: climateSecOpacity.value,
    transform: [{ translateY: climateSecTranslateY.value }],
  }));

  const animatedNotifySecStyle = useAnimatedStyle(() => ({
    opacity: notifySecOpacity.value,
    transform: [{ translateY: notifySecTranslateY.value }],
  }));

  const animatedFooterStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [
      { translateY: footerTranslateY.value },
      { scale: buttonPressScale.value },
    ],
  }));

  const toggleColorSelection = (colorName: string) => {
    setSelectedColors(prev =>
      prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]
    );
  };

  const handleSavePreferences = async () => {
    if (!selectedStyle || selectedColors.length === 0 || !selectedClimate) {
      AppAlert.alert(t('onboarding.personalization.incompleteAlertTitle'), t('onboarding.personalization.incompleteAlertMessage'));
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('onboarding.personalization.noUserError'));

      const { error } = await supabase
        .from('profiles')
        .update({
          favorite_style: selectedStyle,
          favorite_colors: selectedColors,
          climate: selectedClimate,
          notifications_enabled: notificationsEnabled
        })
        .eq('id', user.id);

      if (error) throw error;

      // Fires the actual OS permission prompt right after the user opted in
      // here, instead of leaving the switch above as a DB-only flag that
      // silently did nothing until the user later found the toggle in
      // Profile settings. Isolated from the save above on purpose — a
      // denied/failed permission prompt must never block onboarding from
      // continuing (same isolation create-event.tsx already uses around
      // reminder scheduling).
      if (notificationsEnabled) {
        try {
          await syncNotifications(true);
        } catch (notifyErr) {
          console.warn('[onboarding/personalization] Failed to enable notifications (non-fatal):', notifyErr);
        }
      }

      router.push('/onboarding/first-garment');
    } catch (err: any) {
      AppAlert.alert(t('onboarding.personalization.syncFaultAlertTitle'), err.message || t('onboarding.personalization.syncFaultAlertFallback'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ SAFE CONDITIONAL RETURN
  // Placed down here so React executes all above top-level hooks without skipping.
  if (isSubmitting) {
    return (
      <PremiumScreen style={[styles.centerBox, { backgroundColor: theme.colors.background }]}>
        <PremiumLoader label={t('onboarding.personalization.loadingLabel')} />
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      <SafeAreaView style={[styles.rootContainer, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>

          {/* MAIN HEADING */}
          <Animated.View style={animatedHeadingStyle}>
            <Text style={[styles.formMainHeading, { color: theme.colors.textPrimary }]}>{t('onboarding.personalization.heading')}</Text>
          </Animated.View>

          {/* SECTION 1: STYLE CONFIGURATION MATRIX */}
          <Animated.View style={[styles.formSection, animatedStyleSecStyle]}>
            <SectionTitle withBottomMargin>{t('onboarding.personalization.styleSectionTitle')}</SectionTitle>
            <View style={styles.gridContainerRow}>
              {STYLE_OPTIONS.map(style => (
                <StyleChip
                  key={style}
                  styleName={style}
                  isActive={selectedStyle === style}
                  onPress={() => setSelectedStyle(style)}
                />
              ))}
            </View>
          </Animated.View>

          {/* SECTION 2: COLOR CONFIGURATION CIRCLES */}
          <Animated.View style={[styles.formSection, animatedColorSecStyle]}>
            <SectionTitle withBottomMargin>{t('onboarding.personalization.colorsSectionTitle')}</SectionTitle>
            <View style={styles.colorsSelectionRow}>
              {COLOR_OPTIONS.map(color => (
                <ColorCircle
                  key={color.name}
                  colorName={t(`onboarding.personalization.colorOptions.${color.name}`)}
                  hex={color.hex}
                  isSelected={selectedColors.includes(color.name)}
                  onPress={() => toggleColorSelection(color.name)}
                />
              ))}
            </View>
          </Animated.View>

          {/* SECTION 3: CLIMATE */}
          <Animated.View style={[styles.formSection, animatedClimateSecStyle]}>
            <SectionTitle withBottomMargin>{t('onboarding.personalization.climateSectionTitle')}</SectionTitle>
            <View style={styles.gridContainerRow}>
              {CLIMATE_OPTIONS.map(climate => (
                <ClimateChip
                  key={climate}
                  climateName={t(`onboarding.personalization.climateOptions.${climate}`)}
                  isActive={selectedClimate === climate}
                  onPress={() => setSelectedClimate(climate)}
                />
              ))}
            </View>
          </Animated.View>

          {/* SECTION 4: NOTIFICATIONS */}
          <Animated.View style={[styles.formSection, styles.toggleRowSpace, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, animatedNotifySecStyle]}>
            <View style={styles.toggleTextLeftColumn}>
              <Text style={[styles.toggleMainLabelText, { color: theme.colors.textPrimary }]}>{t('onboarding.personalization.notificationsTitle')}</Text>
              <Text style={[styles.toggleSubLabelText, { color: theme.colors.textSecondary }]}>{t('onboarding.personalization.notificationsSubtitle')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              thumbColor={theme.colors.surface}
              ios_backgroundColor={theme.colors.border}
            />
          </Animated.View>

        </ScrollView>

        {/* STICKY FOOTER */}
        <Animated.View style={[styles.stickyFooterActionButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.divider }, animatedFooterStyle]}>
          <Pressable
            onPressIn={() => (buttonPressScale.value = withSpring(0.96, { damping: 12, stiffness: 150 }))}
            onPressOut={() => (buttonPressScale.value = withSpring(1, PREMIUM_SPRING))}
            onPress={handleSavePreferences}
            style={[styles.primaryPremiumButton, { backgroundColor: theme.colors.accent }]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>{t('onboarding.personalization.saveButton')}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollPadding: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },
  formMainHeading: {
    fontSize: 26,
    fontWeight: '300',
    letterSpacing: -0.5,
    marginBottom: 32,
  },
  formSection: {
    marginBottom: 32,
  },
  gridContainerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipSelectionItem: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  colorsSelectionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  colorCircleOuterBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleInnerFill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  toggleRowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  toggleTextLeftColumn: {
    flex: 1,
    paddingRight: 16,
  },
  toggleMainLabelText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleSubLabelText: {
    fontSize: 12,
  },
  stickyFooterActionButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  primaryPremiumButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
