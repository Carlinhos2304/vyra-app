import { supabase } from '../supabase';

export const getClothingItems = async () => {
  const { data, error } = await supabase
    .from('clothing_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data;
};

/**
 * Resolves a set of clothing_items ids (e.g. an AI outfit suggestion's
 * clothing_item_ids) into full rows with visual/display data. RLS already
 * scopes this to the caller's own rows; ids are also always real ids from
 * the caller's own wardrobe (enforced server-side by generate-outfit), so no
 * extra ownership filter is needed here beyond what RLS provides.
 */
export const getClothingItemsByIds = async (ids: string[]) => {
  if (!ids || ids.length === 0) return [];

  const { data, error } = await supabase
    .from('clothing_items')
    .select('*')
    .in('id', ids);

  if (error) throw error;

  return data;
};