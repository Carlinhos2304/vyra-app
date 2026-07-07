import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import VyraLogo from '../../components/branding/VyraLogo';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.brandContainer}>
          <View style={styles.logoScaleWrapper}>
            <VyraLogo />
          </View>
          <Text style={styles.brandTitleText}>Welcome to Vyra</Text>
          <Text style={styles.brandSubtitleText}>
            Organize your wardrobe effortlessly.
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <PremiumTouchable 
            style={styles.primaryPremiumButton}
            activeOpacity={0.85}
            onPress={() => router.push('/onboarding/features')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
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
  brandContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoScaleWrapper: {
    transform: [{ scale: 1.6 }],
    marginBottom: 32,
  },
  brandTitleText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#1C1917',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  brandSubtitleText: {
    fontSize: 15,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
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