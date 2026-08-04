import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { PremiumTouchable } from '../ui/PremiumTouchable';
import VyraLogo from '../branding/VyraLogo';
import { useTheme } from '../../theme';

interface GreetingHeaderProps {
  /** e.g. "Good morning, Carlos" — already localized/assembled by useHomeGreeting. */
  greeting: string;
  /** Dynamic one-line subtitle from useHomeGreeting — never a fixed string. */
  subtitle: string;
  onAvatarPress: () => void;
}

const formattedDate = new Date().toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
});

/**
 * GreetingHeader — the "briefing", not a dashboard title. Same editorial
 * header treatment the old Home had (date row + logo, then a greeting line),
 * just fed by useHomeGreeting's dynamic subtitle instead of a fixed poetry line.
 */
export const GreetingHeader: React.FC<GreetingHeaderProps> = ({ greeting, subtitle, onAvatarPress }) => {
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(600).easing(Easing.out(Easing.cubic))}
      style={styles.container}
    >
      <View style={styles.brandMetaRow}>
        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>{formattedDate}</Text>
        <PremiumTouchable onPress={onAvatarPress} activeOpacity={0.75}>
          <VyraLogo isDark={theme.dark} />
        </PremiumTouchable>
      </View>

      <Animated.Text
        entering={FadeInDown.duration(600).delay(80).easing(Easing.out(Easing.cubic))}
        style={[styles.greetingText, { color: theme.colors.textPrimary }]}
      >
        {greeting}
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.duration(600).delay(140).easing(Easing.out(Easing.cubic))}
        style={[styles.subtitleText, { color: theme.colors.textSecondary }]}
      >
        {subtitle}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  brandMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
});
