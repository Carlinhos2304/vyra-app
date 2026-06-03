import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
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

  // Validate basic form input before network processing
  const validateForm = (): boolean => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please fill in all security fields.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address structure.');
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    if (isLoading) return;
    if (!validateForm()) return;
    
    setIsLoading(true);
    console.log(`[Auth Login] Attempting credentials pass for identifier: ${email.trim().toLowerCase()}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) throw error;

      if (data?.user) {
        console.log('[Auth Login] Sign-In successful. Routing user session onto primary dashboard layout.');
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error('[Auth Login] Supabase authentication server error response:', error);
      Alert.alert('Authentication Failed', error.message || 'Invalid email or password combination.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    console.log('[Auth OAuth] Initializing Google identity token request pipeline.');
    Alert.alert('Google Auth', 'Third-party single sign-on services can be integrated via Native Credentials here.');
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

            <PremiumInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
            
            {/* Conditional Authentication View Slot */}
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
    marginBottom: 24,
  },
  loaderButtonPlaceholder: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
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
    marginBottom: 40,
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