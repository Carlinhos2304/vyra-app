import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { CalendarDayCell, type CalendarDayCellModel } from '../../components/planner/CalendarDayCell';
import { DaySummaryCard } from '../../components/planner/DaySummaryCard';
import { DayTimeline } from '../../components/planner/DayTimeline';
import { ConflictCard } from '../../components/planner/ConflictCard';
import { UpcomingPreparations } from '../../components/planner/UpcomingPreparations';
import { PlannerQuickActions } from '../../components/planner/PlannerQuickActions';
import { usePlannerCalendarData } from '../../hooks/planner/usePlannerCalendarData';
import { useDaySummary } from '../../hooks/planner/useDaySummary';
import { useDayTimeline } from '../../hooks/planner/useDayTimeline';
import { usePlannerConflicts } from '../../hooks/planner/usePlannerConflicts';
import { useUpcomingPreparations } from '../../hooks/planner/useUpcomingPreparations';
import { useWeather } from '../../hooks/useWeather';
import { useTabBarClearance } from '../../hooks/useTabBarClearance';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

function getLocalTodayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function generateWeeklyTrackSequence(pivot: Date, localizedWeekDays: string[]): CalendarDayCellModel[] {
  const trackingDay = new Date(pivot);
  const dayOfWeek = trackingDay.getDay();
  const numericDistanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  trackingDay.setDate(trackingDay.getDate() - numericDistanceToMonday);

  return Array.from({ length: 7 }).map((_, idx) => {
    const dailyInstance = new Date(trackingDay);
    if (idx > 0) dailyInstance.setDate(dailyInstance.getDate() + idx);
    const isoKey = `${dailyInstance.getFullYear()}-${String(dailyInstance.getMonth() + 1).padStart(2, '0')}-${String(dailyInstance.getDate()).padStart(2, '0')}`;
    return { isoString: isoKey, dayNameLabel: localizedWeekDays[idx], dayNumberLabel: String(dailyInstance.getDate()) };
  });
}

