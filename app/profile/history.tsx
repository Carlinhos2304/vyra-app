import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { AnimatedListItem } from '../../components/ui/AnimatedListItem';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

const { width } = Dimensions.get('window');

// Data interfaces defining structural types matching Supabase migration parameters
type ActivityAction =
  | 'garment_added'
  | 'garment_deleted'
  | 'favorite_added'
  | 'favorite_removed'
  | 'outfit_created'
  | 'outfit_deleted';

interface ActivityLogItem {
  id: string;
  action_type: ActivityAction;
  target_name: string;
  meta_category: string | null;
  created_at: string;
}

export default function HistoryLogScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityHistory = async (showRefresher = false) => {
    if (showRefresher) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(t('profile.history.errors.authFailed'));
      }

      const { data, error: dbError } = await supabase
        .from('activity_log')
        .select('id, action_type, target_name, meta_category, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      setLogs(data || []);
    } catch (err: any) {
      console.error('[History Processing Failure]:', err);
      setError(err.message || t('profile.history.errors.fetchFailed'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivityHistory();
  }, []);

  // Relative Time Converter Function (Minimalistic formatting matching design directives)
  const formatRelativeTimestamp = (isoString: string): string => {
    try {
      const recordDate = new Date(isoString);
      const currentDate = new Date();

      // Reset precision timing constraints to compare absolute calendar transitions
      const recordMidnight = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

      const timeDifferenceDelta = currentMidnight.getTime() - recordMidnight.getTime();
      const localizedDayDifference = Math.floor(timeDifferenceDelta / (1000 * 60 * 60 * 24));

      if (localizedDayDifference === 0) return t('common.today');
      if (localizedDayDifference === 1) return t('profile.history.relativeTime.yesterday');
      if (localizedDayDifference < 7) return t('profile.history.relativeTime.daysAgo', { count: localizedDayDifference });

      return recordDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return t('profile.history.relativeTime.someTimeAgo');
    }
  };

  // Maps action variants to exact specific visual configurations
  const resolveActionVisualMap = (action: ActivityAction) => {
    switch (action) {
      case 'garment_added':
        return { title: t('profile.history.actions.garmentAdded'), icon: 'hanger', color: theme.colors.textPrimary };
      case 'garment_deleted':
        return { title: t('profile.history.actions.garmentDeleted'), icon: 'archive-outline', color: theme.colors.textSecondary };
      case 'favorite_added':
        return { title: t('profile.history.actions.favoriteAdded'), icon: 'heart', color: theme.colors.textPrimary };
      case 'favorite_removed':
        return { title: t('profile.history.actions.favoriteRemoved'), icon: 'heart-broken-outline', color: theme.colors.textSecondary };
      case 'outfit_created':
        return { title: t('profile.history.actions.outfitCreated'), icon: 'sparkles', color: theme.colors.textPrimary };
      case 'outfit_deleted':
        return { title: t('profile.history.actions.outfitDeleted'), icon: 'delete-outline', color: theme.colors.textSecondary };
      default:
        return { title: t('profile.history.actions.activityLogged'), icon: 'history', color: theme.colors.textPrimary };
    }
  };

  const renderLogCardItem = ({ item, index }: { item: ActivityLogItem; index: number }) => {
    const config = resolveActionVisualMap(item.action_type);

    return (
      <AnimatedListItem index={index}>
        <View style={[styles.logCardContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
          <View style={[styles.iconCellFrame, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
            <MaterialCommunityIcons name={config.icon as any} size={20} color={config.color} />
          </View>

          <View style={styles.textDetailsColumn}>
            <Text style={[styles.actionTitleTypography, { color: theme.colors.textPrimary }]}>{config.title}</Text>
            <Text style={[styles.targetItemTypography, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.target_name}
              {item.meta_category && (
                <Text style={[styles.metaCategoryTypography, { color: theme.colors.textTertiary }]}>  •  {item.meta_category}</Text>
              )}
            </Text>
          </View>

          <View style={styles.timestampColumn}>
            <Text style={[styles.relativeTimeText, { color: theme.colors.textTertiary }]}>
              {formatRelativeTimestamp(item.created_at)}
            </Text>
          </View>
        </View>
      </AnimatedListItem>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.centerFeedbackContainer}>
      <MaterialCommunityIcons name="history" size={32} color={theme.colors.textPrimary} style={styles.feedbackIconOffset} />
      <Text style={[styles.feedbackHeaderTypography, { color: theme.colors.textPrimary }]}>{t('profile.history.empty.title')}</Text>
      <Text style={[styles.feedbackSubTypography, { color: theme.colors.textSecondary }]}>
        {t('profile.history.empty.subtitle')}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centerFeedbackContainer}>
      <MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.colors.danger} style={styles.feedbackIconOffset} />
      <Text style={[styles.feedbackHeaderTypography, { color: theme.colors.textPrimary }]}>{t('profile.history.errors.syncFaultTitle')}</Text>
      <Text style={[styles.feedbackSubTypography, { color: theme.colors.textSecondary }]}>{error}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => fetchActivityHistory(false)}
        style={[styles.retryActionButton, { backgroundColor: theme.colors.accent }]}
      >
        <Text style={[styles.retryButtonLabelText, { color: theme.colors.accentForeground }]}>{t('profile.history.errors.retrySync')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <PremiumScreen>
      <SafeAreaView style={[styles.mainLayoutContainer, { backgroundColor: theme.colors.background }]} edges={['top']}>

        {/* Navigation Action Header Alignment Row */}
        <View style={styles.navigationHeaderBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButtonHitboxArea}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <SectionHeader title={t('profile.history.title')} style={styles.headerFlexAlignmentOverride} />
        </View>

        {/* Layout Output Conditional Branches */}
        {isLoading ? (
          <View style={styles.centerLoadingStateBox}>
            <PremiumLoader label={t('profile.history.loadingHistory')} />
          </View>
        ) : error ? (
          renderErrorState()
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item) => item.id}
            renderItem={renderLogCardItem}
            contentContainerStyle={styles.listContentDynamicContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            refreshing={isRefreshing}
            onRefresh={() => fetchActivityHistory(true)}
          />
        )}
      </SafeAreaView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  mainLayoutContainer: {
    flex: 1,
  },
  navigationHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  backButtonHitboxArea: {
    marginRight: 12,
    padding: 4,
    marginTop: 2,
  },
  headerFlexAlignmentOverride: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  centerLoadingStateBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContentDynamicContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  logCardContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  iconCellFrame: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textDetailsColumn: {
    flex: 1,
    paddingHorizontal: 14,
  },
  actionTitleTypography: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 3,
  },
  targetItemTypography: {
    fontSize: 12,
    fontWeight: '400',
  },
  metaCategoryTypography: {
    fontSize: 11,
  },
  timestampColumn: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  relativeTimeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  centerFeedbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  feedbackIconOffset: {
    opacity: 0.35,
    marginBottom: 16,
  },
  feedbackHeaderTypography: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  feedbackSubTypography: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  retryActionButton: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonLabelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
