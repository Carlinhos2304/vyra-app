import React from 'react';
import { StyleSheet, Text, View, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../../theme';

interface PremiumInputProps extends TextInputProps {
  label: string;
}

/**
 * PremiumInput - Isolated structural input element extracted directly from the form container.
 * Preserves the exact text layout tracking, background canvas fill, and semantic label layout.
 */
export const PremiumInput: React.FC<PremiumInputProps> = ({
  label,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <View style={styles.inputFieldContainer}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.border, borderWidth: 1 },
          style
        ]}
        placeholderTextColor={theme.colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputFieldContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },
});