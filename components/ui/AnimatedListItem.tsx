import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

export const AnimatedListItem = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);

  useEffect(() => {
    opacity.value = withDelay(
      index * 35,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      index * 35,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

