import React from 'react';
import { Animated, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { usePremiumPress } from '../../hooks/animation/usePremiumPress';

interface PremiumCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ children, onPress, style }) => {
  const { pressProps, animatedStyle } = usePremiumPress();
  const hasAction = typeof onPress === 'function';

  return (
    <Pressable 
      onPress={onPress} 
      disabled={!hasAction}
      style={styles.containerReset}
    >
      <Animated.View 
        style={[
          styles.cardBase, 
          style, 
          hasAction && animatedStyle
        ]}
        {...(hasAction ? pressProps : {})}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    overflow: 'hidden',
  },
});