/**
 * EventOutfitAssignment — Smart Planner spec item 4 (Smart Outfit
 * Assignment per event), built entirely on useEventOutfitAssignment (which
 * itself only calls the EXISTING aiService.generateOutfits +
 * outfitService — no new AI system, see that hook's header comment).
 *
 * States:
 *  - Already assigned: shows the assigned outfit card ("Saved Outfit" once
 *    persisted, regardless of whether it came from AI or a manual pick —
 *    the distinction the spec draws between "Generated"/"Saved" is about
 *    HOW it got picked, not a permanent label) with "View Look" / "Change
 *    Outfit".
 *  - Nothing assigned yet: a "Recommended Outfit" CTA (calls generate() —
 *    deliberately NOT auto-fired on mount, so opening an event never
 *    silently spends an AI call) plus "Choose from Saved Looks". Once
 *    suggestions come back they render as "Generated Outfit" cards with
 *    each one's AI reasoning (AIEventTip) and a "Generate Again" action.
 */

import React from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PremiumTouchable } from '../ui/PremiumTouchable';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import type { PlannerEvent } from '../../lib/services/plannerTypes';
import { useEventOutfitAssignment, type EventWeatherHint } from '../../hooks/planner/useEventOutfitAssignment';
import { AIEventTip } from './AIEventTip';

interface EventOutfitAssignmentProps {
  event: PlannerEvent;
  weatherHint: EventWeatherHint | null;
  onAssigned: () => void;
}

export function EventOutfitAssignment({ event, weatherHint, onAssigned }: EventOutfitAssignmentProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const { status, suggestions, errorMessage, generate, assignGenerated } = useEventOutfitAssignment(
    event.id,
    event.category,
    weatherHint,
    onAssigned
  );

  const outfitItems = event.outfits?.outfit_items || [];
  const coverImage = outfitItems.length > 0 && outfitItems[0].clothing_items ? outfitItems[0].clothing_items.image_url : null;

  if (event.outfit_id && event.outfits) {
    return (
      <View>
        <PremiumTouchable
          style={[styles.assignedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: event.outfit_id! } })}
        >
          <View style={[styles.coverContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImage} />
            ) : (
              <MaterialCommunityIcons name="hanger" size={22} color={theme.colors.textTertiary} />
            )}
          </View>
          <View style={styles.assignedInfo}>
            <Text style={[styles.assignedName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {event.outfits.name}
            </Text>
            {event.outfits.ai_confidence != null && (
              <Text style={[styles.confidenceText, { color: theme.colors.textSecondary }]}>
                {t('planner.smartPlanner.outfitAssignment.confidenceLabel', { percent: Math.round(event.outfits.ai_confidence * 100) })}
              </Text>
            )}
          </View>
        </PremiumTouchable>
        <PremiumTouchable
          style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
          onPress={() => router.push({ pathname: '/planner/select-outfit', params: { eventId: event.id } })}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>{t('planner.smartPlanner.outfitAssignment.change')}</Text>
        </PremiumTouchable>
      </View>
    );
  }

  return (
    <View>
      {status === 'idle' && (
        <View style={styles.ctaRow}>
          <PremiumTouchable style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]} onPress={generate}>
            <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>
              {t('planner.smartPlanner.outfitAssignment.recommended')}
            </Text>
          </PremiumTouchable>
          <PremiumTouchable
            style={[styles.secondaryButton, { borderColor: theme.colors.border, flex: 1 }]}
            onPress={() => router.push({ pathname: '/planner/select-outfit', params: { eventId: event.id } })}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
              {t('planner.smartPlanner.outfitAssignment.chooseSaved')}
            </Text>
          </PremiumTouchable>
        </View>
      )}

      {status === 'generating' && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.textPrimary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t('planner.smartPlanner.outfitAssignment.generating')}</Text>
        </View>
      )}

      {status === 'error' && errorMessage && (
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errorMessage}</Text>
      )}

      {(status === 'ready' || status === 'assigning') && suggestions.length === 0 && (
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>{t('planner.smartPlanner.outfitAssignment.noSuggestions')}</Text>
      )}

      {(status === 'ready' || status === 'assigning') &&
        suggestions.map((suggestion, index) => (
          <View key={index} style={[styles.suggestionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.suggestionHeaderRow}>
              <Text style={[styles.suggestionLabel, { color: theme.colors.textTertiary }]}>
                {t('planner.smartPlanner.outfitAssignment.generated')}
              </Text>
              <Text style={[styles.confidenceText, { color: theme.colors.textSecondary }]}>
                {t('planner.smartPlanner.outfitAssignment.confidenceLabel', { percent: Math.round(suggestion.confidence * 100) })}
              </Text>
            </View>
            <Text style={[styles.suggestionTitle, { color: theme.colors.textPrimary }]}>{suggestion.title}</Text>
            <AIEventTip reasoning={suggestion.reasoning} />
            <PremiumTouchable
              style={[styles.primaryButton, { backgroundColor: theme.colors.accent, marginTop: 10 }]}
              onPress={() => assignGenerated(suggestion)}
              disabled={status === 'assigning'}
            >
              {status === 'assigning' ? (
                <ActivityIndicator size="small" color={theme.colors.accentForeground} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>{t('planner.eventDetails.selectOutfitButton')}</Text>
              )}
            </PremiumTouchable>
          </View>
        ))}

      {(status === 'ready' || status === 'error') && (
        <PremiumTouchable style={[styles.secondaryButton, { borderColor: theme.colors.border }]} onPress={generate}>
          <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
            {t('planner.smartPlanner.outfitAssignment.generateAgain')}
          </Text>
        </PremiumTouchable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  assignedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 8 },
  coverContainer: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  assignedInfo: { flex: 1, gap: 2 },
  assignedName: { fontSize: 14, fontWeight: '600' },
  confidenceText: { fontSize: 11 },
  ctaRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flex: 1 },
  primaryButtonText: { fontSize: 13, fontWeight: '600' },
  secondaryButton: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 8 },
  secondaryButtonText: { fontSize: 13, fontWeight: '500' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  loadingText: { fontSize: 13 },
  errorText: { fontSize: 13, paddingVertical: 8 },
  suggestionCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  suggestionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suggestionLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  suggestionTitle: { fontSize: 15, fontWeight: '600' },
});
