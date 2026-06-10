import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import VyraLogo from '../../components/branding/VyraLogo';
import { PremiumButton } from '../../components/ui/PremiumButton'; 
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumInput } from '../../components/ui/PremiumInput';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pure React Native Animated opacity tracker
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Track error state transitions to fire smooth fade configurations
  useEffect(() => {
    if (errorMessage) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [errorMessage]);

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
        router.replace('/(tabs)/home');
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

  return (
    <PremiumScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.iconWrapper}>
              <View style={styles.starIconContainer}>
                <VyraLogo size={56} />
              </View>
            </View>
            <SectionHeader 
              title="Vyra" 
              subtitle="Welcome back" 
              style={styles.headerCenteredOverride} 
            />
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <SectionTitle withBottomMargin>Account Access</SectionTitle>

            <PremiumInput
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <View style={styles.inputSpacer} />

            <PremiumInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />

            {/* Standard React Native Animated Error Layout Container */}
            {errorMessage && (
              <Animated.View style={[styles.errorInlineBanner, { opacity: fadeAnim }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </Animated.View>
            )}

            <View style={styles.buttonSpacingAdjustment} />
            
            {isLoading ? (
              <View style={styles.loaderButtonPlaceholder}>
                <PremiumLoader />
              </View>
            ) : (
              <PremiumButton label="Sign In" onPress={handleSignIn} />
            )}
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth Section */}
          <TouchableOpacity 
            style={[styles.googleButton, isLoading && styles.disabledElement]} 
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <View style={styles.googleContent}>
              <View style={styles.envelopeIcon}>
                <View style={styles.envelopeFlap} />
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </View>
          </TouchableOpacity>

          {/* Footer Section */}
          <View style={[styles.footerContainer, isLoading && styles.disabledElement]}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => !isLoading && router.push('/auth/register')}
              disabled={isLoading}
            >
              <Text style={styles.signUpText}>Sign up</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 44,
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