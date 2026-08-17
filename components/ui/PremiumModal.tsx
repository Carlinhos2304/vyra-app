import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Pressable, Modal, Dimensions } from 'react-native';
import { MOTION } from '../../constants/motion';
import { useTheme } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PremiumModalProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isVisible, onClose, children }) => {
  const { theme } = useTheme();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(40)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: MOTION.timings.subtle,
          easing: MOTION.curves.premiumEaseOut,
          useNativeDriver: true,
        }),
        Animated.timing(panelTranslateY, {
          toValue: 0,
          duration: MOTION.timings.panel,
          easing: MOTION.curves.premiumEaseOut,
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 1,
          duration: MOTION.timings.subtle,
          easing: MOTION.curves.premiumEaseOut,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: MOTION.timings.micro,
          easing: MOTION.curves.panelExit,
          useNativeDriver: true,
        }),
        Animated.timing(panelTranslateY, {
          toValue: 30,
          duration: MOTION.timings.micro,
          easing: MOTION.curves.panelExit,
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 0,
          duration: MOTION.timings.micro,
          easing: MOTION.curves.panelExit,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.fullscreenOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { backgroundColor: theme.colors.overlay, opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.modalContentCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
              opacity: panelOpacity,
              transform: [{ translateY: panelTranslateY }]
            }
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContentCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 6,
  },
});