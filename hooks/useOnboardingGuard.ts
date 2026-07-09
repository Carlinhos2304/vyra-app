import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function useOnboardingGuard() {
  const router = useRouter();

  const evaluateSessionRouteState = async () => {
    try {
      console.log('GUARD START');

      const { data: { user } } = await supabase.auth.getUser();

      console.log('USER:', user?.id);

      if (!user) {
        console.log('GO LOGIN');
        router.replace('/auth/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      console.log('PROFILE:', profile);
      console.log('ERROR:', error);

      if (error || !profile || !profile.onboarding_completed) {
        console.log('GO ONBOARDING');
        router.replace('/onboarding');
      } else {
        console.log('GO HOME');
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      console.log('CATCH', err);
      router.replace('/auth/login');
    }
  };

  useEffect(() => {
    evaluateSessionRouteState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { evaluateSessionRouteState };
}