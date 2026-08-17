import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { AppAlert } from '../../lib/ui/appAlert';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumButton } from '../../components/ui/PremiumButton';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { PremiumScoreBar } from '../../components/ui/PremiumScoreBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import { MOTION } from '../../constants/motion';
import { generateOutfits, AIAnalysisError, OutfitSuggestion } from '../../lib/services/aiService';
import { getClothingItemsByIds } from '../../lib/services/clothingServices';
import { saveOutfit, planOutfitForToday, SaveOutfitError } from '../../lib/services/outfitService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;
const CARD_GAP = 16;

// Matches the "EXPERIENCE" spec's checklist copy verbatim. Labels are
// resolved via t(`outfitAi.generateOutfit.steps.${key}`) at render time.
const GENERATION_STEPS = [
  { key: 'wardrobe' },
  { key: 'style' },
  { key: 'colors' },
  { key: 'combinations' },
];
const STEP_INTERVAL_MS = 900;
// Small pause after the AI resolves so the final checkmark is visible before
// the screen transitions to results — a deliberate, tiny beat, not a delay tactic.
const COMPLETION_SETTLE_MS = 450;

// Reanimated's withTiming() requires a worklet-compatible easing function.
// MOTION.curves.* is built with react-native's own Easing (for the classic
// Animated API used elsewhere, e.g. PremiumModal.tsx) and isn't
// worklet-compatible — using it here throws "the easing function is not a
// worklet" at runtime. Same bezier coefficients as MOTION.curves.premiumEaseOut,
// just constructed via reanimated's own Easing so it actually works inside
// withTiming. MOTION.timings (plain numbers) are still reused as-is.
const PREMIUM_EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);

