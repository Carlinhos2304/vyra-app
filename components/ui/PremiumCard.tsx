import React from 'react';
import { Animated, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { usePremiumPress } from '../../hooks/animation/usePremiumPress';
import { useTheme } from '../../theme';

interface PremiumCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  onPress,
  onPressIn,
  onPressOut,
  disabled = false,
  style,
}) => {
  const { theme } = useTheme();
  const { pressProps, animatedStyle } = usePremiumPress();
  const hasAction = typeof onPress === 'function' && !disabled;

  // Compose the shared press-scale feedback with any caller-provided handlers.
  // (Previously these lived on the inner Animated.View, which never receives
  // touch events — the press-scale animation never fired. Moved onto the
  // actual Pressable so both the shared feedback and custom handlers work.)
  const handlePressIn = () => {
    pressProps.onPressIn();
    onPressIn?.();
  };

  const handlePressOut = () => {
    pressProps.onPressOut();
    onPressOut?.();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={hasAction ? handlePressIn : undefined}
      onPressOut={hasAction ? handlePressOut : undefined}
      disabled={!hasAction}
      style={styles.containerReset}
    >
      <Animated.View
        style={[
          styles.cardBase,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          style,
          hasAction && animatedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  containerReset: {
    flex: 1,
  },
  cardBase: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
