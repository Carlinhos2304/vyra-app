import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';

const { width } = Dimensions.get('window');

export default function AiPreviewScreen() {
  const router = useRouter();

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.illustrationFrame}>
          <View style={styles.abstractCanvasGraphic}>
            <MaterialCommunityIcons name={"sparkles" as any} size={54} color="#1C1917" />
            <Text style={styles.comingSoonBadge}>COMING SOON</Text>
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.editorialTitleText}>AI Stylist</Text>
          <Text style={styles.editorialSubtitleText}>
            Future personalized recommendations will analyze your wardrobe, weather conditions, style aesthetics, favorite colors, and calendar schedules to curate optimal styles.
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <PremiumTouchable 
            style={styles.primaryPremiumButton}
            activeOpacity={0.85}
            onPress={() => router.push('/onboarding/personalization')}
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
    position: 'relative',
  },
  comingSoonBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#1C1917',
    color: '#FAFAF9',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 1,
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
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
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