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
import { supabase } from '../../lib/supabase';

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
        throw new Error('Authentication coordinates verification trace failed.');
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
      setError(err.message || 'Failed to establish continuous sync with log data.');
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

      if (localizedDayDifference === 0) return 'Today';
      if (localizedDayDifference === 1) return 'Yesterday';
      if (localizedDayDifference < 7) return `${localizedDayDifference} days ago`;
      
      return recordDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Some time ago';
    }
  };

  // Maps action variants to exact specific visual configurations
  const resolveActionVisualMap = (action: ActivityAction) => {
    switch (action) {
      case 'garment_added':
        return { title: 'Garment added', icon: 'hanger', color: '#1C1917' };
      case 'garment_deleted':
        return { title: 'Garment deleted', icon: 'archive-outline', color: '#78716C' };
      case 'favorite_added':
        return { title: 'Added to favorites', icon: 'heart', color: '#1C1917' };
      case 'favorite_removed':
        return { title: 'Removed from favorites', icon: 'heart-broken-outline', color: '#78716C' };
      case 'outfit_created':
        return { title: 'Outfit created', icon: 'sparkles', color: '#1C1917' };
      case 'outfit_deleted':
        return { title: 'Outfit deleted', icon: 'delete-outline', color: '#78716C' };
      default:
        return { title: 'Activity logged', icon: 'history', color: '#1C1917' };
    }
  };

  const renderLogCardItem = ({ item }: { item: ActivityLogItem }) => {
    const config = resolveActionVisualMap(item.action_type);

    return (
      <View style={styles.logCardContainer}>
        <View style={styles.iconCellFrame}>
          <MaterialCommunityIcons name={config.icon as any} size={20} color={config.color} />
        </View>

        <View style={styles.textDetailsColumn}>
          <Text style={styles.actionTitleTypography}>{config.title}</Text>
          <Text style={styles.targetItemTypography} numberOfLines={1}>
            {item.target_name}
            {item.meta_category && (
              <Text style={styles.metaCategoryTypography}>  •  {item.meta_category}</Text>
            )}
          </Text>
        </View>

        <View style={styles.timestampColumn}>
          <Text style={styles.relativeTimeText}>
            {formatRelativeTimestamp(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.centerFeedbackContainer}>
      <MaterialCommunityIcons name="history" size={32} color="#1C1917" style={styles.feedbackIconOffset} />
      <Text style={styles.feedbackHeaderTypography}>No activity logged yet</Text>
      <Text style={styles.feedbackSubTypography}>
        Your style operations, additions, and updates will materialize here automatically.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centerFeedbackContainer}>
      <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#DC2626" style={styles.feedbackIconOffset} />
      <Text style={styles.feedbackHeaderTypography}>Log Synchronization Fault</Text>
      <Text style={styles.feedbackSubTypography}>{error}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => fetchActivityHistory(false)}
        style={styles.retryActionButton}
      >
        <Text style={styles.retryButtonLabelText}>Retry Synchronization</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <PremiumScreen>
      <SafeAreaView style={styles.mainLayoutContainer} edges={['top']}>
        
        {/* Navigation Action Header Alignment Row */}
        <View style={styles.navigationHeaderBar}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButtonHitboxArea} 
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#1C1917" />
          </TouchableOpacity>
          <SectionHeader title="History Log" style={styles.headerFlexAlignmentOverride} />
        </View>

        {/* Layout Output Conditional Branches */}
        {isLoading ? (
          <View style={styles.centerLoadingStateBox}>
            <PremiumLoader label="Parsing historical logs..." />
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
    backgroundColor: '#FAFAF9',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  iconCellFrame: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  textDetailsColumn: {
    flex: 1,
    paddingHorizontal: 14,
  },
  actionTitleTypography: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1917',
    marginBottom: 3,
  },
  targetItemTypography: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '400',
  },
  metaCategoryTypography: {
    color: '#A8A29E',
    fontSize: 11,
  },
  timestampColumn: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  relativeTimeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#A8A29E',
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
    color: '#1C1917',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  feedbackSubTypography: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  retryActionButton: {
    height: 44,
    backgroundColor: '#1C1917',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonLabelText: {
    color: '#FAFAF9',
    fontSize: 13,
    fontWeight: '600',
  },
});