export default function CalendarScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const tabBarClearance = useTabBarClearance();
  const { t } = useLanguage();

  const [currentPivotDate, setCurrentPivotDate] = useState<Date>(new Date());
  const [selectedDateISO, setSelectedDateISO] = useState<string>(getLocalTodayISODate());
  const todayLocalISO = getLocalTodayISODate();

  // Week change animation
  const weekListAnim = useSharedValue(1);
  const weekChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fixed: the original version never cleared this timeout on unmount — if
  // the user navigated away mid-transition, the callback still fired
  // against an unmounted screen's state setter.
  useEffect(() => {
    return () => {
      if (weekChangeTimeoutRef.current) clearTimeout(weekChangeTimeoutRef.current);
    };
  }, []);

  const handleWeekChange = (direction: number) => {
    weekListAnim.value = 0;
    if (weekChangeTimeoutRef.current) clearTimeout(weekChangeTimeoutRef.current);
    weekChangeTimeoutRef.current = setTimeout(() => {
      setCurrentPivotDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + direction * 7);
        return next;
      });
      weekListAnim.value = withTiming(1, { duration: 300 });
    }, 150);
  };

  const animatedWeekStyle = useAnimatedStyle(() => ({
    opacity: weekListAnim.value,
    transform: [{ scale: 0.98 + weekListAnim.value * 0.02 }],
  }));

  const entranceAnim = useSharedValue(0);
  useEffect(() => {
    entranceAnim.value = withTiming(1, { duration: 600 });
  }, []);
  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: (1 - entranceAnim.value) * 20 }],
  }));

  const localizedWeekDays = [
    t('tabs.calendar.days.mon'),
    t('tabs.calendar.days.tue'),
    t('tabs.calendar.days.wed'),
    t('tabs.calendar.days.thu'),
    t('tabs.calendar.days.fri'),
    t('tabs.calendar.days.sat'),
    t('tabs.calendar.days.sun'),
  ];
  const activeWeekMatrix = generateWeeklyTrackSequence(currentPivotDate, localizedWeekDays);
  const weekDates = activeWeekMatrix.map((d) => d.isoString);

  const { isLoading, error, weekPlans, weekEventDates, selectedDayEvents, upcomingEvents } = usePlannerCalendarData(
    weekDates,
    selectedDateISO
  );
  const { current: currentWeather, forecast } = useWeather();

  const activePlanInstance = weekPlans[selectedDateISO];
  const daySummary = useDaySummary(selectedDayEvents, activePlanInstance ?? null, selectedDateISO === todayLocalISO, currentWeather);
  const { timed, untimed } = useDayTimeline(selectedDayEvents);
  const conflicts = usePlannerConflicts(upcomingEvents, forecast, todayLocalISO);
  const preparations = useUpcomingPreparations(upcomingEvents, todayLocalISO);

  const formattedMonthHeaderLabel = currentPivotDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const forecastDateSet = new Set(forecast.filter((f) => f.chanceOfRainPercent !== null && f.chanceOfRainPercent >= 60).map((f) => f.date));
  const conflictDateByEventId = new Map(upcomingEvents.map((ev) => [ev.id, ev.event_date]));
  const conflictDates = new Set(conflicts.map((c) => conflictDateByEventId.get(c.eventId)).filter(Boolean) as string[]);

  return (
    <PremiumScreen>
      <Animated.View style={[{ flex: 1 }, animatedScreenStyle]}>
        {isLoading ? (
          <View style={styles.centeredStateFrame}>
            <PremiumLoader label={t('tabs.calendar.loading')} />
          </View>
        ) : (
          <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollLayout, { paddingBottom: 32 + tabBarClearance }]}>
            <View style={styles.headerStack}>
              <View style={styles.headerTopRow}>
                <SectionHeader title={t('tabs.calendar.title')} subtitle={formattedMonthHeaderLabel} style={styles.headerFlexOverride} />
                <PremiumTouchable
                  style={[styles.addButtonCircle, { backgroundColor: theme.colors.accent }]}
                  onPress={() => router.push({ pathname: '/planner/create-event', params: { date: selectedDateISO } })}
                >
                  <MaterialCommunityIcons name="plus" size={24} color={theme.colors.accentForeground} />
                </PremiumTouchable>
              </View>

              {error && (
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
              )}

              <View style={[styles.calendarControlStrip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.stripHeader}>
                  <SectionTitle>{t('tabs.calendar.thisWeek')}</SectionTitle>
                  <View style={styles.chevronControls}>
                    <PremiumTouchable style={[styles.chevronInlineButton, { backgroundColor: theme.colors.surfaceSecondary }]} onPress={() => handleWeekChange(-1)}>
                      <MaterialCommunityIcons name="chevron-left" size={16} color={theme.colors.textPrimary} />
                    </PremiumTouchable>
                    <PremiumTouchable style={[styles.chevronInlineButton, { backgroundColor: theme.colors.surfaceSecondary }]} onPress={() => handleWeekChange(1)}>
                      <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.textPrimary} />
                    </PremiumTouchable>
                  </View>
                </View>

                <Animated.View style={[styles.daysRowLayout, animatedWeekStyle]}>
                  {activeWeekMatrix.map((day) => (
                    <View key={day.isoString} style={styles.dayCellWrapper}>
                      <CalendarDayCell
                        day={day}
                        isSelected={selectedDateISO === day.isoString}
                        indicators={{
                          hasEvent: weekEventDates.has(day.isoString),
                          hasOutfit: !!weekPlans[day.isoString],
                          hasConflict: conflictDates.has(day.isoString),
                          hasDifficultWeather: forecastDateSet.has(day.isoString),
                        }}
                        onPress={() => setSelectedDateISO(day.isoString)}
                      />
                    </View>
                  ))}
                </Animated.View>
              </View>
            </View>

            <Animated.View style={styles.sectionContainer} entering={FadeInDown.duration(500).delay(80).easing(Easing.out(Easing.cubic))}>
              <PlannerQuickActions selectedDateISO={selectedDateISO} onPressToday={() => setSelectedDateISO(todayLocalISO)} />
            </Animated.View>

            <Animated.View style={styles.sectionContainer} entering={FadeInDown.duration(500).delay(140).easing(Easing.out(Easing.cubic))}>
              <DaySummaryCard summary={daySummary} />
            </Animated.View>

            {conflicts.length > 0 && (
              <Animated.View style={styles.sectionContainer} entering={FadeInDown.duration(500).delay(200).easing(Easing.out(Easing.cubic))}>
                <SectionTitle withBottomMargin>{t('planner.smartPlanner.conflicts.heading')}</SectionTitle>
                {conflicts.map((conflict) => (
                  <ConflictCard key={conflict.id} conflict={conflict} onPress={() => router.push({ pathname: '/planner/event-details', params: { id: conflict.eventId } })} />
                ))}
              </Animated.View>
            )}

            <Animated.View style={styles.sectionContainer} entering={FadeInDown.duration(500).delay(260).easing(Easing.out(Easing.cubic))}>
              <SectionTitle withBottomMargin>{t('tabs.calendar.selectedDayOutfit')}</SectionTitle>
              {daySummary.plan ? (
                <PremiumCard key={daySummary.plan.id} style={[styles.plannedOutfitCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: daySummary.plan!.outfitId } })}>
                  <View style={[styles.cardImageContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    {daySummary.plan.coverImage ? <Image source={{ uri: daySummary.plan.coverImage }} style={styles.outfitCoverImage} /> : <View style={styles.assetImageBlankContainer}><MaterialCommunityIcons name="hanger" size={24} color={theme.colors.textTertiary} /></View>}
                  </View>
                  <View style={styles.cardDetailsPane}>
                    <View style={styles.cardMetadataRow}>
                      <Text style={[styles.outfitTitleText, { color: theme.colors.textPrimary }]} numberOfLines={1}>{daySummary.plan.outfitName}</Text>
                      {daySummary.plan.occasion && <View style={[styles.categoryBadge, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}><Text style={[styles.categoryBadgeText, { color: theme.colors.textSecondary }]}>{daySummary.plan.occasion}</Text></View>}
                    </View>
                    {daySummary.plan.sourceEventName ? (
                      // This look isn't a separate day-level plan — it's the
                      // outfit assigned directly to today's one event. Made
                      // explicit here instead of looking like an independent
                      // "day plan" (the exact confusion flagged after the
                      // first delivery: the day's look and the event's look
                      // looked disconnected even when they were the same
                      // thing).
                      <Text style={[styles.sourceEventLabel, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                        {t('tabs.calendar.outfitLinkedToEvent', { eventName: daySummary.plan.sourceEventName })}
                      </Text>
                    ) : null}
                    {!!daySummary.plan.additionalOutfitCount && (
                      <Text style={[styles.sourceEventLabel, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                        {t('planner.smartPlanner.daySummary.additionalOutfits', { count: daySummary.plan.additionalOutfitCount })}
                      </Text>
                    )}
                    <View style={styles.actionRowContainerHorizontal}>
                      <PremiumTouchable style={styles.inlineActionTextButton} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: daySummary.plan!.outfitId } })}>
                        <Text style={[styles.actionButtonText, { color: theme.colors.textPrimary }]}>{t('tabs.calendar.viewLook')}</Text>
                      </PremiumTouchable>
                      <PremiumTouchable
                        style={styles.inlineActionTextButtonSecondary}
                        onPress={() =>
                          daySummary.plan!.sourceEventId
                            ? router.push({ pathname: '/planner/select-outfit', params: { eventId: daySummary.plan!.sourceEventId! } })
                            : router.push({ pathname: '/planner/select-outfit', params: { date: selectedDateISO } })
                        }
                      >
                        <Text style={[styles.actionButtonTextSecondary, { color: theme.colors.textSecondary }]}>{t('tabs.calendar.change')}</Text>
                      </PremiumTouchable>
                    </View>
                  </View>
                </PremiumCard>
              ) : (
                <View style={[styles.emptyStateCardContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.emptyStateHeading, { color: theme.colors.textPrimary }]}>{t('tabs.calendar.noDayOutfit')}</Text>
                  <PremiumTouchable style={[styles.assignOutfitActionBtn, { backgroundColor: theme.colors.accent }]} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { date: selectedDateISO } })}>
                    <Text style={[styles.assignActionBtnLabel, { color: theme.colors.accentForeground }]}>{t('tabs.calendar.assignDayOutfit')}</Text>
                  </PremiumTouchable>
                </View>
              )}
            </Animated.View>

            <Animated.View style={styles.sectionContainer} entering={FadeInDown.duration(500).delay(320).easing(Easing.out(Easing.cubic))}>
              <SectionTitle withBottomMargin>{t('planner.smartPlanner.timeline.heading')}</SectionTitle>
              <DayTimeline
                timed={timed}
                untimed={untimed}
                todayLocalISO={todayLocalISO}
                currentWeather={currentWeather}
                forecast={forecast}
                onPressEvent={(eventId) => router.push({ pathname: '/planner/event-details', params: { id: eventId } })}
              />
            </Animated.View>

            {preparations.length > 0 && (
              <Animated.View style={styles.sectionContainer} entering={FadeInDown.duration(500).delay(380).easing(Easing.out(Easing.cubic))}>
                <SectionTitle withBottomMargin>{t('planner.smartPlanner.preparations.heading')}</SectionTitle>
                <UpcomingPreparations tips={preparations} />
              </Animated.View>
            )}
          </Animated.ScrollView>
        )}
      </Animated.View>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  centeredStateFrame: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollLayout: { paddingHorizontal: 16, paddingBottom: 32 },
  headerStack: { marginBottom: 12 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, justifyContent: 'space-between' },
  headerFlexOverride: { flex: 1, paddingVertical: 0 },
  addButtonCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 16, marginTop: 2 },
  errorText: { fontSize: 12, marginBottom: 8 },
  calendarControlStrip: { borderRadius: 20, borderWidth: 1, padding: 16, marginTop: 12 },
  stripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  chevronControls: { flexDirection: 'row', gap: 4 },
  chevronInlineButton: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  daysRowLayout: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCellWrapper: { flex: 1 },
  sectionContainer: { marginTop: 24 },
  plannedOutfitCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 0, width: '100%' },
  cardImageContainer: { width: 100, height: 135 },
  outfitCoverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  assetImageBlankContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardDetailsPane: { flex: 1, padding: 16, justifyContent: 'center' },
  cardMetadataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  outfitTitleText: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  categoryBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sourceEventLabel: { fontSize: 11, marginTop: 2, marginBottom: 2 },
  categoryBadgeText: { fontSize: 10, fontWeight: '500' },
  actionRowContainerHorizontal: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  inlineActionTextButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
  inlineActionTextButtonSecondary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonTextSecondary: { fontSize: 12, fontWeight: '400' },
  emptyStateCardContainer: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyStateHeading: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  assignOutfitActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  assignActionBtnLabel: { fontSize: 12, fontWeight: '600' },
});
