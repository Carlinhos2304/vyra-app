import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewProps } from 'react-native';
import { useTheme } from '../../theme';
interface SectionTitleProps extends ViewProps {
  children: string;
  withBottomMargin?: boolean;
}

/**
 * SectionTitle - A lightweight, quiet typography component designed for 
 * architectural sub-sections, internal card divisions, and small structural labels.
 * Employs a restrained editorial tracking framework inspired by premium fashion-tech.
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({
  children,
  withBottomMargin = false,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <View 
      style={[
        styles.container, 
        withBottomMargin && styles.bottomMargin, 
        style
      ]} 
      {...props}
    >
      <Text style={[styles.text, { color: theme.colors.primary }]}>
        {children.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  bottomMargin: {
    marginBottom: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.0,
    lineHeight: 14,
  } as TextStyle,
});