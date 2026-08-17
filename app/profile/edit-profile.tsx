import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  ActionSheetIOS,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn, Easing } from 'react-native-reanimated';
import { AppAlert } from '../../lib/ui/appAlert';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PremiumInput } from '../../components/ui/PremiumInput';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { SectionTitle } from '../../components/ui/SectionTitle';

import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

interface UserProfileFormState {
  username: string;
  birth_date: string;
  gender: string;
}

const GENDER_OPTIONS = [
  { id: 'Male', labelKey: 'profile.editProfile.genderOptions.male' },
  { id: 'Female', labelKey: 'profile.editProfile.genderOptions.female' },
  { id: 'Non-binary', labelKey: 'profile.editProfile.genderOptions.nonBinary' },
  { id: 'Prefer not to say', labelKey: 'profile.editProfile.genderOptions.preferNotToSay' },
];

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [profileForm, setProfileForm] = useState<UserProfileFormState>({
    username: '',
    birth_date: '',
    gender: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Picker visibility controls
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error(t('profile.editProfile.errors.notAuthenticated'));
        }

        setUserId(user.id);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, birth_date, gender')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (profileData) {
          setProfileForm({
            username: profileData.username || '',
            birth_date: profileData.birth_date || '',
            gender: profileData.gender || '',
          });
        }
      } catch (error: any) {
        AppAlert.alert(t('profile.editProfile.errors.loadProfileTitle'), error.message);
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (field: keyof UserProfileFormState, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      handleInputChange('birth_date', `${year}-${month}-${day}`);
    }
  };

  const handleGenderPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...GENDER_OPTIONS.map((option) => t(option.labelKey)), t('common.cancel')],
          cancelButtonIndex: GENDER_OPTIONS.length,
          title: t('profile.editProfile.selectGenderTitle'),
        },
        (buttonIndex) => {
          if (buttonIndex < GENDER_OPTIONS.length) {
            handleInputChange('gender', GENDER_OPTIONS[buttonIndex].id);
          }
        }
      );
    } else {
      setShowGenderModal(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) {
      AppAlert.alert(t('profile.editProfile.errors.userIdNotFoundTitle'), t('profile.editProfile.errors.userIdNotFoundMessage'));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileForm)
        .eq('id', userId);

      if (error) {
        throw error;
      }

      AppAlert.alert(t('profile.editProfile.success.title'), t('profile.editProfile.success.message'));
      router.back();
    } catch (error: any) {
      AppAlert.alert(t('profile.editProfile.errors.saveProfileTitle'), error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const parseCurrentDate = (): Date => {
    if (profileForm.birth_date) {
      const parsed = new Date(profileForm.birth_date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date(2000, 0, 1);
  };

  const selectedGenderOption = GENDER_OPTIONS.find((option) => option.id === profileForm.gender);
  const genderDisplayValue = selectedGenderOption ? t(selectedGenderOption.labelKey) : profileForm.gender;

  if (isLoading) {
    return (
      <PremiumScreen style={[styles.loaderContainer, { backgroundColor: theme.colors.background }]}>
        <PremiumLoader label={t('profile.editProfile.loadingProfile')} />
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <SectionHeader title={t('profile.editProfile.title')} style={styles.sectionHeaderOverride} />
        </View>

        {/* Form Body Scroll Arena */}
        <Animated.View style={styles.animatedFormBody} entering={FadeIn.duration(450).easing(Easing.out(Easing.cubic))}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Section 1: Profile Information Card */}
          <View style={styles.sectionBlock}>
            <SectionTitle withBottomMargin>{t('profile.editProfile.sectionProfileIdentity')}</SectionTitle>
            <View style={[styles.formGroupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
              <PremiumInput
                label={t('profile.editProfile.usernameLabel')}
                value={profileForm.username}
                onChangeText={(text) => handleInputChange('username', text)}
                placeholder={t('profile.editProfile.usernamePlaceholder')}
                style={styles.inputSpacingOverride}
              />
            </View>
          </View>

          {/* Section 2: Personal Information Card */}
          <View style={styles.sectionBlock}>
            <SectionTitle withBottomMargin>{t('profile.editProfile.sectionPersonalDetails')}</SectionTitle>
            <View style={[styles.formGroupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>

              {/* Premium Styled Interactor for Birth Date */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
                style={styles.inputSpacing}
              >
                <View pointerEvents="none">
                  <PremiumInput
                    label={t('profile.editProfile.birthDateLabel')}
                    value={profileForm.birth_date}
                    placeholder={t('profile.editProfile.birthDatePlaceholder')}
                    editable={false}
                  />
                </View>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} style={styles.fieldEmbedIcon} />
              </TouchableOpacity>

              <View style={[styles.rowDividerSeparator, { backgroundColor: theme.colors.divider }]} />

              {/* Premium Styled Interactor for Gender */}
              <TouchableOpacity
                onPress={handleGenderPress}
                activeOpacity={0.8}
                style={styles.inputSpacingOverride}
              >
                <View pointerEvents="none">
                  <PremiumInput
                    label={t('profile.editProfile.genderLabel')}
                    value={genderDisplayValue}
                    placeholder={t('profile.editProfile.genderPlaceholder')}
                    editable={false}
                  />
                </View>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} style={styles.fieldEmbedIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </Animated.View>

        {/* Inline Native Picker Render Strategy */}
        {showDatePicker && (
          <DateTimePicker
            value={parseCurrentDate()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Premium Android-Friendly Dropdown Sheet Fallback */}
        <Modal
          visible={showGenderModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGenderModal(false)}
        >
          {/* Modal backdrop stays fixed regardless of theme, matching PremiumModal's convention */}
          <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
            <View style={styles.modalOverlayContainer}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContentCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
                  <Text style={[styles.modalTitleText, { color: theme.colors.textPrimary }]}>{t('profile.editProfile.selectGenderTitle')}</Text>
                  {GENDER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.modalOptionRow, { borderColor: theme.colors.background }]}
                      onPress={() => {
                        handleInputChange('gender', option.id);
                        setShowGenderModal(false);
                      }}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        { color: theme.colors.textSecondary },
                        profileForm.gender === option.id && { color: theme.colors.textPrimary, fontWeight: '500' }
                      ]}>
                        {t(option.labelKey)}
                      </Text>
                      {profileForm.gender === option.id && (
                        <Ionicons name="checkmark" size={18} color={theme.colors.textPrimary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Fixed Save Button Infrastructure with Custom Design Token Requirements */}
        <View style={[styles.saveButtonContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.divider }]}>
          <TouchableOpacity
            onPress={handleSaveProfile}
            activeOpacity={0.85}
            disabled={isSaving}
            style={[
              styles.customPremiumButton,
              { backgroundColor: theme.colors.accent },
              isSaving && styles.customPremiumButtonDisabled
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.accentForeground} />
            ) : (
              <Text style={[styles.customPremiumButtonText, { color: theme.colors.accentForeground }]}>{t('profile.editProfile.saveChanges')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedFormBody: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140, // Keeps content well above the floating dock layout boundary
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 28,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
    marginTop: 2,
  },
  sectionHeaderOverride: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  sectionBlock: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  formGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  inputSpacing: {
    position: 'relative',
    marginBottom: 12,
  },
  inputSpacingOverride: {
    position: 'relative',
    marginBottom: 12,
  },
  fieldEmbedIcon: {
    position: 'absolute',
    right: 12,
    bottom: 24, // Vertically metrics centered perfectly within standard Vyra custom inputs
  },
  rowDividerSeparator: {
    height: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  customPremiumButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPremiumButtonDisabled: {
    opacity: 0.5,
  },
  customPremiumButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2, // Subtle tracking reduction to pair seamlessly with Vyra headers
  },
  modalOverlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.2)', // Vyra custom soft dark premium overlay tint
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContentCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '400',
  },
});
