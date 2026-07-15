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
      setCurrentPivotDate(new Date(currentPivotDate.setDate(currentPivotDate.getDate() + (direction * 7))));
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

    const localizedWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
            <PremiumLoader label="Synchronizing schedule metrics..." />
          </View>
        ) : (
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollLayout}
            style={animatedContentStyle}
          >
            <View style={styles.headerStack}>
              <View style={styles.headerTopRow}>
                <SectionHeader title="Outfit Planner" subtitle={formattedMonthHeaderLabel} style={styles.headerFlexOverride} />
                <PremiumTouchable
                  style={styles.addButtonCircle}
                  onPress={() => router.push({ pathname: '/planner/create-event', params: { date: selectedDateISO } })}
                >
                  <Ionicons name="add" size={24} color="#FAFAF9" />
                </PremiumTouchable>
              </View>
              <View style={styles.calendarControlStrip}>
                <View style={styles.stripHeader}>
                  <SectionTitle>This Week</SectionTitle>
                  <View style={styles.chevronControls}>
                    <PremiumTouchable style={styles.chevronInlineButton} onPress={() => handleWeekChange(-1)}>
                      <Ionicons name="chevron-back" size={16} color="#1C1917" />
                    </PremiumTouchable>
                    <PremiumTouchable style={styles.chevronInlineButton} onPress={() => handleWeekChange(1)}>
                      <Ionicons name="chevron-forward" size={16} color="#1C1917" />
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
              <SectionTitle withBottomMargin>Selected Day Outfit</SectionTitle>
              {activePlanInstance ? (
                <PremiumCard key={activePlanInstance.id} style={styles.plannedOutfitCard} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: activePlanInstance.outfitId } })}>
                  <View style={styles.cardImageContainer}>
                    {activePlanInstance.coverImage ? <Image source={{ uri: activePlanInstance.coverImage }} style={styles.outfitCoverImage} /> : <View style={styles.assetImageBlankContainer}><MaterialCommunityIcons name="hanger" size={24} color="#A8A29E" /></View>}
                  </View>
                  <View style={styles.cardDetailsPane}>
                    <View style={styles.cardMetadataRow}>
                      <Text style={styles.outfitTitleText} numberOfLines={1}>{activePlanInstance.outfitName}</Text>
                      {activePlanInstance.occasion && <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{activePlanInstance.occasion}</Text></View>}
                    </View>
                    <Text style={styles.cardScheduleTimelineText}>{formattedFocusDayTitleString}</Text>
                    <View style={styles.actionRowContainerHorizontal}>
                      <PremiumTouchable style={styles.inlineActionTextButton} onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: activePlanInstance.outfitId } })}>
                        <Text style={styles.actionButtonText}>View Look</Text>
                      </PremiumTouchable>
                      <PremiumTouchable style={styles.inlineActionTextButtonSecondary} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { date: selectedDateISO } })}>
                        <Text style={styles.actionButtonTextSecondary}>Change</Text>
                      </PremiumTouchable>
                    </View>
                  </View>
                </PremiumCard>
              ) : (
                <View style={styles.emptyStateCardContainer}>
                  <Text style={styles.emptyStateHeading}>No day outfit planned</Text>
                  <PremiumTouchable style={styles.assignOutfitActionBtn} onPress={() => router.push({ pathname: '/planner/select-outfit', params: { date: selectedDateISO } })}>
                    <Text style={styles.assignActionBtnLabel}>Assign Day Outfit</Text>
                  </PremiumTouchable>
                </View>
              )}
            </Animated.View>

            <Animated.View style={styles.sectionContainer} entering={FadeInDown.delay(200).springify()}>
              <SectionTitle withBottomMargin>{`Events on ${currentSelectedDayMetadata.dayNameLabel} ${currentSelectedDayMetadata.dayNumberLabel}`}</SectionTitle>
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((ev, index) => (
                  <Animated.View key={ev.id} entering={FadeInDown.delay(300 + index * 50).springify()}>
                    <PremiumCard style={styles.eventRowCard} onPress={() => router.push({ pathname: '/planner/event-details', params: { id: ev.id } })}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventNameMainText}>{ev.name}</Text>
                        <Text style={styles.eventDateSubText}>{ev.location || 'No defined location venue'}</Text>
                      </View>
                      <View style={styles.suggestionTagBadge}><Text style={styles.suggestionTagText}>{ev.category}</Text></View>
                    </PremiumCard>
                  </Animated.View>
                ))
              ) : (
                <Text style={styles.emptySectionTextFallback}>No contextual items anchored to this date timeline.</Text>
              )}
            </Animated.View>

            <Animated.View style={styles.sectionContainer} entering={FadeInDown.delay(400).springify()}>
              <SectionTitle withBottomMargin>Upcoming Events Horizon</SectionTitle>
              {upcomingEvents.length > 0 ? (
                <View style={styles.eventsVerticalStackLayout}>
                  {upcomingEvents.map((event, index) => {
                    const hasAssignedOutfit = !!event.outfit_id;
                    return (
                      <Animated.View key={event.id} entering={FadeInDown.delay(500 + index * 50).springify()}>
                        <PremiumCard style={styles.eventRowCard} onPress={() => router.push({ pathname: '/planner/event-details', params: { id: event.id } })}>
                          <View style={styles.eventRowLeftBlock}>
                            <View style={styles.eventAccentBoxContainer}>
                              <MaterialCommunityIcons name={hasAssignedOutfit ? "calendar-check" : "calendar-alert"} size={18} color="#1C1917" />
                            </View>
                            <View style={styles.eventMetaTextBlock}>
                              <Text style={styles.eventNameMainText} numberOfLines={1}>{event.name}</Text>
                              <Text style={styles.eventDateSubText}>{event.event_date} • {event.outfits?.name || 'No Look Connected'}</Text>
                            </View>
                          </View>
                          {!hasAssignedOutfit && (
                            <View style={styles.warningBadge}>
                              <Text style={styles.warningBadgeText}>Outfit Needed</Text>
                            </View>
                          )}
                        </PremiumCard>
                      </Animated.View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyStateCardContainer}>
                  <MaterialCommunityIcons name="calendar-remove" size={28} color="#78716C" style={styles.emptyStateIcon} />
                  <Text style={styles.emptyStateHeading}>Your calendar is clear.</Text>
                  <Text style={styles.emptyStateBodyText}>Create an event and plan your perfect look.</Text>
                  <PremiumTouchable style={styles.assignOutfitActionBtn} onPress={() => router.push('/planner/create-event')}>
                    <Text style={styles.assignActionBtnLabel}>Create Event</Text>
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
  const animatedScale = useSharedValue(1);
  const bgColor = useSharedValue(0);

  useEffect(() => {
    animatedScale.value = isSelected ? withSpring(1.1) : withSpring(1);
    bgColor.value = isSelected ? 1 : 0;
  }, [isSelected]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: animatedScale.value }],
    backgroundColor: interpolateColor(bgColor.value, [0, 1], ['transparent', '#1C1917']),
  }));

  return (
    <PremiumTouchable onPress={onPress}>
      <Animated.View style={[styles.dayGridCell, style]}>
        <Text style={[styles.cellDayName, isSelected && styles.textActive]}>{day.dayNameLabel}</Text>
        <Text style={[styles.cellDateValue, isSelected && styles.textActive]}>{day.dayNumberLabel}</Text>
        {hasDot && <Animated.View style={[styles.indicatorDot, isSelected ? styles.dotActive : styles.dotInactive]} />}
      </Animated.View>
    </PremiumTouchable>
  );
}

