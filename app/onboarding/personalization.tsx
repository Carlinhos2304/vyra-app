import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';

// React Native Reanimated 3
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

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

// Luxury calibration spring physics
const PREMIUM_SPRING = {
  damping: 18,
  stiffness: 100,
  mass: 0.8,
};

const CHIP_SPRING = {
  damping: 15,
  stiffness: 120,
};

// ==========================================
// Sub-Components to handle hooks safely
// ==========================================

interface StyleChipProps {
  styleName: string;
  isActive: boolean;
  onPress: () => void;
}

function StyleChip({ styleName, isActive, onPress }: StyleChipProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.97, CHIP_SPRING))}
        onPressOut={() => (scale.value = withSpring(1, CHIP_SPRING))}
        onPress={onPress}
        style={[styles.chipSelectionItem, isActive && styles.chipSelectionItemActive]}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{styleName}</Text>
      </Pressable>
    </Animated.View>
  );
}

interface ColorCircleProps {
  colorName: string;
  hex?: string;
  isSelected: boolean;
  onPress: () => void;
}

function ColorCircle({ colorName, hex, isSelected, onPress }: ColorCircleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.95, CHIP_SPRING))}
        onPressOut={() => (scale.value = withSpring(1, CHIP_SPRING))}
        onPress={onPress}
        style={[
          styles.colorCircleOuterBorder,
          isSelected && styles.colorCircleOuterBorderActive
        ]}
      >
        <View
          style={[
            styles.colorCircleInnerFill,
            hex ? { backgroundColor: hex } : undefined
          ]}
        />
      </Pressable>
    </Animated.View>
  );
}

interface ClimateChipProps {
  climateName: string;
  isActive: boolean;
  onPress: () => void;
}

function ClimateChip({ climateName, isActive, onPress }: ClimateChipProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.97, CHIP_SPRING))}
        onPressOut={() => (scale.value = withSpring(1, CHIP_SPRING))}
        onPress={onPress}
        style={[styles.chipSelectionItem, isActive && styles.chipSelectionItemActive]}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{climateName}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ==========================================
// Main Personalization Screen
// ==========================================

