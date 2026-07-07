import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import VyraLogo from '../components/branding/VyraLogo';
import { PremiumLoader } from '../components/ui/PremiumLoader'; // Adjust path based on your exact file architecture

const { height } = Dimensions.get('window');

export default function SplashScreen() {
  // Shared structural values for perfectly unified timing transitions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const containerTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    // Single synchronized animation execution sequence mimicking Apple/Celine OS layouts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(containerTranslateY, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/');
    },2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, containerTranslateY]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative architectural layout details to fill negative space beautifully without clutter */}
      <View style={styles.topAccentLine} />
      
      <Animated.View 
        style={[
          styles.contentFrame,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: containerTranslateY }
            ]
          }
        ]}
      >
        {/* Isolated Logo Container creating an integrated macro scale block relationship */}
        <View style={styles.logoWrapper}>
          <VyraLogo size={64} isDark={true} />
        </View>

        {/* Typography Content Wrapper */}
        <View style={styles.textContainer}>
          <Text style={styles.brandTitleText}>VYRA</Text>
          <View style={styles.separatorDot} />
          <Text style={styles.brandSubtitleText}>DIGITAL WARDROBE</Text>
        </View>

        {/* Reusable Premium Loader integrated seamlessly into the layout layout block */}
        <View style={styles.loaderWrapper}>
          <PremiumLoader label="PREPARING EXPERIENCE" />
        </View>
      </Animated.View>

      {/* Editorial fine-print baseline footer for a balanced composition layout */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>CHILE</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1917', // Strict adherence to global background design tokens: --primary
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topAccentLine: {
    width: 32,
    height: 1,
    backgroundColor: '#78716C',
    opacity: 0.15,
    marginTop: height * 0.05,
  },
  contentFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    // Geometric structural layout centering offset framework
    bottom: height * 0.02,
  },
  logoWrapper: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleText: {
    fontSize: 26,
    fontWeight: '300',
    color: '#FAFAF9', // Strictly inherits global token parameters: --primary-foreground
    letterSpacing: 12, // Distinct typographic kerning signature for luxury labels
    textAlign: 'center',
    marginLeft: 12, // Mathematically offsets the trailing letterSpacing boundary parameter
  },
  separatorDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#78716C',
    marginVertical: 14,
    opacity: 0.4,
  },
  brandSubtitleText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#A8A29E', // Aligned with secondary structural muted text limits
    letterSpacing: 4,
    textAlign: 'center',
    marginLeft: 4, // Mathematically offsets trailing letterSpacing tracking parameters
    opacity: 0.7,
  },
  loaderWrapper: {
    marginTop: 48, // Balanced white space break separating brand and structural load activity
    height: 60,   // Explicit container bounding to completely avoid content popping shifts
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerContainer: {
    marginBottom: height * 0.05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 9,
    fontWeight: '400',
    color: '#78716C', // Corresponds cleanly to structural metadata boundaries
    letterSpacing: 3,
    opacity: 0.5,
    textAlign: 'center',
  },
});