const styles = StyleSheet.create({
  centeredStateFrame: {
    flex: 1,
    justifyWithContent: 'center', // note: left intact as per original structure
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollLayout: { paddingHorizontal: 16, paddingBottom: 32 },
  headerStack: { marginBottom: 12 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, justifyContent:'space-between' },
  headerFlexOverride: { flex: 1, paddingVertical: 0 },
  addButtonCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1C1917', justifyContent: 'center', alignItems: 'center', marginLeft: 16, marginTop: 2 },
  calendarControlStrip: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E7E5E4', padding: 16, marginTop: 12 },
  stripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  chevronControls: { flexDirection: 'row', gap: 4 },
  chevronInlineButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F5F5F4', justifyContent: 'center', alignItems: 'center' },
  daysRowLayout: { flexDirection: 'row', justifyContent: 'space-between' },
  dayGridCell: { width: CALENDAR_DAY_WIDTH, paddingVertical: 10, borderRadius: 12, alignItems: 'center', position: 'relative' },
  cellActive: { backgroundColor: '#1C1917' },
  cellInactive: { backgroundColor: 'transparent' },
  cellDayName: { fontSize: 11, fontWeight: '500', color: '#78716C', marginBottom: 4 },
  cellDateValue: { fontSize: 14, fontWeight: '500', color: '#1C1917' },
  textActive: { color: '#FAFAF9' },
  indicatorDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 6 },
  dotActive: { backgroundColor: '#FAFAF9' },
  dotInactive: { backgroundColor: '#1C1917' },
  sectionContainer: { marginTop: 24 },
  plannedOutfitCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4', overflow: 'hidden', padding: 0, width: '100%' },
  cardImageContainer: { width: 100, height: 135, backgroundColor: '#F5F5F4' },
  outfitCoverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  assetImageBlankContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardDetailsPane: { flex: 1, padding: 16, justifyContent: 'center' },
  cardMetadataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  outfitTitleText: { fontSize: 15, fontWeight: '600', color: '#1C1917', flex: 1, marginRight: 8 },
  categoryBadge: { borderWidth: 1, borderColor: '#E7E5E4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#FAFAF9' },
  categoryBadgeText: { fontSize: 10, fontWeight: '500', color: '#78716C' },
  cardScheduleTimelineText: { fontSize: 13, color: '#78716C', marginBottom: 12 },
  actionRowContainerHorizontal: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  inlineActionTextButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#1C1917' },
  inlineActionTextButtonSecondary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  actionButtonTextSecondary: { fontSize: 12, fontWeight: '400', color: '#78716C' },
  emptyStateCardContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E7E5E4', borderStyle: 'dashed', padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyStateIcon: { marginBottom: 8, opacity: 0.6 },
  emptyStateHeading: { fontSize: 14, fontWeight: '500', color: '#1C1917', marginBottom: 4 },
  emptyStateBodyText: { fontSize: 12, color: '#78716C', textAlign: 'center', marginBottom: 16 },
  assignOutfitActionBtn: { backgroundColor: '#1C1917', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  assignActionBtnLabel: { color: '#FAFAF9', fontSize: 12, fontWeight: '600' },
  emptySectionTextFallback: { fontSize: 13, color: '#78716C', fontStyle: 'italic', paddingLeft: 4 },
  eventsVerticalStackLayout: { gap: 10 },
  eventRowCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E7E5E4', width: '100%', marginBottom: 8 },
  eventRowLeftBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  eventAccentBoxContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F5F4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  eventMetaTextBlock: { flex: 1 },
  eventNameMainText: { fontSize: 14, fontWeight: '500', color: '#1C1917', marginBottom: 2 },
  eventDateSubText: { fontSize: 12, color: '#78716C' },
  suggestionTagBadge: { backgroundColor: '#F5F5F4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  suggestionTagText: { fontSize: 11, fontWeight: '500', color: '#78716C' },
  warningBadge: { backgroundColor: '#FAFAF9', borderWidth: 1, borderColor: '#E7E5E4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  warningBadgeText: { fontSize: 11, fontWeight: '500', color: '#78716C' },
});