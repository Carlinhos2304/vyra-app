import React from 'react';
import { StyleSheet, Text, Animated, Pressable, ViewStyle, StyleProp } from 'react-native';
import { usePremiumPress } from '../../hooks/animation/usePremiumPress';
import { useTheme } from '../../theme';

interface PremiumButtonProps {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  isLoading?: boolean;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  label,
  onPress,
  style,
  disabled = false,
  isLoading = false,
}) => {
  const { pressProps, animatedStyle } = usePremiumPress();
  const { theme } = useTheme();
  const isInteractive = !disabled && !isLoading;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={isInteractive ? pressProps.onPressIn : undefined}
      onPressOut={isInteractive ? pressProps.onPressOut : undefined}
      disabled={!isInteractive}
      style={styles.pressableReset}
    >
      <Animated.View
        style={[
          styles.buttonBody,
          { backgroundColor: theme.colors.accent },
          style,
          isInteractive && animatedStyle,
          (disabled || isLoading) && { opacity: 0.5 },
        ]}
      >
        <Text style={[styles.buttonLabel, { color: theme.colors.accentForeground }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressableReset: {
    width: '100%',
  },
  buttonBody: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  disabledState: {
    opacity: 0.5,
  },
});