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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

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
  const [rawDate, setRawDate] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time password validation states
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasSpecialChar;
  
  // Entire form validation state tracker
  const isFormValid = 
    username.trim().length >= 3 && 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && 
    birthDate.trim().length > 0 && 
    isPasswordValid && 
    password === confirmPassword;

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

  // Clean error panel context if inputs change
  useEffect(() => {
    if (errorMessage) setErrorMessage(null);
  }, [username, email, password, confirmPassword, birthDate, gender]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // For Android, dismiss picker panel overlay immediately on select
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setRawDate(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setBirthDate(`${year}-${month}-${day}`);
    }
  };

  // Translate Supabase / backend validation parameters to user-friendly feedback
  const mapAuthErrorToFriendlyMessage = (error: any): string => {
    if (!error) return 'Registration failed. Please try again.';
    
    const message = error.message?.toLowerCase() || '';
    if (message.includes('user_already_exists') || message.includes('already registered') || message.includes('already exists')) {
      return 'This email is already registered.';
    }
    if (message.includes('email') || message.includes('invalid address')) {
      return 'Invalid email format.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection problem. Please try again.';
    }
    if (message.includes('rate limit') || error.status === 429) {
      return 'Too many attempts. Please wait a moment.';
    }
    
    return 'Registration failed. Please try again.';
  };

  const handleRegisterAccount = async () => {
    if (isLoading || !isFormValid) return;
    setErrorMessage(null);

    setIsLoading(true);
    console.log(`[Registration Execution] Dispatching signup to Supabase for email: ${email.trim().toLowerCase()}`);

    try {
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

      if (authError) {
        setErrorMessage(mapAuthErrorToFriendlyMessage(authError));
        return;
      }

      const authenticatedUserInstance = authData?.user;
      if (!authenticatedUserInstance) {
        throw new Error('Authentication parameters dropped.');
      }

      console.log(`[Registration Execution] Auth Account provisioned successfully. ID assigned: ${authenticatedUserInstance.id}`);

      // Ensure profile exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authenticatedUserInstance.id,
          username: username.trim(),
          birth_date: birthDate.trim(),
          gender: gender || null,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('[Registration Execution] Error creating profile:', profileError);
        throw profileError;
      }
      router.replace('/');

    } catch (error: any) {
      console.error('[Registration Execution] Critical authorization transaction crash state:', error);
      setErrorMessage(mapAuthErrorToFriendlyMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PremiumScreen>
      <View style={styles.navigationHeaderContainer}>
        <TouchableOpacity 
          style={[styles.backCircleActionButton, isLoading && styles.disabledElement]} 
          onPress={() => router.back()}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1C1917" />
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
              style={styles.headerAlignmentOverride}
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

            <View style={styles.inputSpacer} />

            <PremiumInput
              label="Email Address"
              placeholder="curator@vyra.app"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <View style={styles.inputSpacer} />

            {/* Premium Native Birthday Anchor Field Trigger */}
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => !isLoading && setShowDatePicker(true)}
              disabled={isLoading}
            >
              <View pointerEvents="none">
                <PremiumInput
                  label="Birth Date"
                  placeholder="Select your birth date"
                  value={birthDate}
                  editable={false}
                />
              </View>
              <MaterialCommunityIcons 
                name="calendar-month-outline" 
                size={18} 
                color="#78716C" 
                style={styles.calendarInlineIcon}
              />
            </TouchableOpacity>

            {/* Platform Modal Native Picker Integration Wrapper */}
            {showDatePicker && (
              Platform.OS === 'ios' ? (
                <View style={styles.iosPickerWrapper}>
                  <View style={styles.iosPickerHeaderRow}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.iosPickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={rawDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={rawDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )
            )}

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
                  onPress={() => !isLoading && setGender(gender === genderOption ? '' : genderOption)}
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

            {/* Premium Minimalist Real-Time Password Validation Criteria View Panel */}
            {password.length > 0 && (
              <View style={styles.validationCriteriaCard}>
                <View style={styles.criteriaLineItem}>
                  <MaterialCommunityIcons 
                    name={hasMinLength ? "check-circle" : "circle-slice-8"} 
                    size={14} 
                    color={hasMinLength ? "#10B981" : "#A8A29E"} 
                  />
                  <Text style={[styles.criteriaItemText, hasMinLength && styles.criteriaItemTextSuccess]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.criteriaLineItem}>
                  <MaterialCommunityIcons 
                    name={hasUppercase ? "check-circle" : "circle-slice-8"} 
                    size={14} 
                    color={hasUppercase ? "#10B981" : "#A8A29E"} 
                  />
                  <Text style={[styles.criteriaItemText, hasUppercase && styles.criteriaItemTextSuccess]}>
                    At least 1 uppercase letter
                  </Text>
                </View>
                <View style={styles.criteriaLineItem}>
                  <MaterialCommunityIcons 
                    name={hasSpecialChar ? "check-circle" : "circle-slice-8"} 
                    size={14} 
                    color={hasSpecialChar ? "#10B981" : "#A8A29E"} 
                  />
                  <Text style={[styles.criteriaItemText, hasSpecialChar && styles.criteriaItemTextSuccess]}>
                    At least 1 special character
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.inputSpacer} />

            <PremiumInput
              label="Confirm Chosen Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />

            {/* Premium Inline Animated Error Alert Layout Component Slot */}
            {errorMessage && (
              <Animated.View style={[styles.errorInlineBanner, { opacity: fadeAnim }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </Animated.View>
            )}

            <View style={styles.buttonTopGappingWrapper} />

            {isLoading ? (
              <View style={styles.loaderButtonPlaceholder}>
                <PremiumLoader />
              </View>
            ) : (
              <PremiumButton 
                label="Register Wardrobe Account" 
                onPress={handleRegisterAccount} 
                disabled={!isFormValid}
                style={!isFormValid && styles.disabledRegisterButton}
              />
            )}
          </View>
          
          {/* Footer Navigation Link */}
          <View style={[styles.footerContainer, isLoading && styles.disabledElement]}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => !isLoading && router.push('/auth/login')}
              disabled={isLoading}
              style={styles.inlineFooterLink}
            >
              <Text style={styles.signInLinkText}>Sign in</Text>
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
  navigationHeaderContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    zIndex: 50,
  },
  backCircleActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  titleSectionContainer: {
    marginBottom: 28,
    marginTop: 12,
  },
  headerAlignmentOverride: {
    paddingVertical: 0,
  },
  formContainer: {
    width: '100%',
    marginBottom: 32,
  },
  inputSpacer: {
    height: 12,
  },
  calendarInlineIcon: {
    position: 'absolute',
    right: 16,
    bottom: 18,
  },
  iosPickerWrapper: {
    backgroundColor: '#F5F5F4',
    borderRadius: 14,
    marginTop: -4,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  iosPickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E7E5E4',
  },
  iosPickerDoneText: {
    color: '#1C1917',
    fontWeight: '600',
    fontSize: 14,
  },
  genderLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  genderRowButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  genderBadgePill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeGenderPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1C1917',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  genderTextProperty: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '500',
  },
  activeGenderText: {
    color: '#1C1917',
    fontWeight: '600',
  },
  validationCriteriaCard: {
    paddingHorizontal: 6,
    marginTop: 10,
    marginBottom: 4,
    gap: 6,
  },
  criteriaLineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criteriaItemText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '400',
  },
  criteriaItemTextSuccess: {
    color: '#1C1917',
    fontWeight: '500',
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
    marginTop: 18,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
    letterSpacing: -0.2,
    flex: 1,
  },
  loaderButtonPlaceholder: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonTopGappingWrapper: {
    height: 24,
  },
  disabledRegisterButton: {
    opacity: 0.35,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#78716C',
  },
  inlineFooterLink: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  signInLinkText: {
    fontSize: 14,
    color: '#1C1917',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  disabledElement: {
    opacity: 0.4,
  },
});