type Phase = 'loading' | 'results' | 'empty' | 'error';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function GenerationStepRow({
  label,
  status,
}: {
  label: string;
  status: 'pending' | 'active' | 'done';
}) {
  const { theme } = useTheme();
  const opacity = useSharedValue(status === 'pending' ? 0.35 : 1);

  useEffect(() => {
    opacity.value = withTiming(status === 'pending' ? 0.35 : 1, {
      duration: MOTION.timings.subtle,
      easing: PREMIUM_EASE_OUT,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const rowStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const isFilled = status === 'active' || status === 'done';

  return (
    <Animated.View style={[styles.stepRow, rowStyle]}>
      <View
        style={[
          styles.stepIndicator,
          { borderColor: theme.colors.border },
          isFilled && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
        ]}
      >
        {status === 'done' && <Feather name="check" size={11} color={theme.colors.accentForeground} />}
      </View>
      <Text
        style={[
          styles.stepLabel,
          { color: status === 'pending' ? theme.colors.textTertiary : theme.colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

export default function GenerateOutfitScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ occasion?: string | string[]; forToday?: string | string[] }>();
  const occasionParam = Array.isArray(params.occasion) ? params.occasion[0] : params.occasion;
  // No occasion picker exists yet in this flow (the Home entry point is a
  // single tap) — defaulting to "Casual" here, called out in the delivery
  // summary as an explicit assumption rather than a silent choice.
  const occasion = occasionParam || 'Casual';

  // Set when Home's "Regenerate" (on the Today's Outfit card) opened this
  // screen — saving an outfit then also assigns it to today via
  // planOutfitForToday(), instead of just adding it to the wardrobe's outfit list.
  const forTodayParam = Array.isArray(params.forToday) ? params.forToday[0] : params.forToday;
  const forToday = forTodayParam === '1';

  const [phase, setPhase] = useState<Phase>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [generationKey, setGenerationKey] = useState(0);

  const [garmentsById, setGarmentsById] = useState<Record<string, any>>({});
  const [savedOutfitIds, setSavedOutfitIds] = useState<Record<number, string>>({});
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // --- Drives the AI call. Uses generateOutfits() exclusively — no
  // duplicated request logic, no direct provider/Edge Function calls here. ---
  useEffect(() => {
    let cancelled = false;
    let stepTimer: ReturnType<typeof setInterval> | null = null;

    async function run() {
      setPhase('loading');
      setStepIndex(0);
      setErrorMessage('');

      stepTimer = setInterval(() => {
        setStepIndex((i) => Math.min(i + 1, GENERATION_STEPS.length - 1));
      }, STEP_INTERVAL_MS);

      try {
        const results = await generateOutfits(occasion, null);
        if (cancelled) return;

        if (stepTimer) clearInterval(stepTimer);
        setStepIndex(GENERATION_STEPS.length);
        await sleep(COMPLETION_SETTLE_MS);
        if (cancelled) return;

        setOutfits(results);
        setPhase(results.length > 0 ? 'results' : 'empty');
      } catch (err) {
        if (cancelled) return;
        if (stepTimer) clearInterval(stepTimer);
        const message = err instanceof AIAnalysisError ? err.message : t('outfitAi.generateOutfit.error.genericMessage');
        setErrorMessage(message);
        setPhase('error');
      }
    }

    run();

    return () => {
      cancelled = true;
      if (stepTimer) clearInterval(stepTimer);
    };
  }, [generationKey, occasion]);

  // --- Resolves visual garment data for whichever ids the AI referenced,
  // once we actually have results — via the existing wardrobe table, never
  // client-invented data. ---
  useEffect(() => {
    if (phase !== 'results' || outfits.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const allIds = Array.from(new Set(outfits.flatMap((o) => o.clothing_item_ids)));
        const items = await getClothingItemsByIds(allIds);
        if (cancelled) return;
        const map: Record<string, any> = {};
        (items || []).forEach((item: any) => {
          map[item.id] = item;
        });
        setGarmentsById(map);
      } catch (err) {
        console.error('[generate-outfit screen] failed to load garment details:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, outfits]);

  const handleRegenerate = () => {
    setOutfits([]);
    setGarmentsById({});
    setSavedOutfitIds({});
    setActiveCardIndex(0);
    setGenerationKey((k) => k + 1);
  };

  const handleSave = async (outfit: OutfitSuggestion, index: number) => {
    if (busyIndex !== null || savedOutfitIds[index]) return;
    try {
      setBusyIndex(index);
      const newOutfitId = await saveOutfit({
        name: outfit.title,
        occasion,
        clothingItemIds: outfit.clothing_item_ids,
        confidence: outfit.confidence,
        scores: outfit.scores,
      });
      setSavedOutfitIds((prev) => ({ ...prev, [index]: newOutfitId }));

      if (forToday) {
        // Came from Home's "Regenerate" on the Today's Outfit card — assign
        // this outfit to today, then hand control back to Home (whose
        // useTodayOutfit hook re-fetches on focus and will pick it up).
        await planOutfitForToday(newOutfitId);
        setTimeout(() => router.back(), 900);
      }
    } catch (err) {
      const message = err instanceof SaveOutfitError ? err.message : t('outfitAi.generateOutfit.alerts.saveFailedMessage');
      AppAlert.alert(t('outfitAi.generateOutfit.alerts.saveFailedTitle'), message);
    } finally {
      setBusyIndex(null);
    }
  };

  const handleSchedule = async (outfit: OutfitSuggestion, index: number) => {
    if (busyIndex !== null) return;
    try {
      let outfitId = savedOutfitIds[index];
      if (!outfitId) {
        setBusyIndex(index);
        outfitId = await saveOutfit({
          name: outfit.title,
          occasion,
          clothingItemIds: outfit.clothing_item_ids,
        });
        setSavedOutfitIds((prev) => ({ ...prev, [index]: outfitId }));
      }
      // There's no existing "schedule this exact outfit" entry point — the
      // calendar flow works the other way (pick a date, then an outfit).
      // Saving it here and handing off to /calendar (rather than altering
      // that flow) keeps this additive, per "no cambies innecesarios".
      router.push('/calendar');
    } catch (err) {
      const message = err instanceof SaveOutfitError ? err.message : t('outfitAi.generateOutfit.alerts.saveFailedMessage');
      AppAlert.alert(t('outfitAi.generateOutfit.alerts.saveFailedTitle'), message);
    } finally {
      setBusyIndex(null);
    }
  };

  const handleCarouselScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    setActiveCardIndex(Math.max(0, Math.min(outfits.length - 1, index)));
  };

  return (
    <PremiumScreen>
      <View style={styles.navigationRow}>
        <PremiumTouchable style={styles.backTouchTarget} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={theme.colors.textPrimary} />
        </PremiumTouchable>
        <SectionHeader
          title={t('outfitAi.generateOutfit.header.title')}
          subtitle={t('outfitAi.generateOutfit.header.subtitle', { occasion })}
          style={styles.headerBindingFix}
        />
      </View>

      {phase === 'loading' && (
        <Animated.View entering={FadeIn.duration(500)} style={styles.centerPhaseContainer}>
          <Animated.View
            entering={FadeInDown.duration(600).easing(Easing.out(Easing.cubic))}
            style={[styles.loadingIconCircle, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}
          >
            <Ionicons name="sparkles" size={26} color={theme.colors.accent} />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.duration(600).delay(60).easing(Easing.out(Easing.cubic))}
            style={[styles.loadingTitle, { color: theme.colors.textPrimary }]}
          >
            {t('outfitAi.generateOutfit.loading.title')}
          </Animated.Text>

          <View style={styles.stepsList}>
            {GENERATION_STEPS.map((step, index) => (
              <GenerationStepRow
                key={step.key}
                label={t(`outfitAi.generateOutfit.steps.${step.key}`)}
                status={index < stepIndex ? 'done' : index === stepIndex ? 'active' : 'pending'}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {phase === 'empty' && (
        <Animated.View entering={FadeIn.duration(500)} style={styles.centerPhaseContainer}>
          <Ionicons name="shirt-outline" size={32} color={theme.colors.textTertiary} />
          <Text style={[styles.phaseTitle, { color: theme.colors.textPrimary }]}>{t('outfitAi.generateOutfit.empty.title')}</Text>
          <Text style={[styles.phaseSubtitle, { color: theme.colors.textSecondary }]}>
            {t('outfitAi.generateOutfit.empty.message', { occasion })}
          </Text>
          <PremiumButton label={t('outfitAi.generateOutfit.actions.generateAgain')} onPress={handleRegenerate} style={styles.phaseActionButton} />
        </Animated.View>
      )}

      {phase === 'error' && (
        <Animated.View entering={FadeIn.duration(500)} style={styles.centerPhaseContainer}>
          <Ionicons name="alert-circle-outline" size={28} color={theme.colors.textSecondary} />
          <Text style={[styles.phaseTitle, { color: theme.colors.textPrimary }]}>{t('outfitAi.generateOutfit.error.title')}</Text>
          <Text style={[styles.phaseSubtitle, { color: theme.colors.textSecondary }]}>{errorMessage}</Text>
          <PremiumButton label={t('outfitAi.generateOutfit.actions.tryAgain')} onPress={handleRegenerate} style={styles.phaseActionButton} />
        </Animated.View>
      )}

      {phase === 'results' && (
        <View style={styles.resultsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            onMomentumScrollEnd={handleCarouselScrollEnd}
          >
            {outfits.map((outfit, index) => {
              const isSaved = !!savedOutfitIds[index];
              const isBusy = busyIndex === index;

              return (
                <Animated.View
                  key={`outfit-${index}`}
                  entering={FadeInDown.duration(500).delay(index * 70).easing(Easing.out(Easing.cubic))}
                  style={[
                    styles.outfitCard,
                    { width: CARD_WIDTH, backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View>
                    <View style={styles.outfitCardHeader}>
                      <Text style={[styles.outfitTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                        {outfit.title}
                      </Text>
                      <View style={[styles.confidenceBadge, { backgroundColor: theme.colors.accent }]}>
                        <Text style={[styles.confidenceBadgeText, { color: theme.colors.accentForeground }]}>
                          {Math.round(outfit.confidence * 100)}%
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.outfitReasoning, { color: theme.colors.textSecondary }]} numberOfLines={4}>
                      {outfit.reasoning}
                    </Text>

                    <View style={styles.garmentsRow}>
                      {outfit.clothing_item_ids.map((id) => {
                        const garment = garmentsById[id];
                        return (
                          <View
                            key={id}
                            style={[
                              styles.garmentThumb,
                              { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
                            ]}
                          >
                            {garment?.image_url ? (
                              <Image source={{ uri: garment.image_url }} style={styles.garmentThumbImage} />
                            ) : (
                              <View style={styles.garmentThumbFallback}>
                                <MaterialCommunityIcons name="hanger" size={16} color={theme.colors.textTertiary} />
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    <View style={styles.scoresBlock}>
                      <PremiumScoreBar label={t('outfitAi.generateOutfit.scores.styleMatch')} value={outfit.scores.styleMatch} delay={0} />
                      <PremiumScoreBar
                        label={t('outfitAi.generateOutfit.scores.weatherSuitability')}
                        value={outfit.scores.weatherSuitability}
                        delay={MOTION.timings.stagger}
                      />
                      <PremiumScoreBar
                        label={t('outfitAi.generateOutfit.scores.occasionFit')}
                        value={outfit.scores.occasionFit}
                        delay={MOTION.timings.stagger * 2}
                      />
                      <PremiumScoreBar
                        label={t('outfitAi.generateOutfit.scores.colorHarmony')}
                        value={outfit.scores.colorHarmony}
                        delay={MOTION.timings.stagger * 3}
                      />
                    </View>
                  </View>

                  <View style={styles.actionsBlock}>
                    <PremiumButton
                      label={
                        isSaved
                          ? forToday
                            ? t('outfitAi.generateOutfit.actions.setForToday')
                            : t('outfitAi.generateOutfit.actions.saved')
                          : isBusy
                          ? t('outfitAi.generateOutfit.actions.saving')
                          : forToday
                          ? t('outfitAi.generateOutfit.actions.setAsTodaysOutfit')
                          : t('outfitAi.generateOutfit.actions.saveOutfit')
                      }
                      onPress={() => handleSave(outfit, index)}
                      disabled={isSaved || isBusy}
                      style={styles.saveButton}
                    />
                    <View style={styles.secondaryActionsRow}>
                      <PremiumTouchable
                        style={[styles.secondaryActionButton, { borderColor: theme.colors.border }]}
                        onPress={() => handleSchedule(outfit, index)}
                        disabled={isBusy}
                      >
                        <Text style={[styles.secondaryActionText, { color: theme.colors.textPrimary }]}>{t('outfitAi.generateOutfit.actions.schedule')}</Text>
                      </PremiumTouchable>
                      <PremiumTouchable
                        style={[styles.secondaryActionButton, { borderColor: theme.colors.border }]}
                        onPress={handleRegenerate}
                        disabled={isBusy}
                      >
                        <Text style={[styles.secondaryActionText, { color: theme.colors.textPrimary }]}>
                          {t('outfitAi.generateOutfit.actions.generateAgain')}
                        </Text>
                      </PremiumTouchable>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>

          {outfits.length > 1 && (
            <View style={styles.dotsRow}>
              {outfits.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: theme.colors.border },
                    i === activeCardIndex && { backgroundColor: theme.colors.accent, width: 16 },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backTouchTarget: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerBindingFix: {
    marginLeft: 4,
    flex: 1,
  },
  centerPhaseContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: -0.2,
    marginBottom: 32,
  },
  stepsList: {
    width: '100%',
    gap: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  phaseSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  phaseActionButton: {
    marginTop: 24,
    width: 200,
  },
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: CARD_GAP,
  },
  outfitCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  outfitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  outfitTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  confidenceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  outfitReasoning: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  garmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  garmentThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  garmentThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  garmentThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoresBlock: {
    marginTop: 20,
  },
  actionsBlock: {
    marginTop: 14,
  },
  saveButton: {
    marginTop: 0,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  secondaryActionButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
