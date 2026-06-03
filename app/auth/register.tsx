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
import { Ionicons } from '@expo/vector-icons';
import { PremiumButton } from '../../components/ui/PremiumButton'; 
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumInput } from '../../components/ui/PremiumInput';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';

import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  
  // Registration State Management Variables
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState(''); 
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  // Client Validation Engine
  const validateRegistrationForm = (): boolean => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword || !birthDate.trim()) {
      Alert.alert('Required Information', 'Please provide inputs for all active profile rows.');
      return false;
    }
    if (username.trim().length < 3) {
      Alert.alert('Invalid Username', 'User handle parameters require at least 3 characters.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email Address', 'Please supply a real structured routing email domain.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Security Check', 'Your password hash parameters require at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatched Credentials', 'Confirmation coordinates do not correspond to the chosen password.');
      return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate.trim())) {
      Alert.alert('Date Format Error', 'Please provide birthdate properties normalized using YYYY-MM-DD styling flags.');
      return false;
    }
    return true;
  };

  const handleRegisterAccount = async () => {
    if (isLoading) return;
    if (!validateRegistrationForm()) return;

    setIsLoading(true);
    console.log(`[Registration Execution] Dispatching signup to Supabase for email: ${email.trim().toLowerCase()}`);

    try {
      // 1. Authenticate user and attach raw metadata for the database trigger to process
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            username: username.trim(),
            birth_date: birthDate.trim(),
            gender: gender || null,
          }
        }
      });

      if (authError) throw authError;

      const authenticatedUserInstance = authData?.user;
      if (!authenticatedUserInstance) {
        throw new Error('Authentication parameters dropped. Session generation tracking failed.');
      }

      console.log(`[Registration Execution] Auth Account provisioned successfully. ID assigned: ${authenticatedUserInstance.id}`);
      console.log('[Registration Execution] Profile creation handed off smoothly to database trigger automation.');

      Alert.alert(
        'Account Set Up', 
        'Your profile space is established! Welcome aboard Vyra.',
        [{ text: 'Enter Closet Workspace', onPress: () => router.replace('/(tabs)/home') }]
      );

    } catch (error: any) {
      console.error('[Registration Execution] Critical authorization transaction crash state:', error);
      Alert.alert('Registration Deflected', error.message || 'An unhandled exception blocked security provisioning.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PremiumScreen>
      <View style={styles.navigationHeaderContainer}>
        <TouchableOpacity 
          style={styles.backCircleActionButton} 
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <Ionicons name="arrow-back" size={20} color="#000000" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.titleSectionContainer}>
            <SectionHeader 
              title="Create Profile" 
              subtitle="Establish wardrobe configuration coordinates" 
            />
          </View>

          <View style={styles.formContainer}>
            <SectionTitle withBottomMargin>Identity Parameters</SectionTitle>

            <PremiumInput
              label="Username"
              placeholder="closet_curator"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!isLoading}
            />

            <PremiumInput
              label="Email Address"
              placeholder="curator@vyra.app"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <PremiumInput
              label="Birth Date"
              placeholder="YYYY-MM-DD (e.g., 1998-04-24)"
              value={birthDate}
              onChangeText={setBirthDate}
              editable={!isLoading}
            />

            <Text style={styles.genderLabelText}>Gender Selection (Optional)</Text>
            <View style={styles.genderRowButtonGroup}>
              {(['Male', 'Female', 'Other'] as const).map((genderOption) => (
                <TouchableOpacity
                  key={genderOption}
                  style={[
                    styles.genderBadgePill,
                    gender === genderOption && styles.activeGenderPill,
                    isLoading && styles.disabledElement
                  ]}
                  onPress={() => !isLoading && setGender(genderOption)}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.genderTextProperty,
                    gender === genderOption && styles.activeGenderText
                  ]}>
                    {genderOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <PremiumInput
              label="Choose Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />

            <PremiumInput
              label="Confirm Chosen Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />

            {isLoading ? (
              <View style={styles.loaderButtonPlaceholder}>
                <PremiumLoader />
              </View>
            ) : (
              <View style={styles.buttonTopGappingWrapper}>
                <PremiumButton label="Register Wardrobe Account" onPress={handleRegisterAccount} />
              </View>
            )}
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
  navigationHeaderContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    zIndex: 50,
  },
  backCircleActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  titleSectionContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  formContainer: {
    width: '100%',
  },
  loaderButtonPlaceholder: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonTopGappingWrapper: {
    marginTop: 24,
  },
  genderLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 10,
    marginTop: 16,
  },
  genderRowButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  genderBadgePill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeGenderPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
  },
  genderTextProperty: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeGenderText: {
    color: '#000000',
    fontWeight: '600',
  },
  disabledElement: {
    opacity: 0.4,
  },
});