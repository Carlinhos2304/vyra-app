/**
 * eventCategories.ts
 *
 * Single source of truth for the Planner's event category vocabulary.
 * Previously this exact 7-item array (`['Work', 'Formal', 'Casual', 'Party',
 * 'Travel', 'Sport', 'Other']`) was declared independently in
 * create-event.tsx and event-details.tsx — identical, but duplicated, the
 * same pattern garmentTaxonomy.ts already fixed for garment vocabularies.
 * Centralizing it here means both screens (and any future one, e.g. the
 * Smart Planner's calendar indicators) always agree on the same categories.
 *
 * IMPORTANT: This is a UI-facing vocabulary, not a database enum — the
 * `events.category` column stores these labels as free text, same as before.
 * Display labels are localized via i18n (`planner.createEvent.categories.*`
 * / `planner.eventDetails.categories.*`); this file only owns the canonical
 * English values used as keys/DB values and their icon/AI-occasion mapping.
 */

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { OutfitOccasion } from './garmentTaxonomy';

export const EVENT_CATEGORIES = ['Work', 'Formal', 'Casual', 'Party', 'Travel', 'Sport', 'Other'] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Icon shown on calendar day cells / timeline entries for each category —
 * purely decorative, no behavioral meaning. */
export const EVENT_CATEGORY_ICONS: Record<EventCategory, IoniconName> = {
  Work: 'briefcase-outline',
  Formal: 'shirt-outline',
  Casual: 'cafe-outline',
  Party: 'sparkles-outline',
  Travel: 'airplane-outline',
  Sport: 'basketball-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};

/**
 * Maps an event category to the closest OUTFIT_OCCASIONS value (see
 * garmentTaxonomy.ts) so the Smart Planner's AI Outfit Assignment can call
 * the EXISTING generate-outfit Edge Function (via aiService.generateOutfits)
 * without inventing a parallel occasion vocabulary or a new AI system —
 * satisfies the "reuse existing AI infrastructure" constraint. The two
 * vocabularies describe different things (an event's nature vs. a garment
 * or outfit's occasion) and evolved separately, so this is a deliberate,
 * documented best-fit mapping rather than a 1:1 rename.
 */
export const EVENT_CATEGORY_TO_OUTFIT_OCCASION: Record<EventCategory, OutfitOccasion> = {
  Work: 'Business Casual',
  Formal: 'Formal',
  Casual: 'Casual',
  Party: 'Night Out',
  Travel: 'Vacation',
  Sport: 'Sporty',
  Other: 'Special Event',
};

/** Categories treated as "important" for the Upcoming Preparations /
 * unprepared-event conflict heuristics (item 7 and 8 of the Smart Planner
 * spec) — an unassigned outfit on one of these within the prep window is
 * worth surfacing; a Casual/Other event isn't. */
export const IMPORTANT_EVENT_CATEGORIES: readonly EventCategory[] = ['Work', 'Formal', 'Party'];
