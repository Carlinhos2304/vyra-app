/**
 * OutfitGarmentsCollage
 * ============================================================================
 * Whering-style outfit card visual: instead of showing only the outfit's
 * first garment (what every outfit card used before this), tiles up to 4 of
 * the outfit's own garment photos into one collage so an outfit is
 * recognizable at a glance from its card, not just its name/occasion badge.
 *
 * Works best (and is meant to be used) with garment photos that already have
 * their background removed (see supabase/functions/remove-background and
 * lib/services/aiService.removeGarmentBackground) — every tile sits on a
 * white background already, so the thin white gutters between tiles read as
 * intentional spacing rather than a mismatched seam. A garment saved before
 * that feature existed (still on its original photo background) still
 * renders fine, just without that seamless look.
 *
 * Layout rules, chosen to match how Whering's own outfit grid reads:
 *   1 garment  -> single full-bleed tile
 *   2 garments -> two side-by-side tiles
 *   3 garments -> one tall tile + two stacked tiles
 *   4+ garments -> a 2x2 grid; a 5th+ garment collapses into a "+N" badge
 *                  over the 4th tile rather than growing the grid further,
 *                  keeping every card the same shape in a list.
 *
 * Pure presentation component — takes an already-ordered array of image URLs
 * and has no idea where they came from (outfits, outfit_items, whatever the
 * caller's query shape is), so it's reusable from any outfit card (Closet's
 * Outfits tab today; Home's Today's Outfit card or the Calendar day-summary
 * card are natural future callers if the same single-image limitation is
 * worth fixing there too).
 */

import React from 'react';
import { View, Image, StyleSheet, Text, ViewStyle } from 'react-native';

interface OutfitGarmentsCollageProps {
  /** Garment photo URLs, in the outfit's own order. Falsy entries are
   * dropped defensively — a garment with no image should never blank out an
   * entire tile. */
  images: (string | null | undefined)[];
  /** Sizes/positions the collage within its parent — the parent is expected
   * to already have a fixed width/height (see closet.tsx's `imageWrapper`),
   * this just fills it. */
  style?: ViewStyle;
  /** Divider color between tiles. Defaults to white since every garment
   * photo is itself flattened onto a white background — a white gutter
   * disappears into them naturally regardless of the active theme. */
  gutterColor?: string;
}

const MAX_VISIBLE_TILES = 4;
const GUTTER_SIZE = 2;

export function OutfitGarmentsCollage({ images, style, gutterColor = '#FFFFFF' }: OutfitGarmentsCollageProps) {
  const cleanImages = images.filter((uri): uri is string => !!uri);
  const visible = cleanImages.slice(0, MAX_VISIBLE_TILES);
  const overflowCount = cleanImages.length - visible.length;

  if (visible.length === 0) return null;

  const gutterV = { width: GUTTER_SIZE, backgroundColor: gutterColor };
  const gutterH = { height: GUTTER_SIZE, backgroundColor: gutterColor };

  if (visible.length === 1) {
    return (
      <View style={[styles.container, style]}>
        <Image source={{ uri: visible[0] }} style={styles.tileImage} />
      </View>
    );
  }

  if (visible.length === 2) {
    return (
      <View style={[styles.container, styles.row, style]}>
        <View style={styles.tile}>
          <Image source={{ uri: visible[0] }} style={styles.tileImage} />
        </View>
        <View style={gutterV} />
        <View style={styles.tile}>
          <Image source={{ uri: visible[1] }} style={styles.tileImage} />
        </View>
      </View>
    );
  }

  if (visible.length === 3) {
    return (
      <View style={[styles.container, styles.row, style]}>
        <View style={styles.tile}>
          <Image source={{ uri: visible[0] }} style={styles.tileImage} />
        </View>
        <View style={gutterV} />
        <View style={styles.tile}>
          <View style={styles.tile}>
            <Image source={{ uri: visible[1] }} style={styles.tileImage} />
          </View>
          <View style={gutterH} />
          <View style={styles.tile}>
            <Image source={{ uri: visible[2] }} style={styles.tileImage} />
          </View>
        </View>
      </View>
    );
  }

  // 4 or more — fixed 2x2 grid, extras roll up into a "+N" badge on tile 4.
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.row, styles.flexOne]}>
        <View style={styles.tile}>
          <Image source={{ uri: visible[0] }} style={styles.tileImage} />
        </View>
        <View style={gutterV} />
        <View style={styles.tile}>
          <Image source={{ uri: visible[1] }} style={styles.tileImage} />
        </View>
      </View>
      <View style={gutterH} />
      <View style={[styles.row, styles.flexOne]}>
        <View style={styles.tile}>
          <Image source={{ uri: visible[2] }} style={styles.tileImage} />
        </View>
        <View style={gutterV} />
        <View style={styles.tile}>
          <Image source={{ uri: visible[3] }} style={styles.tileImage} />
          {overflowCount > 0 && (
            <View style={styles.overflowOverlay}>
              <Text style={styles.overflowText}>+{overflowCount}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', overflow: 'hidden' },
  row: { flexDirection: 'row', width: '100%', height: '100%' },
  flexOne: { flex: 1 },
  // Fixed white (not theme-dependent): garment cutouts are transparent PNGs
  // now (see supabase/functions/remove-background), so each tile needs its
  // own opaque backdrop or a dark theme would show through the margins
  // around a non-rectangular garment silhouette.
  tile: { flex: 1, position: 'relative', backgroundColor: '#FFFFFF' },
  tileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  overflowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 25, 23, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: { color: '#FAFAF9', fontSize: 16, fontWeight: '700' },
});
