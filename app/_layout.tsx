import { Stack } from "expo-router";
import { supabase } from '../lib/supabase';
import { useEffect } from "react";

useEffect(() => {
  const testConnection = async () => {
    const { data, error } = await supabase
      .from('clothing_items')
      .select('*');

    // test the connection by logging the data or error
    if (error) {
      console.error('Error connecting to Supabase:', error);
    } else {
      console.log('Successfully connected to Supabase. Data:');
    }
  };

  testConnection();
}, []);
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}