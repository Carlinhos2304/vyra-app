import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';

const { width } = Dimensions.get('window');

export default function PlannerScreen() {
  const router = useRouter();

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.illustrationFrame}>
          <View style={styles.abstractCanvasGraphic}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={64} color="#1C1917" />
            <View style={styles.accentOrnamentLine} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.editorialTitleText}>Plan what to wear</Text>
          <Text style={styles.editorialSubtitleText}>
            Schedule outfits directly from your calendar.
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <PremiumTouchable 
            style={styles.primaryPremiumButton}
            activeOpacity={0.85}
            onPress={() => router.push('/onboarding/ai-preview')}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
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
    position: 'relative',
  },
  accentOrnamentLine: {
    position: 'absolute',
    bottom: 24,
    width: 32,
    height: 2,
    backgroundColor: '#1C1917',
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