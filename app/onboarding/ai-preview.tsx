import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';

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
  const router = useRouter();

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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Visual Canvas and Badge Section */}
        <View style={styles.illustrationFrame}>
          <Animated.View style={[styles.abstractCanvasGraphic, animatedCanvasStyle]}>
            <MaterialCommunityIcons name={"sparkles" as any} size={54} color="#1C1917" />
            
            <Animated.View style={[styles.comingSoonBadgeContainer, animatedBadgeStyle]}>
              <Text style={styles.comingSoonBadge}>COMING SOON</Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Messaging Text block */}
        <View style={styles.textContainer}>
          <Animated.View style={animatedTitleStyle}>
            <Text style={styles.editorialTitleText}>AI Stylist</Text>
          </Animated.View>
          
          <Animated.View style={animatedSubtitleStyle}>
            <Text style={styles.editorialSubtitleText}>
              Future personalized recommendations will analyze your wardrobe, weather conditions, style aesthetics, favorite colors, and calendar schedules to curate optimal styles.
            </Text>
          </Animated.View>
        </View>

        {/* Action Button Segment */}
        <Animated.View style={[styles.actionContainer, animatedButtonStyle]}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => router.push('/onboarding/personalization')}
            style={styles.primaryPremiumButton}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
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
  illustrationFrame: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  abstractCanvasGraphic: {
    width: width * 0.5,
    aspectRatio: 1,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
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
    backgroundColor: '#1C1917',
    color: '#FAFAF9',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 1,
    textAlign: 'center',
  },
  textContainer: {
    paddingHorizontal: 12,
    marginBottom: 40,
  },
  editorialTitleText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1C1917',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  editorialSubtitleText: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
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