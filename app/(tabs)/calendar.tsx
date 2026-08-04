import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout, SlideInRight, SlideOutLeft, useAnimatedStyle, useSharedValue, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme';
import { useLanguage } from '../../i18n';

const { width } = Dimensions.get('window');
const CALENDAR_DAY_WIDTH = (width - 48 - 36) / 7;

interface PlanDetails {
  id: string; outfitId: string; outfitName: string; coverImage: string | null; occasion: string | null;
}

interface DBEvent {
  id: string; name: string; event_date: string; category: string; location: string | null; outfit_id: string | null;
  outfits?: any;
}

interface CalendarDayModel { dateObject: Date; isoString: string; dayNameLabel: string; dayNumberLabel: string; }

export default function CalendarScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();

  // Safe helper to generate local YYYY-MM-DD string matching user's device timezone
  const getLocalTodayISODate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentPivotDate, setCurrentPivotDate] = useState<Date>(new Date());
  const [selectedDateISO, setSelectedDateISO] = useState<string>(getLocalTodayISODate());

  // Week change animation
  const weekListAnim = useSharedValue(1);

  const handleWeekChange = (direction: number) => {
    weekListAnim.value = 0;
    setTimeout(() => {
      // Build a fresh Date rather than mutating the one already in state
      // (mutating `currentPivotDate` in place broke React's immutability
      // contract and could desync anything still holding the old reference).
      setCurrentPivotDate(prev => {
        const next = new Date(prev);
        next.setDate(next.getDate() + direction * 7);
        return next;
      });
      weekListAnim.value = withTiming(1, { duration: 300 });
    }, 150);
  };

  const animatedWeekStyle = useAnimatedStyle(() => ({
    opacity: weekListAnim.value,
    transform: [{ scale: 0.98 + (weekListAnim.value * 0.02) }],
  }));

  const [plans, setPlans] = useState<Record<string, PlanDetails>>({});
  const [selectedDayEvents, setSelectedDayEvents] = useState<DBEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DBEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const entranceAnim = useSharedValue(0);
  const loadingAnim = useSharedValue(1);

  useEffect(() => {
    entranceAnim.value = withTiming(1, { duration: 600 });
  }, []);

  useEffect(() => {
    loadingAnim.value = isLoading ? 0.6 : 1;
  }, [isLoading]);

  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: (1 - entranceAnim.value) * 20 }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: loadingAnim.value,
  }));

  const generateWeeklyTrackSequence = (pivot: Date): CalendarDayModel[] => {
    const trackingDay = new Date(pivot);
    const dayOfWeek = trackingDay.getDay();
    const numericDistanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    trackingDay.setDate(trackingDay.getDate() - numericDistanceToMonday);

    const localizedWeekDays = [
      t('tabs.calendar.days.mon'),
      t('tabs.calendar.days.tue'),
      t('tabs.calendar.days.wed'),
      t('tabs.calendar.days.thu'),
      t('tabs.calendar.days.fri'),
      t('tabs.calendar.days.sat'),
      t('tabs.calendar.days.sun'),
    ];
    return Array.from({ length: 7 }).map((_, idx) => {
      const dailyInstance = new Date(trackingDay);
      if (idx > 0) dailyInstance.setDate(dailyInstance.getDate() + idx);
      const isoKey = `${dailyInstance.getFullYear()}-${String(dailyInstance.getMonth() + 1).padStart(2, '0')}-${String(dailyInstance.getDate()).padStart(2, '0')}`;
      return { dateObject: dailyInstance, isoString: isoKey, dayNameLabel: localizedWeekDays[idx], dayNumberLabel: String(dailyInstance.getDate()) };
    });
  };

  const activeWeekMatrix = generateWeeklyTrackSequence(currentPivotDate);

  const syncPlanningSystemGraph = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication session tracking expired.');

      // 1. Fetch Day Outfit Plans
      const { data: plansData, error: plansErr } = await supabase.from('outfit_plans').select(`
        id, planned_date, outfit_id, outfits ( name, occasion, outfit_items ( clothing_items ( image_url ) ) )
      `).eq('user_id', user.id);
      if (plansErr) throw plansErr;

      const reducedPlansMap: Record<string, PlanDetails> = {};
      (plansData || []).forEach((row: any) => {
        if (!row.planned_date || !row.outfits) return;
        const items = row.outfits.outfit_items || [];
        const cover = items.length > 0 && items[0].clothing_items ? items[0].clothing_items.image_url : null;
        reducedPlansMap[row.planned_date] = {
          id: row.id, outfitId: row.outfit_id, outfitName: row.outfits.name, coverImage: cover, occasion: row.outfits.occasion
        };
      });
      setPlans(reducedPlansMap);

      // 2. Fetch Selected Day Specific Events
      const { data: selectedEventsData, error: dayEventsErr } = await supabase.from('events').select(`
        id, name, event_date, category, location, outfit_id, outfits ( name )
      `).eq('user_id', user.id).eq('event_date', selectedDateISO);
      if (dayEventsErr) throw dayEventsErr;
      setSelectedDayEvents(selectedEventsData || []);

      // 3. Fetch Forward-Looking Upcoming Events Section Array using device local date
      const localTodayISO = getLocalTodayISODate();
      const { data: upcomingData, error: upcomingErr } = await supabase.from('events').select(`
        id, name, event_date, category, location, outfit_id, outfits ( name, outfit_items ( clothing_items ( image_url ) ) )
      `).eq('user_id', user.id).gte('event_date', localTodayISO).order('event_date', { ascending: true }).limit(5);
      if (upcomingErr) throw upcomingErr;
      setUpcomingEvents(upcomingData || []);

    } catch (err: any) {
      console.error('[Calendar Sync Crash Log]:', err);
      setError(err.message || 'Error occurred updating core visual frame arrays.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      syncPlanningSystemGraph();
    }, [currentPivotDate, selectedDateISO])
  );

  const activePlanInstance = plans[selectedDateISO];
  const currentSelectedDayMetadata = activeWeekMatrix.find((day) => day.isoString === selectedDateISO) || activeWeekMatrix[0];
  const formattedMonthHeaderLabel = currentPivotDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const formattedFocusDayTitleString = currentSelectedDayMetadata.dateObject.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <PremiumScreen>
      <Animated.View style={[{ flex: 1 }, animatedScreenStyle]}>
        {isLoading ? (
          <View style={styles.centeredStateFrame}>
            <PremiumLoader label={t('tabs.calendar.loading')} />
          </View>
        ) : (
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollLayout}
            style={animatedContentStyle}
          >
            <View style={styles.headerStack}>
              <View style={styles.headerTopRow}>
                <SectionHeader title={t('tabs.calendar.title')} subtitle={formattedMonthHeaderLabel} style={styles.headerFlexOverride} />
                <PremiumTouchable
                  style={[styles.addButtonCircle, { backgroundColor: theme.colors.accent }]}
                  onPress={() => router.push({ pathname: '/planner/create-event', params: { date: selectedDateISO } })}
                >
                  <Ionicons name="add" size={24} color={theme.colors.accentForeground} />
                </PremiumTouchable>
              </View>
              <View style={[styles.calendarControlStrip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.stripHeader}>
                  <SectionTitle>{t('tabs.calendar.thisWeek')}</SectionTitle>
                  <View style={styles.chevronControls}>
                    <PremiumTouchable style={[styles.chevronInlineButton, { backgroundColor: theme.colors.surfaceSecondary }]} onPress={() => handleWeekChange(-1)}>
                      <Ionicons name="chevron-back" size={16} color={theme.colors.textPrimary} />
                    </PremiumTouchable>
                    <PremiumTouchable style={[styles.chevronInlineButton, { backgroundColor: theme.colors.surfaceSecondary }]} onPress={() => handleWeekChange(1)}>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textPrimary} />
                    </PremiumTouchable>
                  </View>
                </View>

                <Animated.View style={[styles.daysRowLayout, animatedWeekStyle]}>
                  {activeWeekMatrix.map((day) => {
                    const isSelected = selectedDateISO === day.isoString;
                    const hasDotIndicator = !!plans[day.isoString];
                    return (
                      <CalendarDayItem
                        key={day.isoString}
                        day={day}
                        isSelected={isSelected}
                        hasDot={hasDotIndicator}
                        onPress={() => setSelectedDateISO(day.isoString)}
                      />
                    );
                  })}
                </Animated.View>
              </View>
            </View>

            <Animated.View style={styles.sectionContainer} entering={FadeInDown.delay(100).springify()}>
              <SectionTitle withBottomMargin>{t('tabs.calendar.selectedDayOutfit')}</SectionTitle>
              {activePlanInstance ? (
                <PremiumCard key={activePlanInstance.id} style={[styles.plannedOutfitCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: activePlanInstance.outfitId } })}>
                  <View style={[styles.cardImageContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
                    {activePlanInstance.coverImage ? <Image source={{ uri: activePlanInstance.coverImage }} style={styles.outfitCoverImage} /> : <View style={styles.assetImageBlankContainer}><MaterialCommunityIcons name="hanger" size={24} color={theme.colors.textTertiary} /></View>}
                  </View>
                  <View style={styles.cardDetailsPane}>
                    <View style={styles.cardMetadataRow}>
                      <Text style={[styles.outfitTitleText, { color: theme.colors.textPrimary }]} numberOfLines={1}>{activePlanInstance.outfitName}</Text>
                      {activePlanInstance.occasion && <View style={[styles.categoryBadge, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}><Text style={[styles.categoryBadgeText, { color: theme.colors.textSecondary }]}>{activePlanInstance.occasion}</Text></View>}
                    </View>
                    <Text style={[styles.cardScheduleTimelineText, { color: theme.colors.textSecondary }]}>{formattedFocusDayTitleString}</Text>
                    <View style={styles.actionRowContainerHorizontal}>
                      <PremiumTouchable style={styles.inlineActionTextButton} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: activePlanInstance.outfitId } })}>
                        <Text style={[styles.actionButtonText, { color: theme.colors.textPrimary }]}>{t('tabs.calendar.viewLook')}</Text>
                      </PremiumTouchable>
                      <PremiumTouchable style={styles.inlineActionTextButtonSecondary} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { date: selectedDateISO } })}>
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

            <Animated.View style={styles.sectionContainer} entering={FadeInDown.delay(200).springify()}>
              <SectionTitle withBottomMargin>{t('tabs.calendar.eventsOn', { dayName: currentSelectedDayMetadata.dayNameLabel, dayNumber: currentSelectedDayMetadata.dayNumberLabel })}</SectionTitle>
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((ev, index) => (
                  <Animated.View key={ev.id} entering={FadeInDown.delay(300 + index * 50).springify()}>
                    <PremiumCard style={[styles.eventRowCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => router.push({ pathname: '/planner/event-details', params: { id: ev.id } })}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventNameMainText, { color: theme.colors.textPrimary }]}>{ev.name}</Text>
                        <Text style={[styles.eventDateSubText, { color: theme.colors.textSecondary }]}>{ev.location || t('tabs.calendar.noLocation')}</Text>
                      </View>
                      <View style={[styles.suggestionTagBadge, { backgroundColor: theme.colors.surfaceSecondary }]}><Text style={[styles.suggestionTagText, { color: theme.colors.textSecondary }]}>{ev.category}</Text></View>
                    </PremiumCard>
                  </Animated.View>
                ))
              ) : (
                <Text style={[styles.emptySectionTextFallback, { color: theme.colors.textSecondary }]}>{t('tabs.calendar.noEventsThisDay')}</Text>
              )}
            </Animated.View>

            <Animated.View style={styles.sectionContainer} entering={FadeInDown.delay(400).springify()}>
              <SectionTitle withBottomMargin>{t('tabs.calendar.upcomingEventsTitle')}</SectionTitle>
              {upcomingEvents.length > 0 ? (
                <View style={styles.eventsVerticalStackLayout}>
                  {upcomingEvents.map((event, index) => {
                    const hasAssignedOutfit = !!event.outfit_id;
                    return (
                      <Animated.View key={event.id} entering={FadeInDown.delay(500 + index * 50).springify()}>
                        <PremiumCard style={[styles.eventRowCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => router.push({ pathname: '/planner/event-details', params: { id: event.id } })}>
                          <View style={styles.eventRowLeftBlock}>
                            <View style={[styles.eventAccentBoxContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
                              <MaterialCommunityIcons name={hasAssignedOutfit ? "calendar-check" : "calendar-alert"} size={18} color={theme.colors.textPrimary} />
                            </View>
                            <View style={styles.eventMetaTextBlock}>
                              <Text style={[styles.eventNameMainText, { color: theme.colors.textPrimary }]} numberOfLines={1}>{event.name}</Text>
                              <Text style={[styles.eventDateSubText, { color: theme.colors.textSecondary }]}>{event.event_date} • {event.outfits?.name || t('tabs.calendar.noLookConnected')}</Text>
                            </View>
                          </View>
                          {!hasAssignedOutfit && (
                            <View style={[styles.warningBadge, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                              <Text style={[styles.warningBadgeText, { color: theme.colors.textSecondary }]}>{t('tabs.calendar.outfitNeeded')}</Text>
                            </View>
                          )}
                        </PremiumCard>
                      </Animated.View>
                    );
                  })}
                </View>
              ) : (
                <View style={[styles.emptyStateCardContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <MaterialCommunityIcons name="calendar-remove" size={28} color={theme.colors.textSecondary} style={styles.emptyStateIcon} />
                  <Text style={[styles.emptyStateHeading, { color: theme.colors.textPrimary }]}>{t('tabs.calendar.calendarClearTitle')}</Text>
                  <Text style={[styles.emptyStateBodyText, { color: theme.colors.textSecondary }]}>{t('tabs.calendar.calendarClearSubtitle')}</Text>
                  <PremiumTouchable style={[styles.assignOutfitActionBtn, { backgroundColor: theme.colors.accent }]} onPress={() => router.push('/planner/create-event')}>
                    <Text style={[styles.assignActionBtnLabel, { color: theme.colors.accentForeground }]}>{t('tabs.calendar.createEvent')}</Text>
                  </PremiumTouchable>
                </View>
              )}
            </Animated.View>
          </Animated.ScrollView>
        )}
      </Animated.View>
    </PremiumScreen>
  );
}

// ... CalendarDayItem helper component ...
function CalendarDayItem({ day, isSelected, hasDot, onPress }: { day: CalendarDayModel, isSelected: boolean, hasDot: boolean, onPress: () => void }) {
  const { theme } = useTheme();
  const animatedScale = useSharedValue(1);
  const bgColor = useSharedValue(0);

  useEffect(() => {
    animatedScale.value = isSelected ? withSpring(1.1) : withSpring(1);
    bgColor.value = isSelected ? 1 : 0;
  }, [isSelected]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: animatedScale.value }],
    backgroundColor: interpolateColor(bgColor.value, [0, 1], ['transparent', theme.colors.accent]),
  }));

  return (
    <PremiumTouchable onPress={onPress}>
      <Animated.View style={[styles.dayGridCell, style]}>
        <Text style={[styles.cellDayName, { color: theme.colors.textSecondary }, isSelected && { color: theme.colors.accentForeground }]}>{day.dayNameLabel}</Text>
        <Text style={[styles.cellDateValue, { color: theme.colors.textPrimary }, isSelected && { color: theme.colors.accentForeground }]}>{day.dayNumberLabel}</Text>
        {hasDot && <Animated.View style={[styles.indicatorDot, { backgroundColor: isSelected ? theme.colors.accentForeground : theme.colors.accent }]} />}
      </Animated.View>
    </PremiumTouchable>
  );
}

