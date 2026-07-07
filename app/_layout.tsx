import { Stack } from "expo-router";
import { supabase } from '../lib/supabase';
import { useEffect } from "react";


export default function Layout() {
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
  return <Stack screenOptions={{ headerShown: false }} />;
}