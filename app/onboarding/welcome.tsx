import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import VyraLogo from '../../components/branding/VyraLogo';

// React Native Reanimated 3 Animations
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Luxury-calibrated spring physics
const PREMIUM_SPRING = {
  damping: 18,
  stiffness: 100,
  mass: 0.8,
};

export default function WelcomeScreen() {
  const router = useRouter();

  // Animation Shared Values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);

  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(15);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const buttonPressScale = useSharedValue(1);

  // Trigger sequential animation cascade on mount
  useEffect(() => {
    // 1. Logo Reveal
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSpring(1, PREMIUM_SPRING);

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
  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.brandContainer}>
          {/* Logo container */}
          <Animated.View style={[styles.logoScaleWrapper, animatedLogoStyle]}>
            <VyraLogo />
          </Animated.View>

          {/* Title */}
          <Animated.View style={animatedTitleStyle}>
            <Text style={styles.brandTitleText}>Welcome to Vyra</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View style={animatedSubtitleStyle}>
            <Text style={styles.brandSubtitleText}>
              Organize your wardrobe effortlessly.
            </Text>
          </Animated.View>
        </View>

        {/* Call to Action Container */}
        <Animated.View style={[styles.actionContainer, animatedButtonStyle]}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => router.push('/onboarding/features')}
            style={styles.primaryPremiumButton}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  brandContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoScaleWrapper: {
    transform: [{ scale: 1.6 }],
    marginBottom: 32,
  },
  brandTitleText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#1C1917',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  brandSubtitleText: {
    fontSize: 15,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  actionContainer: {
    paddingBottom: 24,
    width: '100%',
  },
  primaryPremiumButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#1C1917',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FAFAF9',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});