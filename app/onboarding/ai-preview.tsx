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
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Premium calibration spring physics
const PREMIUM_SPRING = {
  damping: 18,
  stiffness: 100,
  mass: 0.8,
};

export default function AiPreviewScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();

  // Animation Shared Values
  const canvasOpacity = useSharedValue(0);
  const canvasScale = useSharedValue(0.85);

  const badgeOpacity = useSharedValue(0);
  const badgeTranslateY = useSharedValue(15);

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);

  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(15);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const buttonPressScale = useSharedValue(1);

  useEffect(() => {
    // 1. Graphic Canvas Entrance
    canvasOpacity.value = withTiming(1, { duration: 600 });
    canvasScale.value = withSpring(1, PREMIUM_SPRING);

    // Badge reveals slightly after the main canvas settles
    badgeOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    badgeTranslateY.value = withDelay(400, withSpring(0, PREMIUM_SPRING));

    // 2. Title Entrance
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(200, withSpring(0, PREMIUM_SPRING));

    // 3. Subtitle Entrance
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

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ translateY: badgeTranslateY.value }],
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

  // Tactile touch handlers
  const handlePressIn = () => {
    buttonPressScale.value = withSpring(0.96, { damping: 12, stiffness: 150 });
  };

  const handlePressOut = () => {
    buttonPressScale.value = withSpring(1, PREMIUM_SPRING);
  };

  return (
    <PremiumScreen>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        {/* Visual Canvas and Badge Section */}
        <View style={styles.illustrationFrame}>
          <Animated.View style={[styles.abstractCanvasGraphic, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, animatedCanvasStyle]}>
            <MaterialCommunityIcons name={"sparkles" as any} size={54} color={theme.colors.textPrimary} />

            <Animated.View style={[styles.comingSoonBadgeContainer, animatedBadgeStyle]}>
              <Text style={[styles.comingSoonBadge, { backgroundColor: theme.colors.accent, color: theme.colors.accentForeground }]}>{t('onboarding.aiPreview.activeBadge')}</Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Messaging Text block */}
        <View style={styles.textContainer}>
          <Animated.View style={animatedTitleStyle}>
            <Text style={[styles.editorialTitleText, { color: theme.colors.textPrimary }]}>{t('onboarding.aiPreview.title')}</Text>
          </Animated.View>

          <Animated.View style={animatedSubtitleStyle}>
            <Text style={[styles.editorialSubtitleText, { color: theme.colors.textSecondary }]}>
              {t('onboarding.aiPreview.subtitle')}
            </Text>
            <Text style={[styles.exampleCaptionText, { color: theme.colors.textTertiary }]}>
              {t('onboarding.aiPreview.example')}
            </Text>
          </Animated.View>
        </View>

        {/* Action Button Segment */}
        <Animated.View style={[styles.actionContainer, animatedButtonStyle]}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => router.push('/onboarding/personalization')}
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
    position: 'relative',
  },
  comingSoonBadgeContainer: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
  },
  comingSoonBadge: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 1,
    textAlign: 'center',
    overflow: 'hidden',
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
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  exampleCaptionText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
    marginTop: 12,
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