import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

export default function OnboardingIndexRoot() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const handleImmediateTelemetricRoutingEvaluation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/auth/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (profile?.onboarding_completed) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/onboarding/welcome');
        }
      } catch (err) {
        router.replace('/auth/login');
      }
    };

    handleImmediateTelemetricRoutingEvaluation();
  }, []);

  return (
    <PremiumScreen style={[styles.centerLayoutBox, { backgroundColor: theme.colors.background }]}>
      <PremiumLoader label={t('onboarding.index.loadingLabel')} />
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  centerLayoutBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});