export default function PersonalizationScreen() {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedClimate, setSelectedClimate] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- Animation Shared Values ---
  const headingOpacity = useSharedValue(0);
  const headingTranslateY = useSharedValue(20);

  const styleSecOpacity = useSharedValue(0);
  const styleSecTranslateY = useSharedValue(20);

  const colorSecOpacity = useSharedValue(0);
  const colorSecTranslateY = useSharedValue(20);

  const climateSecOpacity = useSharedValue(0);
  const climateSecTranslateY = useSharedValue(20);

  const notifySecOpacity = useSharedValue(0);
  const notifySecTranslateY = useSharedValue(20);

  const footerOpacity = useSharedValue(0);
  const footerTranslateY = useSharedValue(30);
  const buttonPressScale = useSharedValue(1);

  // Staggered Entrance on Mount
  useEffect(() => {
    headingOpacity.value = withTiming(1, { duration: 600 });
    headingTranslateY.value = withSpring(0, PREMIUM_SPRING);

    styleSecOpacity.value = withDelay(150, withTiming(1, { duration: 600 }));
    styleSecTranslateY.value = withDelay(150, withSpring(0, PREMIUM_SPRING));

    colorSecOpacity.value = withDelay(250, withTiming(1, { duration: 600 }));
    colorSecTranslateY.value = withDelay(250, withSpring(0, PREMIUM_SPRING));

    climateSecOpacity.value = withDelay(350, withTiming(1, { duration: 600 }));
    climateSecTranslateY.value = withDelay(350, withSpring(0, PREMIUM_SPRING));

    notifySecOpacity.value = withDelay(450, withTiming(1, { duration: 600 }));
    notifySecTranslateY.value = withDelay(450, withSpring(0, PREMIUM_SPRING));

    footerOpacity.value = withDelay(550, withTiming(1, { duration: 600 }));
    footerTranslateY.value = withDelay(550, withSpring(0, PREMIUM_SPRING));
  }, []);

  // --- Animated Styles ---
  const animatedHeadingStyle = useAnimatedStyle(() => ({
    opacity: headingOpacity.value,
    transform: [{ translateY: headingTranslateY.value }],
  }));

  const animatedStyleSecStyle = useAnimatedStyle(() => ({
    opacity: styleSecOpacity.value,
    transform: [{ translateY: styleSecTranslateY.value }],
  }));

  const animatedColorSecStyle = useAnimatedStyle(() => ({
    opacity: colorSecOpacity.value,
    transform: [{ translateY: colorSecTranslateY.value }],
  }));

  const animatedClimateSecStyle = useAnimatedStyle(() => ({
    opacity: climateSecOpacity.value,
    transform: [{ translateY: climateSecTranslateY.value }],
  }));

  const animatedNotifySecStyle = useAnimatedStyle(() => ({
    opacity: notifySecOpacity.value,
    transform: [{ translateY: notifySecTranslateY.value }],
  }));

  const animatedFooterStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [
      { translateY: footerTranslateY.value },
      { scale: buttonPressScale.value },
    ],
  }));

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

  // ✅ SAFE CONDITIONAL RETURN
  // Placed down here so React executes all above top-level hooks without skipping.
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
          
          {/* MAIN HEADING */}
          <Animated.View style={animatedHeadingStyle}>
            <Text style={styles.formMainHeading}>Let's personalize your wardrobe.</Text>
          </Animated.View>
          
          {/* SECTION 1: STYLE CONFIGURATION MATRIX */}
          <Animated.View style={[styles.formSection, animatedStyleSecStyle]}>
            <SectionTitle withBottomMargin>Favorite Style</SectionTitle>
            <View style={styles.gridContainerRow}>
              {STYLE_OPTIONS.map(style => (
                <StyleChip
                  key={style}
                  styleName={style}
                  isActive={selectedStyle === style}
                  onPress={() => setSelectedStyle(style)}
                />
              ))}
            </View>
          </Animated.View>

          {/* SECTION 2: COLOR CONFIGURATION CIRCLES */}
          <Animated.View style={[styles.formSection, animatedColorSecStyle]}>
            <SectionTitle withBottomMargin>Favorite Colors</SectionTitle>
            <View style={styles.colorsSelectionRow}>
              {COLOR_OPTIONS.map(color => (
                <ColorCircle
                  key={color.name}
                  colorName={color.name}
                  hex={color.hex}
                  isSelected={selectedColors.includes(color.name)}
                  onPress={() => toggleColorSelection(color.name)}
                />
              ))}
            </View>
          </Animated.View>

          {/* SECTION 3: CLIMATE */}
          <Animated.View style={[styles.formSection, animatedClimateSecStyle]}>
            <SectionTitle withBottomMargin>Climate Zone</SectionTitle>
            <View style={styles.gridContainerRow}>
              {CLIMATE_OPTIONS.map(climate => (
                <ClimateChip
                  key={climate}
                  climateName={climate}
                  isActive={selectedClimate === climate}
                  onPress={() => setSelectedClimate(climate)}
                />
              ))}
            </View>
          </Animated.View>

          {/* SECTION 4: NOTIFICATIONS */}
          <Animated.View style={[styles.formSection, styles.toggleRowSpace, animatedNotifySecStyle]}>
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
          </Animated.View>

        </ScrollView>

        {/* STICKY FOOTER */}
        <Animated.View style={[styles.stickyFooterActionButton, animatedFooterStyle]}>
          <Pressable
            onPressIn={() => (buttonPressScale.value = withSpring(0.96, { damping: 12, stiffness: 150 }))}
            onPressOut={() => (buttonPressScale.value = withSpring(1, PREMIUM_SPRING))}
            onPress={handleSavePreferences}
            style={styles.primaryPremiumButton}
          >
            <Text style={styles.primaryButtonText}>Save Preferences</Text>
          </Pressable>
        </Animated.View>
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