import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { colors, spacing } from '../../constants/theme'; // Adjust relative path to your token location

interface PremiumLoaderProps {
  label?: string;
  fullscreen?: boolean;
}

/**
 * PremiumLoader
 * A minimalist, lightweight loading indicator built for high-end editorial interfaces.
 * Uses a precise, low-velocity horizontal track pulse instead of high-motion spinners.
 */
export const PremiumLoader: React.FC<PremiumLoaderProps> = ({
  label,
  fullscreen = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const breathAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Breathing/Pulse Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer Loop
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Subtle breathing for label/y-axis
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      ])
    ).start();
    return () => {
      pulseAnim.stopAnimation();
      shimmerAnim.stopAnimation();
      breathAnim.stopAnimation();
    };
  }, [pulseAnim, shimmerAnim, breathAnim]);

  // Interpolations
  const trackScaleX = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });
  const trackScaleY = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });
  const trackOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });

  const labelTranslateY = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2],
  });

  return (
    <View
      style={[
        styles.container,
        fullscreen && styles.fullscreen,
        fullscreen && { backgroundColor: colors.background },
      ]}
    >
      <View style={styles.trackWrapper}>
        <Animated.View
          style={[
            styles.indicatorTrack,
            {
              backgroundColor: colors.primary,
              opacity: trackOpacity,
              transform: [
                { scaleX: trackScaleX },
                { scaleY: trackScaleY }
              ],
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
              elevation: 4,
            },
          ]}
        >
          {/* Shimmer Highlight */}
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslateX }] }
            ]}
          />
        </Animated.View>
      </View>

      {label && (
        <Animated.Text
          style={[
            styles.editorialLabel,
            {
              color: colors.secondaryText,
              marginTop: spacing.md,
              transform: [{ translateY: labelTranslateY }],
            },
          ]}
        >
          {label}
        </Animated.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  trackWrapper: {
    width: 60,
    height: 2,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorTrack: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
  },
  shimmer: {
    position: 'absolute',
    width: '40%',
    height: '200%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    opacity: 0.5,
  },
  editorialLabel: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});