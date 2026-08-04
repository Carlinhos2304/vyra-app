import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { BackButton } from '../../components/ui/BackButton';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../lib/services/notificationPreferences';
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferences } from '../../lib/services/notificationTypes';

type CategoryKey = 'plannerEnabled' | 'weatherEnabled' | 'outfitRemindersEnabled' | 'aiSuggestionsEnabled' | 'wardrobeEnabled' | 'plannerAiEnabled' | 'weeklySummaryEnabled';
type TimeFieldKey = 'quietHoursStart' | 'quietHoursEnd' | 'notificationTime';

/** Every category toggle row this screen renders, in the same order the
 * spec's 6 notification groups were introduced (Planner Notifications /
 * Planner AI kept as two distinct rows — see notificationTypes.ts's header
 * comment for why they're separate preferences). */
const CATEGORY_ROWS: { key: CategoryKey; icon: string; i18nKey: 'planner' | 'weather' | 'outfitReminder' | 'aiSuggestion' | 'wardrobe' | 'plannerAi' | 'weeklySummary' }[] = [
  { key: 'plannerEnabled', icon: 'calendar-clock-outline', i18nKey: 'planner' },
  { key: 'weatherEnabled', icon: 'weather-partly-cloudy', i18nKey: 'weather' },
  { key: 'outfitRemindersEnabled', icon: 'hanger', i18nKey: 'outfitReminder' },
  { key: 'aiSuggestionsEnabled', icon: 'creation', i18nKey: 'aiSuggestion' },
  { key: 'wardrobeEnabled', icon: 'wardrobe-outline', i18nKey: 'wardrobe' },
  { key: 'plannerAiEnabled', icon: 'calendar-star', i18nKey: 'plannerAi' },
  { key: 'weeklySummaryEnabled', icon: 'chart-box-outline', i18nKey: 'weeklySummary' },
];

/** "HH:MM" -> a Date carrying today's date with that time-of-day, which is
 * all @react-native-community/datetimepicker's mode="time" needs as `value`. */
function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return date;
}

function dateToHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatTimeDisplay(hhmm: string, language: string): string {
  return hhmmToDate(hhmm).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationPreferencesScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTimeField, setActiveTimeField] = useState<TimeFieldKey | null>(null);

  useEffect(() => {
    let isMounted = true;
    getNotificationPreferences().then((fetched) => {
      if (isMounted) {
        setPrefs(fetched);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  /** Optimistic single-field update — flips local state immediately (so the
   * Switch/row feels instant) and reverts + surfaces an alert if the write
   * fails, the same discipline profile.tsx's handleToggleNotifications
   * already uses for the master switch. */
  const persistField = async <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    const previous = prefs ?? DEFAULT_NOTIFICATION_PREFERENCES;
    setPrefs({ ...previous, [key]: value });
    try {
      const saved = await updateNotificationPreferences({ [key]: value } as Partial<NotificationPreferences>);
      setPrefs(saved);
    } catch (err) {
      setPrefs(previous);
      Alert.alert(t('common.error'), t('notifications.saveErrorMessage'));
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    const field = activeTimeField;
    setActiveTimeField(null);
    if (!field || !selectedDate) return;
    persistField(field, dateToHHMM(selectedDate));
  };

  if (isLoading || !prefs) {
    return (
      <PremiumScreen>
        <View style={styles.loaderContainer}>
          <PremiumLoader label={t('notifications.loadingLabel')} />
        </View>
      </PremiumScreen>
    );
  }

  return (
    <PremiumScreen>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <BackButton />
          <SectionHeader title={t('notifications.title')} subtitle={t('notifications.subtitle')} style={styles.headerFlexOverride} />
        </View>

        {/* Categories */}
        <View style={styles.sectionBlock}>
          <SectionTitle withBottomMargin>{t('notifications.sectionCategories')}</SectionTitle>
          <View style={[styles.menuGroupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            {CATEGORY_ROWS.map((row, idx) => (
              <View key={row.key}>
                <View style={styles.stackedRowItem}>
                  <View style={styles.stackedRowLeftBlock}>
                    <MaterialCommunityIcons name={row.icon as any} size={20} color={theme.colors.textSecondary} style={styles.menuItemIcon} />
                    <View style={styles.stackedRowTextBlock}>
                      <Text style={[styles.menuItemLabel, { color: theme.colors.textPrimary }]}>
                        {t(`notifications.categories.${row.i18nKey}.label`)}
                      </Text>
                      <Text style={[styles.rowDescriptionText, { color: theme.colors.textSecondary }]}>
                        {t(`notifications.categories.${row.i18nKey}.description`)}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={prefs[row.key]}
                    onValueChange={(value) => persistField(row.key, value)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                    thumbColor={theme.colors.surface}
                    ios_backgroundColor={theme.colors.border}
                  />
                </View>
                {idx < CATEGORY_ROWS.length - 1 && <View style={[styles.rowDividerSeparator, { backgroundColor: theme.colors.surfaceSecondary }]} />}
              </View>
            ))}
          </View>
        </View>

        {/* Quiet hours */}
        <View style={styles.sectionBlock}>
          <SectionTitle withBottomMargin>{t('notifications.sectionQuietHours')}</SectionTitle>
          <View style={[styles.menuGroupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            <View style={styles.stackedRowItem}>
              <View style={styles.stackedRowLeftBlock}>
                <MaterialCommunityIcons name="moon-waning-crescent" size={20} color={theme.colors.textSecondary} style={styles.menuItemIcon} />
                <View style={styles.stackedRowTextBlock}>
                  <Text style={[styles.menuItemLabel, { color: theme.colors.textPrimary }]}>{t('notifications.quietHoursToggleLabel')}</Text>
                  <Text style={[styles.rowDescriptionText, { color: theme.colors.textSecondary }]}>{t('notifications.quietHoursDescription')}</Text>
                </View>
              </View>
              <Switch
                value={prefs.quietHoursEnabled}
                onValueChange={(value) => persistField('quietHoursEnabled', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                thumbColor={theme.colors.surface}
                ios_backgroundColor={theme.colors.border}
              />
            </View>

            {prefs.quietHoursEnabled && (
              <>
                <View style={[styles.rowDividerSeparator, { backgroundColor: theme.colors.surfaceSecondary }]} />
                <PremiumTouchable style={styles.menuRowItem} onPress={() => setActiveTimeField('quietHoursStart')}>
                  <View style={styles.menuRowLeftBlock}>
                    <MaterialCommunityIcons name="clock-start" size={20} color={theme.colors.textSecondary} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemLabel, { color: theme.colors.textPrimary }]}>{t('notifications.quietHoursStartLabel')}</Text>
                  </View>
                  <Text style={[styles.rowValueText, { color: theme.colors.textSecondary }]}>{formatTimeDisplay(prefs.quietHoursStart, language)}</Text>
                </PremiumTouchable>
                <View style={[styles.rowDividerSeparator, { backgroundColor: theme.colors.surfaceSecondary }]} />
                <PremiumTouchable style={styles.menuRowItem} onPress={() => setActiveTimeField('quietHoursEnd')}>
                  <View style={styles.menuRowLeftBlock}>
                    <MaterialCommunityIcons name="clock-end" size={20} color={theme.colors.textSecondary} style={styles.menuItemIcon} />
                    <Text style={[styles.menuItemLabel, { color: theme.colors.textPrimary }]}>{t('notifications.quietHoursEndLabel')}</Text>
                  </View>
                  <Text style={[styles.rowValueText, { color: theme.colors.textSecondary }]}>{formatTimeDisplay(prefs.quietHoursEnd, language)}</Text>
                </PremiumTouchable>
              </>
            )}
          </View>
        </View>

        {/* Schedule: daily notification time + weekend toggle */}
        <View style={styles.sectionBlock}>
          <SectionTitle withBottomMargin>{t('notifications.sectionSchedule')}</SectionTitle>
          <View style={[styles.menuGroupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            <PremiumTouchable style={styles.stackedRowItem} onPress={() => setActiveTimeField('notificationTime')}>
              <View style={styles.stackedRowLeftBlock}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.textSecondary} style={styles.menuItemIcon} />
                <View style={styles.stackedRowTextBlock}>
                  <Text style={[styles.menuItemLabel, { color: theme.colors.textPrimary }]}>{t('notifications.notificationTimeLabel')}</Text>
                  <Text style={[styles.rowDescriptionText, { color: theme.colors.textSecondary }]}>{t('notifications.notificationTimeDescription')}</Text>
                </View>
              </View>
              <Text style={[styles.rowValueText, { color: theme.colors.textSecondary }]}>{formatTimeDisplay(prefs.notificationTime, language)}</Text>
            </PremiumTouchable>

            <View style={[styles.rowDividerSeparator, { backgroundColor: theme.colors.surfaceSecondary }]} />

            <View style={styles.stackedRowItem}>
              <View style={styles.stackedRowLeftBlock}>
                <MaterialCommunityIcons name="calendar-weekend-outline" size={20} color={theme.colors.textSecondary} style={styles.menuItemIcon} />
                <View style={styles.stackedRowTextBlock}>
                  <Text style={[styles.menuItemLabel, { color: theme.colors.textPrimary }]}>{t('notifications.weekendToggleLabel')}</Text>
                  <Text style={[styles.rowDescriptionText, { color: theme.colors.textSecondary }]}>{t('notifications.weekendToggleDescription')}</Text>
                </View>
              </View>
              <Switch
                value={prefs.weekendNotificationsEnabled}
                onValueChange={(value) => persistField('weekendNotificationsEnabled', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                thumbColor={theme.colors.surface}
                ios_backgroundColor={theme.colors.border}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {activeTimeField && (
        <DateTimePicker
          value={hhmmToDate(prefs[activeTimeField])}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContainer: { paddingHorizontal: 16, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: 4 },
  headerFlexOverride: { flex: 1, paddingVertical: 0, paddingHorizontal: 0 },
  sectionBlock: { marginBottom: 24 },
  menuGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  menuRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  menuRowLeftBlock: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stackedRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  stackedRowLeftBlock: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 12 },
  stackedRowTextBlock: { flex: 1 },
  menuItemIcon: { marginRight: 12, width: 22, textAlign: 'center', marginTop: 1 },
  menuItemLabel: { fontSize: 14, fontWeight: '500' },
  rowDescriptionText: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  rowValueText: { fontSize: 13, fontWeight: '500' },
  rowDividerSeparator: { height: 1, marginLeft: 50 },
});
