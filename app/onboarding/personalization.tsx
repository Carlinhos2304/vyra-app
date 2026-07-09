import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';

const STYLE_OPTIONS = ['Casual', 'Minimal', 'Streetwear', 'Elegant', 'Sport', 'Old Money', 'Vintage', 'Business'];
const COLOR_OPTIONS = [
  { name: 'Monochrome', hex: '#1C1917' },
  { name: 'Warm Stone', hex: '#E7E5E4' },
  { name: 'Sage Green', hex: '#87986A' },
  { name: 'Navy Ocean', hex: '#1E3A8A' },
  { name: 'Crimson', hex: '#991B1B' },
  { name: 'Camel Tan', hex: '#C2410C' }
];
const CLIMATE_OPTIONS = ['Mostly Hot', 'Mixed', 'Mostly Cold'];

export default function PersonalizationScreen() {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedClimate, setSelectedClimate] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleColorSelection = (colorName: string) => {
    setSelectedColors(prev => 
      prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]
    );
  };

  const handleSavePreferences = async () => {
    if (!selectedStyle || selectedColors.length === 0 || !selectedClimate) {
      Alert.alert('Personalization Partial', 'Please select style, climate and at least one core color.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unassigned identity context tracking coordinates.');

      const { error } = await supabase
        .from('profiles')
        .update({
          favorite_style: selectedStyle,
          favorite_colors: selectedColors,
          climate: selectedClimate,
          notifications_enabled: notificationsEnabled
        })
        .eq('id', user.id);

      if (error) throw error;
      router.push('/onboarding/first-garment');
    } catch (err: any) {
      Alert.alert('Sync Fault', err.message || 'Could not serialize setup matrices to public profiles endpoints.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <PremiumScreen style={styles.centerBox}>
        <PremiumLoader label="Serializing curation attributes..." />
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.rootContainer} edges={['top', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          
          <Text style={styles.formMainHeading}>Let's personalize your wardrobe.</Text>
          
          {/* SECTION 1: STYLE CONFIGURATION MATRIX */}
          <View style={styles.formSection}>
            <SectionTitle withBottomMargin>Favorite Style</SectionTitle>
            <View style={styles.gridContainerRow}>
              {STYLE_OPTIONS.map(style => {
                const isActive = selectedStyle === style;
                return (
                  <PremiumTouchable
                    key={style}
                    style={[styles.chipSelectionItem, isActive && styles.chipSelectionItemActive]}
                    onPress={() => setSelectedStyle(style)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{style}</Text>
                  </PremiumTouchable>
                );
              })}
            </View>
          </View>

          {/* SECTION 2: COLOR CONFIGURATION CIRCLES */}
          <View style={styles.formSection}>
            <SectionTitle withBottomMargin>Favorite Colors</SectionTitle>
            <View style={styles.colorsSelectionRow}>
              {COLOR_OPTIONS.map(color => {
                const isSelected = selectedColors.includes(color.name);
                return (
                  <PremiumTouchable
                    key={color.name}
                    style={[
                      styles.colorCircleOuterBorder,
                      isSelected && styles.colorCircleOuterBorderActive
                    ]}
                    onPress={() => toggleColorSelection(color.name)}
                  >
                    <View
                      style={[
                        styles.colorCircleInnerFill,
                        // Use hex when available; otherwise don't add an extra style to avoid TS errors
                        color.hex ? { backgroundColor: color.hex } : undefined
                      ]}
                    />
                  </PremiumTouchable>
                );
              })}
            </View>
          </View>

          {/* SECTION 3: CLIMATE */}
          <View style={styles.formSection}>
            <SectionTitle withBottomMargin>Climate Zone</SectionTitle>
            <View style={styles.gridContainerRow}>
              {CLIMATE_OPTIONS.map(climate => {
                const isActive = selectedClimate === climate;
                return (
                  <PremiumTouchable
                    key={climate}
                    style={[styles.chipSelectionItem, isActive && styles.chipSelectionItemActive]}
                    onPress={() => setSelectedClimate(climate)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{climate}</Text>
                  </PremiumTouchable>
                );
              })}
            </View>
          </View>

          {/* SECTION 4: NOTIFICATIONS */}
          <View style={[styles.formSection, styles.toggleRowSpace]}>
            <View style={styles.toggleTextLeftColumn}>
              <Text style={styles.toggleMainLabelText}>Outfit Reminders</Text>
              <Text style={styles.toggleSubLabelText}>Receive premium styling schedule updates.</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D6D3D1', true: '#1C1917' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D6D3D1"
            />
          </View>

        </ScrollView>

        <View style={styles.stickyFooterActionButton}>
          <PremiumTouchable 
            style={styles.primaryPremiumButton}
            activeOpacity={0.85}
            onPress={handleSavePreferences}
          >
            <Text style={styles.primaryButtonText}>Save Preferences</Text>
          </PremiumTouchable>
        </View>
      </SafeAreaView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollPadding: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },
  formMainHeading: {
    fontSize: 26,
    fontWeight: '300',
    color: '#1C1917',
    letterSpacing: -0.5,
    marginBottom: 32,
  },
  formSection: {
    marginBottom: 32,
  },
  gridContainerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipSelectionItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelectionItemActive: {
    backgroundColor: '#1C1917',
    borderColor: '#1C1917',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#44403C',
  },
  chipTextActive: {
    color: '#FAFAF9',
  },
  colorsSelectionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  colorCircleOuterBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleOuterBorderActive: {
    borderColor: '#1C1917',
  },
  colorCircleInnerFill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  stoneBg: {
    backgroundColor: '#E7E5E4',
  },
  toggleRowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  toggleTextLeftColumn: {
    flex: 1,
    paddingRight: 16,
  },
  toggleMainLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1917',
    marginBottom: 2,
  },
  toggleSubLabelText: {
    fontSize: 12,
    color: '#78716C',
  },
  stickyFooterActionButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: '#F5F5F4',
  },
  primaryPremiumButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#1C1917',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FAFAF9',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});