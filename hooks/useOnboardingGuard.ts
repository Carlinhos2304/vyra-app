import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export function useOnboardingGuard() {
  const router = useRouter();

  const evaluateSessionRouteState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (error || !profile || !profile.onboarding_completed) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      router.replace('/auth/login');
    }
  };

  return { evaluateSessionRouteState };
}