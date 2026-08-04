import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

// React Native Reanimated 3
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Luxury-calibrated spring physics
const PREMIUM_SPRING = {
  damping: 18,
  stiffness: 100,
  mass: 0.8,
};

export default function FeaturesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();

  // Animation Shared Values
  const canvasOpacity = useSharedValue(0);
  const canvasScale = useSharedValue(0.85);
  const ornamentOpacity = useSharedValue(0.3);

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);

  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(15);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const buttonPressScale = useSharedValue(1);

  useEffect(() => {
    // 1. Illustration Canvas Entrance
    canvasOpacity.value = withTiming(1, { duration: 600 });
    canvasScale.value = withSpring(1, PREMIUM_SPRING);

    // Subtle Breathing animation for the visual ornament
    ornamentOpacity.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800 }),
          withTiming(0.3, { duration: 1800 })
        ),
        -1, // Loop infinitely
        true
      )
    );

    // 2. Title Slide Up
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(200, withSpring(0, PREMIUM_SPRING));

    // 3. Subtitle Slide Up
    subtitleOpacity.value = withDelay(350, withTiming(1, { duration: 600 }));
    subtitleTranslateY.value = withDelay(350, withSpring(0, PREMIUM_SPRING));

    // 4. Action Button Entrance
    buttonOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    buttonTranslateY.value = withDelay(500, withSpring(0, PREMIUM_SPRING));
  }, []);

  // Animated Styles
  const animatedCanvasStyle = useAnimatedStyle(() => ({
    opacity: canvasOpacity.value,
    transform: [{ scale: canvasScale.value }],
  }));

  const animatedOrnamentStyle = useAnimatedStyle(() => ({
    opacity: ornamentOpacity.value,
  }));

  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const animatedSubtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: buttonTranslateY.value },
      { scale: buttonPressScale.value },
    ],
  }));

  // Press feedback handlers
  const handlePressIn = () => {
    buttonPressScale.value = withSpring(0.96, { damping: 12, stiffness: 150 });
  };

  const handlePressOut = () => {
    buttonPressScale.value = withSpring(1, PREMIUM_SPRING);
  };

  return (
    <PremiumScreen>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        {/* Visual Illustration Section */}
        <View style={styles.illustrationFrame}>
          <Animated.View style={[styles.abstractCanvasGraphic, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }, animatedCanvasStyle]}>
            <MaterialCommunityIcons name="hanger" size={64} color={theme.colors.textPrimary} />
            <Animated.View style={[styles.accentOrnamentDot, { backgroundColor: theme.colors.textTertiary }, animatedOrnamentStyle]} />
          </Animated.View>
        </View>

        {/* Text Container */}
        <View style={styles.textContainer}>
          <Animated.View style={animatedTitleStyle}>
            <Text style={[styles.editorialTitleText, { color: theme.colors.textPrimary }]}>{t('onboarding.features.title')}</Text>
          </Animated.View>

          <Animated.View style={animatedSubtitleStyle}>
            <Text style={[styles.editorialSubtitleText, { color: theme.colors.textSecondary }]}>
              {t('onboarding.features.subtitle')}
            </Text>
          </Animated.View>
        </View>

        {/* Call to Action Container */}
        <Animated.View style={[styles.actionContainer, animatedButtonStyle]}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => router.push('/onboarding/planner')}
            style={[styles.primaryPremiumButton, { backgroundColor: theme.colors.accent }]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>{t('common.continue')}</Text>
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
    position: 'relative',
  },
  accentOrnamentDot: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 8,
    height: 8,
    borderRadius: 4,
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