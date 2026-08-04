import React from 'react';
import { Animated, Pressable, StyleSheet, StyleProp, ViewStyle, Insets } from 'react-native';
import { usePremiumPress } from '../../hooks/animation/usePremiumPress';

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
    <Pressable
      onPress={onPress}
      onPressIn={!disabled ? pressProps.onPressIn : undefined}
      onPressOut={!disabled ? pressProps.onPressOut : undefined}
      disabled={disabled}
      hitSlop={hitSlop}
      style={styles.pressableReset}
    >
      <Animated.View
        style={[
          style,
          !disabled && animatedStyle,
          disabled && styles.disabledOpacity,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
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
