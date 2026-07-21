import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { useTheme } from '../../theme';
interface SectionHeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  isDark?: boolean; // Keep for internal legacy if needed, or ignore
}

/**
 * SectionHeader - A premium luxury editorial heading component.
 * Engineered with high tracking and structured architectural hierarchy 
 * to align with the minimalist aesthetics of high-fashion digital platforms.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, style]} {...props}>
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        {title.toUpperCase()}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.5,
    lineHeight: 16,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.2,
    lineHeight: 18,
    marginTop: 4,
  },
});