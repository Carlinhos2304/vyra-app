import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface PremiumScreenProps extends SafeAreaViewProps {
  children: React.ReactNode;
}

/**
 * PremiumScreen - Pure structural wrapper isolating layout container bounds,
 * maintaining exact canvas color fills and safe area distribution.
 */
export const PremiumScreen: React.FC<PremiumScreenProps> = ({ 
  children, 
  style, 
  ...props 
}) => {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }, style]} {...props}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});