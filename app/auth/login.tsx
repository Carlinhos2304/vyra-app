import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  LinearTransition,
} from 'react-native-reanimated';

import VyraLogo from '../../components/branding/VyraLogo';
import { PremiumButton } from '../../components/ui/PremiumButton';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumInput } from '../../components/ui/PremiumInput';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle, isGoogleSignInCancelled } from '../../lib/services/googleAuthService';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

// Ultra-premium cubic easing curve (Calm, confident, matching iOS/Apple system curves)
const PREMIUM_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const ENTRANCE_DURATION = 260; // Deliberate, calm transition duration
const SLIGHT_Y = 6;            // Quiet-luxury micro-translation (6px)

// High-performance custom entering transition (No overshoot, precise control)
const createPremiumEntrance = (delayMs: number) => {
  return () => {
    'worklet';
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: SLIGHT_Y }],
      },
      animations: {
        opacity: withDelay(delayMs, withTiming(1, { duration: ENTRANCE_DURATION, easing: PREMIUM_EASING })),
        transform: [
          {
            translateY: withDelay(
              delayMs,
              withTiming(0, { duration: ENTRANCE_DURATION, easing: PREMIUM_EASING })
            ),
          },
        ],
      },
    };
  };
};

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Soft-tinted error banner — computed locally per theme, matching the pattern
  // established on create.tsx's success/error feedback banners.
  const dangerBannerBg = theme.dark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2';
  const dangerBannerBorder = theme.dark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2';

  // Focus-state tracking values for Inputs
  const emailFocusValue = useSharedValue(0);
  const passwordFocusValue = useSharedValue(0);

  // Continuous micro-interaction state values
  const googleButtonScale = useSharedValue(1);
  const googleButtonOpacity = useSharedValue(1);
  const footerLinkOpacity = useSharedValue(1);

  // Dismiss errors automatically when user adjusts inputs
  useEffect(() => {
    if (errorMessage) setErrorMessage(null);
  }, [email, password]);

  const mapAuthErrorToFriendlyMessage = (error: any): string => {
    if (!error) return t('common.somethingWentWrong');

    const message = error.message?.toLowerCase() || '';
    if (message.includes('invalid login credentials') || message.includes('email not confirmed')) {
      return t('auth.login.errors.invalidCredentials');
    }
    if (message.includes('network') || message.includes('fetch')) {
      return t('auth.login.errors.connectionProblem');
    }
    if (message.includes('rate limit') || error.status === 429 || message.includes('too many requests')) {
      return t('auth.login.errors.tooManyAttempts');
    }

    return t('common.somethingWentWrong');
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setErrorMessage(t('auth.login.errors.emailRequired'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage(t('auth.login.errors.emailInvalid'));
      return false;
    }
    if (!password.trim()) {
      setErrorMessage(t('auth.login.errors.passwordRequired'));
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    if (isLoading) return;
    setErrorMessage(null);
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        setErrorMessage(mapAuthErrorToFriendlyMessage(error));
        return;
      }

      if (data?.user) {
        router.replace('/');
      }
    } catch (error: any) {
      console.error('[Auth Login] Supabase authentication server error response:', error);
      setErrorMessage(mapAuthErrorToFriendlyMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await signInWithGoogle();
      router.replace('/');
    } catch (error: any) {
      if (isGoogleSignInCancelled(error)) {
        // User backed out of the native picker — not an error, nothing to show.
        return;
      }
      console.error('[Auth Login] Google sign-in failed:', error);
      setErrorMessage(t('auth.login.errors.googleSignInFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Border highlight overrides for input focus states (no size resizing or scale pops)
  const emailAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(emailFocusValue.value === 1 ? theme.colors.accent : theme.colors.border, {
      duration: 200,
      easing: PREMIUM_EASING,
    }),
  }));

  const passwordAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(passwordFocusValue.value === 1 ? theme.colors.accent : theme.colors.border, {
      duration: 200,
      easing: PREMIUM_EASING,
    }),
  }));

  const googleButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(googleButtonScale.value, { duration: 90, easing: PREMIUM_EASING }) }],
    opacity: withTiming(googleButtonOpacity.value, { duration: 90, easing: PREMIUM_EASING }),
  }));

  const footerLinkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(footerLinkOpacity.value, { duration: 120, easing: PREMIUM_EASING }),
  }));

  return (
    <PremiumScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* 1. Logo Section (Sequence 1: delay 0ms) */}
          <Animated.View
            entering={createPremiumEntrance(0)}
            style={styles.logoContainer}
          >
            <View style={styles.iconWrapper}>
              <View style={styles.starIconContainer}>
                <VyraLogo size={56} isDark={theme.dark} />
              </View>
            </View>
            {/* 2. Title & Subtitle Section (Sequence 2: delay 50ms) */}
            <Animated.View entering={createPremiumEntrance(50)}>
              <SectionHeader
                title="Vyra"
                subtitle={t('auth.login.subtitle')}
                style={styles.headerCenteredOverride}
              />
            </Animated.View>
          </Animated.View>

          {/* 3. Form Section Container (Sequence 3: delay 100ms) */}
          <Animated.View
            entering={createPremiumEntrance(100)}
            style={styles.formContainer}
          >
            <SectionTitle withBottomMargin>{t('auth.login.sectionTitle')}</SectionTitle>

            <Animated.View style={[styles.inputWrapperBorder, emailAnimatedStyle]}>
              <PremiumInput
                label={t('auth.login.emailLabel')}
                placeholder={t('auth.login.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => { emailFocusValue.value = 1; }}
                onBlur={() => { emailFocusValue.value = 0; }}
              />
            </Animated.View>

            <View style={styles.inputSpacer} />

            <Animated.View style={[styles.inputWrapperBorder, passwordAnimatedStyle]}>
              <PremiumInput
                label={t('auth.login.passwordLabel')}
                placeholder={t('auth.login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => { passwordFocusValue.value = 1; }}
                onBlur={() => { passwordFocusValue.value = 0; }}
              />
            </Animated.View>

            {/* Error Banner transition: Calm, minimal, zero spring overshoot */}
            {errorMessage && (
              <Animated.View
                entering={createPremiumEntrance(0)} // Triggers instantly on state render
                exiting={FadeOut.duration(150).easing(PREMIUM_EASING)}
                layout={LinearTransition.duration(200).easing(PREMIUM_EASING)}
                style={[styles.errorInlineBanner, { backgroundColor: dangerBannerBg, borderColor: dangerBannerBorder }]}
              >
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                <Text style={[styles.errorBannerText, { color: theme.colors.danger }]}>{errorMessage}</Text>
              </Animated.View>
            )}

            <View style={styles.buttonSpacingAdjustment} />

            {/* 4. Primary Button Section (Sequence 4: delay 150ms) */}
            <Animated.View
              entering={createPremiumEntrance(150)}
              layout={LinearTransition.duration(200).easing(PREMIUM_EASING)}
            >
              {isLoading ? (
                <Animated.View
                  entering={FadeIn.duration(150).easing(PREMIUM_EASING)}
                  exiting={FadeOut.duration(150).easing(PREMIUM_EASING)}
                  style={styles.loaderButtonPlaceholder}
                >
                  <PremiumLoader />
                </Animated.View>
              ) : (
                <Animated.View
                  entering={FadeIn.duration(150).easing(PREMIUM_EASING)}
                  exiting={FadeOut.duration(150).easing(PREMIUM_EASING)}
                >
                  <PremiumButton label={t('auth.login.signInButton')} onPress={handleSignIn} />
                </Animated.View>
              )}
            </Animated.View>
          </Animated.View>

          {/* 5. Divider Section (Sequence 5: delay 190ms) */}
          <Animated.View
            entering={createPremiumEntrance(190)}
            style={styles.dividerContainer}
          >
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>{t('auth.login.orDivider')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </Animated.View>

          {/* 6. Google Section (Sequence 6: delay 230ms) */}
          <Animated.View entering={createPremiumEntrance(230)}>
            <TouchableOpacity
              style={isLoading && styles.disabledElement}
              activeOpacity={1}
              onPressIn={() => {
                googleButtonScale.value = 0.995;
                googleButtonOpacity.value = 0.95;
              }}
              onPressOut={() => {
                googleButtonScale.value = 1;
                googleButtonOpacity.value = 1;
              }}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Animated.View style={[styles.googleButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, googleButtonAnimatedStyle]}>
                <View style={styles.googleContent}>
                  <View style={[styles.envelopeIcon, { borderColor: theme.colors.textPrimary }]}>
                    <View style={[styles.envelopeFlap, { borderColor: theme.colors.textPrimary }]} />
                  </View>
                  <Text style={[styles.googleButtonText, { color: theme.colors.textPrimary }]}>{t('auth.login.continueWithGoogle')}</Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* 7. Footer Section (Sequence 7: delay 270ms) */}
          <Animated.View
            entering={createPremiumEntrance(270)}
            style={[styles.footerContainer, isLoading && styles.disabledElement]}
          >
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>{t('auth.login.noAccountPrompt')}</Text>
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={() => { footerLinkOpacity.value = 0.7; }}
              onPressOut={() => { footerLinkOpacity.value = 1; }}
              onPress={() => !isLoading && router.push('/auth/register')}
              disabled={isLoading}
            >
              <Animated.View style={footerLinkAnimatedStyle}>
                <Text style={[styles.signUpText, { color: theme.colors.textPrimary }]}>{t('auth.login.signUpLink')}</Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconWrapper: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerCenteredOverride: {
    alignItems: 'center',
    paddingVertical: 0,
  },
  formContainer: {
    width: '100%',
    marginBottom: 12,
  },
  inputWrapperBorder: {
    borderWidth: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputSpacer: {
    height: 12,
  },
  errorInlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
    flex: 1,
  },
  buttonSpacingAdjustment: {
    height: 24,
  },
  loaderButtonPlaceholder: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  googleButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  envelopeIcon: {
    width: 18,
    height: 13,
    borderWidth: 1.5,
    borderRadius: 1,
    marginRight: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  envelopeFlap: {
    position: 'absolute',
    top: -5,
    left: 2,
    width: 11,
    height: 11,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 44, // Ensures layout spacing remains identical
  },
  footerText: {
    fontSize: 14,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '500',
  },
  disabledElement: {
    opacity: 0.4,
  },
});
