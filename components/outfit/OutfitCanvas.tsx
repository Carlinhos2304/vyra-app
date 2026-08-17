/**
 * OutfitCanvas
 * ============================================================================
 * The redesigned "Create Outfit" screen's centerpiece (app/(tabs)/create.tsx)
 * — a freeform lienzo where every selected garment renders as a draggable
 * cutout, stacked so the user can see how pieces actually look combined
 * (Daily-app-style) instead of picking from an abstract list. Deliberately
 * simple interaction, per the user's own scope decision: drag to reposition
 * and reorder (picking a piece up brings it to the front) — no
 * pinch-to-resize, no rotation.
 *
 * Requires garment photos with real transparency (a genuine alpha channel)
 * to look right — see supabase/functions/remove-background/index.ts, which
 * was switched from a solid-white flattened JPG to a transparent PNG
 * specifically to make this component possible: stacking opaque white
 * rectangles would just hide whatever's underneath instead of showing
 * garments layered together. Garments saved before that change still render
 * (Image just shows their original background), they just won't look as
 * clean stacked here.
 *
 * Positions are normalized (0.0-1.0 fractions of canvas width/height, see
 * lib/services/outfitCanvasLayout.ts), not raw pixels, so a layout saved on
 * one device's screen renders correctly on any other.
 *
 * This component itself never touches Supabase or persists anything — it's
 * purely a controlled presentation + gesture layer. The caller (create.tsx)
 * owns the position map, decides default positions for new garments, and
 * writes the final positions to outfit_items on save.
 */

import React, { useCallback, useState } from 'react';
import { View, Image, StyleSheet, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { OutfitCanvasPosition } from '../../lib/services/outfitCanvasLayout';

export interface OutfitCanvasItem {
  id: string;
  image_url: string | null;
  category: string;
}

interface OutfitCanvasProps {
  items: OutfitCanvasItem[];
  positions: Record<string, OutfitCanvasPosition>;
  /** Called (with normalized 0.0-1.0 coordinates) when a drag ends — the
   * caller commits this to its position map. */
  onPositionChange: (id: string, x: number, y: number) => void;
  /** Called the moment a drag starts, so the caller can bump that garment's
   * zIndex to the front before the drag itself begins. */
  onDragStart: (id: string) => void;
  onRemove: (id: string) => void;
  emptyLabel: string;
  /** Canvas height — width is always the parent's full available width. */
  height: number;
  /** Fixed bounding box each garment cutout is drawn within (resizeMode
   * "contain", so the garment's real proportions are never cropped or
   * stretched — matters much more here than in a grid thumbnail, since the
   * whole point is comparing silhouettes). */
  tileSize: number;
  backgroundColor: string;
}

export function OutfitCanvas({
  items,
  positions,
  onPositionChange,
  onDragStart,
  onRemove,
  emptyLabel,
  height,
  tileSize,
  backgroundColor,
}: OutfitCanvasProps) {
  const [canvasWidth, setCanvasWidth] = useState(0);

  const handleLayout = useCallback((event: any) => {
    setCanvasWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View style={[styles.canvas, { height, backgroundColor }]} onLayout={handleLayout}>
      {items.length === 0 && (
        <View style={styles.emptyState} pointerEvents="none">
          <MaterialCommunityIcons name="layers-triple-outline" size={32} color="#A8A29E" />
          <Text style={styles.emptyStateText}>{emptyLabel}</Text>
        </View>
      )}

      {canvasWidth > 0 &&
        items.map((item) => {
          const position = positions[item.id] ?? { x: 0.5, y: 0.5, zIndex: 1 };
          return (
            <OutfitCanvasTile
              key={item.id}
              item={item}
              position={position}
              canvasWidth={canvasWidth}
              canvasHeight={height}
              tileSize={tileSize}
              onDragStart={() => onDragStart(item.id)}
              onDragEnd={(x, y) => onPositionChange(item.id, x, y)}
              onRemove={() => onRemove(item.id)}
            />
          );
        })}
    </View>
  );
}

interface OutfitCanvasTileProps {
  item: OutfitCanvasItem;
  position: OutfitCanvasPosition;
  canvasWidth: number;
  canvasHeight: number;
  tileSize: number;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  onRemove: () => void;
}

function OutfitCanvasTile({
  item,
  position,
  canvasWidth,
  canvasHeight,
  tileSize,
  onDragStart,
  onDragEnd,
  onRemove,
}: OutfitCanvasTileProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Top-left corner of the tile's bounding box for its CURRENT committed
  // (normalized) position — the drag gesture below adds a live translate on
  // top of this while the finger is down, then folds it back into a new
  // normalized position on release (see onEnd).
  const baseLeft = position.x * canvasWidth - tileSize / 2;
  const baseTop = position.y * canvasHeight - tileSize / 2;

  // Half a tile is allowed to hang off any edge — garments partially
  // overlapping the canvas boundary (e.g. a shoe half-cropped at the bottom)
  // reads as an intentional "flat lay" composition, not a bug, and fully
  // clamping to stay inside would make the canvas feel smaller than it is.
  const minLeft = -tileSize / 2;
  const maxLeft = canvasWidth - tileSize / 2;
  const minTop = -tileSize / 2;
  const maxTop = canvasHeight - tileSize / 2;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const rawLeft = baseLeft + event.translationX;
      const rawTop = baseTop + event.translationY;
      const clampedLeft = Math.min(Math.max(rawLeft, minLeft), maxLeft);
      const clampedTop = Math.min(Math.max(rawTop, minTop), maxTop);

      const nextX = (clampedLeft + tileSize / 2) / canvasWidth;
      const nextY = (clampedTop + tileSize / 2) / canvasHeight;

      translateX.value = 0;
      translateY.value = 0;
      runOnJS(onDragEnd)(nextX, nextY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    // The transform + absolute positioning live on this OUTER Animated.View
    // so the remove badge below travels together with the image during a
    // drag. The GestureDetector only wraps the inner image area, not this
    // whole tile — that leaves the remove badge outside the pan gesture's
    // hit region entirely, so tapping it reaches the plain Pressable instead
    // of being swallowed by the drag recognizer.
    <Animated.View
      style={[
        styles.tile,
        {
          width: tileSize,
          height: tileSize,
          left: baseLeft,
          top: baseTop,
          zIndex: position.zIndex,
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={panGesture}>
        <View style={styles.tileImageArea}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.tileImage} />
          ) : (
            <View style={styles.tileFallback}>
              <MaterialCommunityIcons name="hanger" size={22} color="#78716C" />
            </View>
          )}
        </View>
      </GestureDetector>

      <Pressable onPress={onRemove} style={styles.removeBadge} hitSlop={8}>
        <Ionicons name="close" size={11} color="#FAFAF9" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    color: '#78716C',
  },
  tile: {
    position: 'absolute',
  },
  tileImageArea: {
    width: '100%',
    height: '100%',
  },
  tileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  tileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(28, 25, 23, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
