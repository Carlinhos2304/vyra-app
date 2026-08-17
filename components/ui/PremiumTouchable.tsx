import React from 'react';
import { Animated, Pressable, StyleSheet, StyleProp, ViewStyle, Insets } from 'react-native';
import { usePremiumPress } from '../../hooks/animation/usePremiumPress';

// Animated wrapper around Pressable itself (not a plain View nested inside
// it) — this is what makes `style` land on the actual flex item. Previously
// the incoming `style` was only applied to an inner Animated.View, one level
// below the Pressable that flexbox parents (e.g. a `flexDirection: 'row'`
// button row) actually see as their child. A caller-supplied `flex: 1`
// (or `height`, `alignItems`, etc.) on that inner View had no effect on the
// row's layout, since Yoga only honors flex on direct children of the flex
// container — the Pressable, with no size of its own, collapsed to a sliver.
// Wrapping Pressable itself in Animated.createAnimatedComponent lets the
// full style (layout + visuals) apply directly to the real flex item, and
// the press scale/opacity now animates the whole button instead of just its
// inner content.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PremiumTouchableProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  activeOpacity?: number; // Maintained for API compatibility with legacy touches
  hitSlop?: Insets | number;
}

export const PremiumTouchable: React.FC<PremiumTouchableProps> = ({
  children,
  onPress,
  style,
  disabled = false,
  hitSlop,
}) => {
  const { pressProps, animatedStyle } = usePremiumPress();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={!disabled ? pressProps.onPressIn : undefined}
      onPressOut={!disabled ? pressProps.onPressOut : undefined}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[
        styles.pressableReset,
        style,
        !disabled && animatedStyle,
        disabled && styles.disabledOpacity,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  pressableReset: {
    backgroundColor: 'transparent',
  },
  disabledOpacity: {
    opacity: 0.4,
  },
});
