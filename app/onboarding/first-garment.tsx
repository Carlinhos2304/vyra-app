import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

// React Native Reanimated 3
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Luxury spring physics configuration
const PREMIUM_SPRING = {
  damping: 18,
  stiffness: 100,
  mass: 0.8,
};

const BUTTON_SPRING = {
  damping: 12,
  stiffness: 150,
};

export default function FirstGarmentScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  // --- Animation Shared Values ---
  const illustrationScale = useSharedValue(0.85);
  const illustrationOpacity = useSharedValue(0);

  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  const actionOpacity = useSharedValue(0);
  const actionTranslateY = useSharedValue(30);
  const buttonPressScale = useSharedValue(1);

  // Staggered Entrance on Mount
  useEffect(() => {
    // Illustration Graphic Card
    illustrationOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    illustrationScale.value = withDelay(100, withSpring(1, PREMIUM_SPRING));

    // Editorial Text block
    textOpacity.value = withDelay(250, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(250, withSpring(0, PREMIUM_SPRING));

    // Bottom Action Button
    actionOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    actionTranslateY.value = withDelay(400, withSpring(0, PREMIUM_SPRING));
  }, []);

  // --- Animated Styles ---
  const animatedIllustrationStyle = useAnimatedStyle(() => ({
    opacity: illustrationOpacity.value,
    transform: [{ scale: illustrationScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const animatedActionStyle = useAnimatedStyle(() => ({
    opacity: actionOpacity.value,
    transform: [
      { translateY: actionTranslateY.value },
      { scale: buttonPressScale.value }
    ],
  }));

  const completeOnboardingAndNavigateToCreation = async () => {
    try {
      setIsFinalizing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('onboarding.firstGarment.noSessionError'));

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) throw error;

      router.replace('/clothing/add-garment');
    } catch (err: any) {
      Alert.alert(t('onboarding.firstGarment.blockedAlertTitle'), err.message || t('onboarding.firstGarment.blockedAlertFallback'));
      setIsFinalizing(false);
    }
  };

  // ✅ FIXED: Conditional return moved safely below all hooks
  if (isFinalizing) {
    return (
      <PremiumScreen style={[styles.centerBox, { backgroundColor: theme.colors.background }]}>
        <PremiumLoader label={t('onboarding.firstGarment.loadingLabel')} />
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>

        {/* GRAPHIC FRAME */}
        <View style={styles.illustrationFrame}>
          <Animated.View style={[styles.abstractCanvasGraphic, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }, animatedIllustrationStyle]}>
            <MaterialCommunityIcons name="plus-box-outline" size={64} color={theme.colors.textPrimary} />
          </Animated.View>
        </View>

        {/* COPY */}
        <Animated.View style={[styles.textContainer, animatedTextStyle]}>
          <Text style={[styles.editorialTitleText, { color: theme.colors.textPrimary }]}>{t('onboarding.firstGarment.title')}</Text>
          <Text style={[styles.editorialSubtitleText, { color: theme.colors.textSecondary }]}>
            {t('onboarding.firstGarment.subtitle')}
          </Text>
          <Text style={[styles.aiNoteCaptionText, { color: theme.colors.textTertiary }]}>
            {t('onboarding.firstGarment.aiNote')}
          </Text>
        </Animated.View>

        {/* BOTTOM ACTION */}
        <Animated.View style={[styles.actionContainer, animatedActionStyle]}>
          <Pressable
            onPressIn={() => (buttonPressScale.value = withSpring(0.96, BUTTON_SPRING))}
            onPressOut={() => (buttonPressScale.value = withSpring(1, PREMIUM_SPRING))}
            onPress={completeOnboardingAndNavigateToCreation}
            style={[styles.primaryPremiumButton, { backgroundColor: theme.colors.accent }]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>{t('onboarding.firstGarment.addButton')}</Text>
          </Pressable>
        </Animated.View>

      </SafeAreaView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationFrame: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  abstractCanvasGraphic: {
    width: width * 0.5,
    aspectRatio: 1,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  textContainer: {
    paddingHorizontal: 12,
    marginBottom: 40,
  },
  editorialTitleText: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  editorialSubtitleText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  aiNoteCaptionText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  actionContainer: {
    paddingBottom: 24,
    width: '100%',
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