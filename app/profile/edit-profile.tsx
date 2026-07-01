import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Alert, 
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

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PremiumInput } from '../../components/ui/PremiumInput';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { SectionTitle } from '../../components/ui/SectionTitle';

import { supabase } from '../../lib/supabase';

interface UserProfileFormState {
  username: string;
  birth_date: string;
  gender: string;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function EditProfileScreen() {
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
          throw new Error('User not authenticated.');
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
        Alert.alert('Error loading profile', error.message);
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
          options: [...GENDER_OPTIONS, 'Cancel'],
          cancelButtonIndex: GENDER_OPTIONS.length,
          title: 'Select Gender',
        },
        (buttonIndex) => {
          if (buttonIndex < GENDER_OPTIONS.length) {
            handleInputChange('gender', GENDER_OPTIONS[buttonIndex]);
          }
        }
      );
    } else {
      setShowGenderModal(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found.');
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

      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error saving profile', error.message);
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

  if (isLoading) {
    return (
      <PremiumScreen style={styles.loaderContainer}>
        <PremiumLoader label="Loading profile..." />
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#1C1917" />
          </TouchableOpacity>
          <SectionHeader title="Edit Profile" style={styles.sectionHeaderOverride} />
        </View>

        {/* Form Body Scroll Arena */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Section 1: Profile Information Card */}
          <View style={styles.sectionBlock}>
            <SectionTitle withBottomMargin>Profile identity</SectionTitle>
            <View style={styles.formGroupCard}>
              <PremiumInput
                label="Username"
                value={profileForm.username}
                onChangeText={(text) => handleInputChange('username', text)}
                placeholder="Enter your username"
                style={styles.inputSpacingOverride}
              />
            </View>
          </View>

          {/* Section 2: Personal Information Card */}
          <View style={styles.sectionBlock}>
            <SectionTitle withBottomMargin>Personal details</SectionTitle>
            <View style={styles.formGroupCard}>
              
              {/* Premium Styled Interactor for Birth Date */}
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)} 
                activeOpacity={0.8}
                style={styles.inputSpacing}
              >
                <View pointerEvents="none">
                  <PremiumInput
                    label="Birth Date"
                    value={profileForm.birth_date}
                    placeholder="Select your birth date"
                    editable={false}
                  />
                </View>
                <Ionicons name="calendar-outline" size={18} color="#78716C" style={styles.fieldEmbedIcon} />
              </TouchableOpacity>
              
              <View style={styles.rowDividerSeparator} />

              {/* Premium Styled Interactor for Gender */}
              <TouchableOpacity 
                onPress={handleGenderPress} 
                activeOpacity={0.8}
                style={styles.inputSpacingOverride}
              >
                <View pointerEvents="none">
                  <PremiumInput
                    label="Gender"
                    value={profileForm.gender}
                    placeholder="Select your gender"
                    editable={false}
                  />
                </View>
                <Ionicons name="chevron-down" size={18} color="#78716C" style={styles.fieldEmbedIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

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
          <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
            <View style={styles.modalOverlayContainer}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContentCard}>
                  <Text style={styles.modalTitleText}>Select Gender</Text>
                  {GENDER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.modalOptionRow}
                      onPress={() => {
                        handleInputChange('gender', option);
                        setShowGenderModal(false);
                      }}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        profileForm.gender === option && styles.modalOptionTextSelected
                      ]}>
                        {option}
                      </Text>
                      {profileForm.gender === option && (
                        <Ionicons name="checkmark" size={18} color="#1C1917" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Fixed Save Button Infrastructure with Custom Design Token Requirements */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            onPress={handleSaveProfile}
            activeOpacity={0.85}
            disabled={isSaving}
            style={[
              styles.customPremiumButton,
              isSaving && styles.customPremiumButtonDisabled
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FAFAF9" />
            ) : (
              <Text style={styles.customPremiumButtonText}>Save Changes</Text>
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
    backgroundColor: '#FAFAF9',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    overflow: 'hidden',
    shadowColor: '#000000',
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
    backgroundColor: '#F5F5F4',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: '#F5F5F4',
  },
  customPremiumButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#1C1917',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPremiumButtonDisabled: {
    opacity: 0.5,
  },
  customPremiumButtonText: {
    color: '#FAFAF9',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#FAFAF9',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#78716C',
    fontWeight: '400',
  },
  modalOptionTextSelected: {
    color: '#1C1917',
    fontWeight: '500',
  },
});