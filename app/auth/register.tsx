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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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

import { PremiumButton } from '../../components/ui/PremiumButton'; 
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumInput } from '../../components/ui/PremiumInput';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';

// Ultra-premium cubic easing curve (Calm, confident, matching iOS/Apple system curves)
const PREMIUM_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const ENTRANCE_DURATION = 260; 
const SLIGHT_Y = 6;            

// Robust worklet-based entrance choreography sequence
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

export default function RegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
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

  // Focus-state tracking values for Input Borders
  const usernameFocus = useSharedValue(0);
  const emailFocus = useSharedValue(0);
  const birthdayFocus = useSharedValue(0);
  const passwordFocus = useSharedValue(0);
  const confirmPasswordFocus = useSharedValue(0);

  // Micro-interaction shared values
  const backBtnScale = useSharedValue(1);
  const footerOpacity = useSharedValue(1);

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

  // Clean error panel context if inputs change
  useEffect(() => {
    if (errorMessage) setErrorMessage(null);
  }, [username, email, password, confirmPassword, birthDate, gender]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
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

  // Reanimated style definitions for silent input borders
  const usernameStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(usernameFocus.value === 1 ? theme.colors.primary : theme.colors.border, { duration: 200, easing: PREMIUM_EASING }),
  }));

  const emailStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(emailFocus.value === 1 ? theme.colors.primary : theme.colors.border, { duration: 200, easing: PREMIUM_EASING }),
  }));

  const birthdayStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(birthdayFocus.value === 1 ? theme.colors.primary : theme.colors.border, { duration: 200, easing: PREMIUM_EASING }),
  }));

  const passwordStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(passwordFocus.value === 1 ? theme.colors.primary : theme.colors.border, { duration: 200, easing: PREMIUM_EASING }),
  }));

  const confirmPasswordStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(confirmPasswordFocus.value === 1 ? theme.colors.primary : theme.colors.border, { duration: 200, easing: PREMIUM_EASING }),
  }));

  const backBtnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(backBtnScale.value, { duration: 90, easing: PREMIUM_EASING }) }],
  }));

  const footerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(footerOpacity.value, { duration: 120, easing: PREMIUM_EASING }),
  }));

  return (
    <PremiumScreen>
      {/* 1. Header Back Section (Sequence 1: delay 0ms) */}
      <Animated.View 
        entering={createPremiumEntrance(0)}
        style={styles.navigationHeaderContainer}
      >
        <TouchableOpacity 
          style={isLoading && styles.disabledElement} 
          onPress={() => router.back()}
          onPressIn={() => { backBtnScale.value = 0.97; }}
          onPressOut={() => { backBtnScale.value = 1; }}
          disabled={isLoading}
          activeOpacity={1}
        >
          <Animated.View style={[styles.backCircleActionButton, backBtnAnimatedStyle, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 2. Title Header (Sequence 2: delay 40ms) */}
          <Animated.View 
            entering={createPremiumEntrance(40)}
            style={styles.titleSectionContainer}
          >
            <SectionHeader 
              title="Create Profile" 
              subtitle="Establish wardrobe configuration coordinates" 
              style={styles.headerAlignmentOverride}
            />
          </Animated.View>

          {/* 3. Main Form Section (Sequence 3: delay 80ms) */}
          <Animated.View 
            entering={createPremiumEntrance(80)}
            style={styles.formContainer}
          >
            <SectionTitle withBottomMargin>Identity Parameters</SectionTitle>

            <Animated.View style={[styles.inputWrapperBorder, usernameStyle]}>
              <PremiumInput
                label="Username"
                placeholder="closet_curator"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => { usernameFocus.value = 1; }}
                onBlur={() => { usernameFocus.value = 0; }}
              />
            </Animated.View>

            <View style={styles.inputSpacer} />

            <Animated.View style={[styles.inputWrapperBorder, emailStyle]}>
              <PremiumInput
                label="Email Address"
                placeholder="curator@vyra.app"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => { emailFocus.value = 1; }}
                onBlur={() => { emailFocus.value = 0; }}
              />
            </Animated.View>

            <View style={styles.inputSpacer} />

            {/* Premium Native Birthday Anchor Field Trigger */}
            <TouchableOpacity 
              activeOpacity={1} 
              onPressIn={() => { birthdayFocus.value = 1; }}
              onPressOut={() => { birthdayFocus.value = 0; }}
              onPress={() => !isLoading && setShowDatePicker(true)}
              disabled={isLoading}
            >
              <Animated.View style={[styles.inputWrapperBorder, birthdayStyle]}>
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
              </Animated.View>
            </TouchableOpacity>

            {/* Platform Modal Native Picker Integration Wrapper */}
            {showDatePicker && (
              Platform.OS === 'ios' ? (
                <Animated.View 
                  entering={FadeIn.duration(200).easing(PREMIUM_EASING)}
                  exiting={FadeOut.duration(150).easing(PREMIUM_EASING)}
                  style={[styles.iosPickerWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <View style={[styles.iosPickerHeaderRow, { backgroundColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.iosPickerDoneText, { color: theme.colors.text }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={rawDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    textColor={theme.colors.text}
                  />
                </Animated.View>
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

            <Text style={[styles.genderLabelText, { color: theme.colors.secondaryText }]}>Gender Selection (Optional)</Text>
            <View style={styles.genderRowButtonGroup}>
              {(['Male', 'Female', 'Other'] as const).map((genderOption) => (
                <TouchableOpacity
                  key={genderOption}
                  style={[
                    styles.genderBadgePill,
                    { backgroundColor: theme.colors.surface },
                    gender === genderOption && [styles.activeGenderPill, { backgroundColor: theme.colors.background, borderColor: theme.colors.primary }],
                    isLoading && styles.disabledElement
                  ]}
                  onPress={() => !isLoading && setGender(gender === genderOption ? '' : genderOption)}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.genderTextProperty,
                    { color: theme.colors.secondaryText },
                    gender === genderOption && [styles.activeGenderText, { color: theme.colors.text }]
                  ]}>
                    {genderOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Animated.View style={[styles.inputWrapperBorder, passwordStyle]}>
              <PremiumInput
                label="Choose Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => { passwordFocus.value = 1; }}
                onBlur={() => { passwordFocus.value = 0; }}
              />
            </Animated.View>

            {/* Premium Minimalist Real-Time Password Validation Criteria Panel */}
            {password.length > 0 && (
              <Animated.View 
                entering={createPremiumEntrance(0)}
                exiting={FadeOut.duration(150).easing(PREMIUM_EASING)}
                layout={LinearTransition.duration(200).easing(PREMIUM_EASING)}
                style={styles.validationCriteriaCard}
              >
                <View style={styles.criteriaLineItem}>
                  <MaterialCommunityIcons 
                    name={hasMinLength ? "check-circle" : "circle-slice-8"} 
                    size={14} 
                    color={hasMinLength ? "#10B981" : theme.colors.disabled}
                  />
                  <Text style={[styles.criteriaItemText, { color: theme.colors.secondaryText }, hasMinLength && [styles.criteriaItemTextSuccess, { color: theme.colors.text }]]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.criteriaLineItem}>
                  <MaterialCommunityIcons 
                    name={hasUppercase ? "check-circle" : "circle-slice-8"} 
                    size={14} 
                    color={hasUppercase ? "#10B981" : theme.colors.disabled}
                  />
                  <Text style={[styles.criteriaItemText, { color: theme.colors.secondaryText }, hasUppercase && [styles.criteriaItemTextSuccess, { color: theme.colors.text }]]}>
                    At least 1 uppercase letter
                  </Text>
                </View>
                <View style={styles.criteriaLineItem}>
                  <MaterialCommunityIcons 
                    name={hasSpecialChar ? "check-circle" : "circle-slice-8"} 
                    size={14} 
                    color={hasSpecialChar ? "#10B981" : theme.colors.disabled}
                  />
                  <Text style={[styles.criteriaItemText, { color: theme.colors.secondaryText }, hasSpecialChar && [styles.criteriaItemTextSuccess, { color: theme.colors.text }]]}>
                    At least 1 special character
                  </Text>
                </View>
              </Animated.View>
            )}

            <View style={styles.inputSpacer} />

            <Animated.View style={[styles.inputWrapperBorder, confirmPasswordStyle]}>
              <PremiumInput
                label="Confirm Chosen Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => { confirmPasswordFocus.value = 1; }}
                onBlur={() => { confirmPasswordFocus.value = 0; }}
              />
            </Animated.View>

            {/* Error Banner Transition */}
            {errorMessage && (
              <Animated.View 
                entering={FadeIn.duration(200).easing(PREMIUM_EASING)}
                exiting={FadeOut.duration(150).easing(PREMIUM_EASING)}
                layout={LinearTransition.duration(200).easing(PREMIUM_EASING)}
                style={[styles.errorInlineBanner, { backgroundColor: theme.dark ? '#451a1a' : '#FEF2F2', borderColor: theme.dark ? '#7f1d1d' : '#FEE2E2' }]}
              >
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </Animated.View>
            )}

            <View style={styles.buttonTopGappingWrapper} />

            <Animated.View layout={LinearTransition.duration(200).easing(PREMIUM_EASING)}>
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
                  <PremiumButton 
                    label="Register Wardrobe Account" 
                    onPress={handleRegisterAccount} 
                    disabled={!isFormValid}
                    style={!isFormValid && styles.disabledRegisterButton}
                  />
                </Animated.View>
              )}
            </Animated.View>
          </Animated.View>
          
          {/* 4. Footer Navigation Link (Sequence 4: delay 120ms) */}
          <Animated.View 
            entering={createPremiumEntrance(120)}
            style={[styles.footerContainer, isLoading && styles.disabledElement]}
          >
            <Text style={[styles.footerText, { color: theme.colors.secondaryText }]}>Already have an account? </Text>
            <TouchableOpacity 
              activeOpacity={1} 
              onPressIn={() => { footerOpacity.value = 0.7; }}
              onPressOut={() => { footerOpacity.value = 1; }}
              onPress={() => !isLoading && router.push('/auth/login')}
              disabled={isLoading}
              style={styles.inlineFooterLink}
            >
              <Animated.View style={footerAnimatedStyle}>
                <Text style={[styles.signInLinkText, { color: theme.colors.text }]}>Sign in</Text>
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
  inputWrapperBorder: {
    borderWidth: 0,
    borderRadius: 12,
    borderColor: '#E7E5E4',
    overflow: 'hidden',
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