const styles = StyleSheet.create({
  centeredStateFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollLayout: { paddingHorizontal: 16, paddingBottom: 32 },
  headerStack: { marginBottom: 12 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, justifyContent:'space-between' },
  headerFlexOverride: { flex: 1, paddingVertical: 0 },
  addButtonCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 16, marginTop: 2 },
  calendarControlStrip: { borderRadius: 20, borderWidth: 1, padding: 16, marginTop: 12 },
  stripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  chevronControls: { flexDirection: 'row', gap: 4 },
  chevronInlineButton: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  daysRowLayout: { flexDirection: 'row', justifyContent: 'space-between' },
  dayGridCell: { width: CALENDAR_DAY_WIDTH, paddingVertical: 10, borderRadius: 12, alignItems: 'center', position: 'relative' },
  cellDayName: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  cellDateValue: { fontSize: 14, fontWeight: '500' },
  indicatorDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 6 },
  sectionContainer: { marginTop: 24 },
  plannedOutfitCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 0, width: '100%' },
  cardImageContainer: { width: 100, height: 135 },
  outfitCoverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  assetImageBlankContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardDetailsPane: { flex: 1, padding: 16, justifyContent: 'center' },
  cardMetadataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  outfitTitleText: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  categoryBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  categoryBadgeText: { fontSize: 10, fontWeight: '500' },
  cardScheduleTimelineText: { fontSize: 13, marginBottom: 12 },
  actionRowContainerHorizontal: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  inlineActionTextButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
  inlineActionTextButtonSecondary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonTextSecondary: { fontSize: 12, fontWeight: '400' },
  emptyStateCardContainer: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyStateIcon: { marginBottom: 8, opacity: 0.6 },
  emptyStateHeading: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  emptyStateBodyText: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  assignOutfitActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  assignActionBtnLabel: { fontSize: 12, fontWeight: '600' },
  emptySectionTextFallback: { fontSize: 13, fontStyle: 'italic', paddingLeft: 4 },
  eventsVerticalStackLayout: { gap: 10 },
  eventRowCard: { flexDirection: 'row', borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, width: '100%', marginBottom: 8 },
  eventRowLeftBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  eventAccentBoxContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  eventMetaTextBlock: { flex: 1 },
  eventNameMainText: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  eventDateSubText: { fontSize: 12 },
  suggestionTagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  suggestionTagText: { fontSize: 11, fontWeight: '500' },
  warningBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  warningBadgeText: { fontSize: 11, fontWeight: '500' },
});
