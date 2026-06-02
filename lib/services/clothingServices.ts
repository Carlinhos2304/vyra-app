import { supabase } from '../supabase';

export const getClothingItems = async () => {
  const { data, error } = await supabase
    .from('clothing_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data;
};