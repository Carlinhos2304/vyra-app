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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (!error) return 'Something went wrong. Please try again.';
    
    const message = error.message?.toLowerCase() || '';
    if (message.includes('invalid login credentials') || message.includes('email not confirmed')) {
      return 'Incorrect email or password.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection problem. Please try again.';
    }
    if (message.includes('rate limit') || error.status === 429 || message.includes('too many requests')) {
      return 'Too many login attempts. Please wait a moment.';
    }
    
    return 'Something went wrong. Please try again.';
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Invalid email format.');
      return false;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    if (isLoading) return;
    setErrorMessage(null);
    if (!validateForm()) return;
    
    setIsLoading(true);
    console.log(`[Auth Login] Attempting credentials pass for identifier: ${email.trim().toLowerCase()}`);
    
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
        console.log('[Auth Login] Sign-In successful. Routing user session onto primary dashboard layout.');
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
    console.log('[Auth OAuth] Initializing Google identity token request pipeline.');
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' ? window.location.origin : 'vyra://home',
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setErrorMessage(mapAuthErrorToFriendlyMessage(error));
      setIsLoading(false);
    }
  };

  // Border highlight overrides for input focus states (no size resizing or scale pops)
  const emailAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(emailFocusValue.value === 1 ? '#000000' : '#EAEAEA', {
      duration: 200,
      easing: PREMIUM_EASING,
    }),
  }));

  const passwordAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(passwordFocusValue.value === 1 ? '#000000' : '#EAEAEA', {
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
                <VyraLogo size={56} />
              </View>
            </View>
            {/* 2. Title & Subtitle Section (Sequence 2: delay 50ms) */}
            <Animated.View entering={createPremiumEntrance(50)}>
              <SectionHeader 
                title="Vyra" 
                subtitle="Welcome back" 
                style={styles.headerCenteredOverride} 
              />
            </Animated.View>
          </Animated.View>

          {/* 3. Form Section Container (Sequence 3: delay 100ms) */}
          <Animated.View 
            entering={createPremiumEntrance(100)}
            style={styles.formContainer}
          >
            <SectionTitle withBottomMargin>Account Access</SectionTitle>

            <Animated.View style={[styles.inputWrapperBorder, emailAnimatedStyle]}>
              <PremiumInput
                label="Email"
                placeholder="your@email.com"
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
                label="Password"
                placeholder="••••••••"
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
                style={styles.errorInlineBanner}
              >
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
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
                  <PremiumButton label="Sign In" onPress={handleSignIn} />
                </Animated.View>
              )}
            </Animated.View>
          </Animated.View>

          {/* 5. Divider Section (Sequence 5: delay 190ms) */}
          <Animated.View 
            entering={createPremiumEntrance(190)}
            style={styles.dividerContainer}
          >
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
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
              <Animated.View style={[styles.googleButton, googleButtonAnimatedStyle]}>
                <View style={styles.googleContent}>
                  <View style={styles.envelopeIcon}>
                    <View style={styles.envelopeFlap} />
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* 7. Footer Section (Sequence 7: delay 270ms) */}
          <Animated.View 
            entering={createPremiumEntrance(270)}
            style={[styles.footerContainer, isLoading && styles.disabledElement]}
          >
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity 
              activeOpacity={1}
              onPressIn={() => { footerLinkOpacity.value = 0.7; }}
              onPressOut={() => { footerLinkOpacity.value = 1; }}
              onPress={() => !isLoading && router.push('/auth/register')}
              disabled={isLoading}
            >
              <Animated.View style={footerLinkAnimatedStyle}>
                <Text style={styles.signUpText}>Sign up</Text>
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
    borderColor: '#EAEAEA',
    overflow: 'hidden',
  },
  inputSpacer: {
    height: 12,
  },
  errorInlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#EF4444',
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
    backgroundColor: '#EAEAEA',
  },
  dividerText: {
    fontSize: 12,
    color: '#999999',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  googleButton: {
    height: 52,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    borderColor: '#000000',
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
    borderColor: '#000000',
    transform: [{ rotate: '45deg' }],
  },
  googleButtonText: {
    color: '#000000',
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
    color: '#666666',
  },
  signUpText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  disabledElement: {
    opacity: 0.4,
  },
});