import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function FirstGarmentScreen() {
  const router = useRouter();
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  const completeOnboardingAndNavigateToCreation = async () => {
    try {
      setIsFinalizing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session authentication missing context parameters.');

      // Commit isolation completion tag tracking metrics securely
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) throw error;

      // Deep link router directly to existing piece catalog configuration form parameters
      router.replace('/clothing/add-garment');
    } catch (err: any) {
      Alert.alert('Finalization Blocked', err.message || 'Could not close out sequence safely.');
      setIsFinalizing(false);
    }
  };

  if (isFinalizing) {
    return (
      <PremiumScreen style={styles.centerBox}>
        <PremiumLoader label="Committing archival access parameters..." />
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.illustrationFrame}>
          <View style={styles.abstractCanvasGraphic}>
            <MaterialCommunityIcons name="plus-box-outline" size={64} color="#1C1917" />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.editorialTitleText}>Let's build your wardrobe</Text>
          <Text style={styles.editorialSubtitleText}>
            Start by adding your first garment.
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <PremiumTouchable 
            style={styles.primaryPremiumButton}
            activeOpacity={0.85}
            onPress={completeOnboardingAndNavigateToCreation}
          >
            <Text style={styles.primaryButtonText}>Add First Garment</Text>
          </PremiumTouchable>
        </View>
      </SafeAreaView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationFrame: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  abstractCanvasGraphic: {
    width: width * 0.5,
    aspectRatio: 1,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  textContainer: {
    paddingHorizontal: 12,
    marginBottom: 40,
  },
  editorialTitleText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1C1917',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  editorialSubtitleText: {
    fontSize: 14,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  actionContainer: {
    paddingBottom: 24,
    width: '100%',
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