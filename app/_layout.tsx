import { Stack } from "expo-router";
import { supabase } from '../lib/supabase';
import { useEffect } from "react";

useEffect(() => {
  const testConnection = async () => {
    const { data, error } = await supabase
      .from('clothing_items')
      .select('*');

    console.log('DATA:', data);
    console.log('ERROR:', error);
  };

  testConnection();
}, []);
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}