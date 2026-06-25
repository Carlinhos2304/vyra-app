import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';

// Supabase client instance integration
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface UserProfileState {
  id: string;
  username: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  gender: string | null;
  created_at: string | null;
  email: string;
}

// Fixed: Defined the missing static menu architecture constant
const MENU_SECTIONS = [
  {
    title: 'My Activity',
    items: [
      { id: 'favs', label: 'Favorites', icon: 'heart-outline', type: 'chevron', badge: '0' },
      { id: 'history', label: 'History Log', icon: 'history', type: 'chevron' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: 'dark_mode', label: 'Dark Mode', icon: 'theme-light-dark', type: 'toggle' },
      { id: 'notifications', label: 'Push Notifications', icon: 'bell-outline', type: 'chevron' },
    ],
  },
  {
    title: 'Account & Security',
    items: [
      { id: 'edit_prof', label: 'Edit Profile', icon: 'account-edit-outline', type: 'chevron' },
      { id: 'logout', label: 'Log Out', icon: 'logout', type: 'action', danger: true },
    ],
  },
];

export default function ProfileScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // State variables for managing loading, error, and profile parameters
  const [profile, setProfile] = useState<UserProfileState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Asynchronous database aggregate metrics states
  const [garmentsCount, setGarmentsCount] = useState<number>(0);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [outfitsCount, setOutfitsCount] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);

  const fetchActiveUserProfileAndMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[Profile Sync] Resolving secure active authentication token...');

      // 1. Fetch current authenticated identity context parameters
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('[Profile Sync Error] User token evaluation failed or session missing:', authError);
        setError('No active credentials verified.');
        setIsLoading(false);
        return;
      }

      console.log(`[Profile Sync Data] Token verification pass. User ID target resolved: ${user.id}`);
      console.log(`[Profile Sync Data] Querying database record where public.profiles.id = ${user.id}`);

      // 2. Fetch profile data from database matching user identity token coordinates
      const { data: dbProfile, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (dbError) {
        console.error('[Profile Sync Database Failure] Query returned a bad schema response:', dbError);
        throw dbError;
      }

      console.log('[Profile Sync Complete] Payload matched. Username:', dbProfile?.username);
      
      // Merge secure auth credentials metadata with public profiles relational record
      setProfile({
        id: user.id,
        username: dbProfile?.username || 'Vyra Curator',
        avatar_url: dbProfile?.avatar_url,
        birth_date: dbProfile?.birth_date,
        gender: dbProfile?.gender,
        created_at: dbProfile?.created_at,
        email: user.email || 'unassigned@vyra.app',
      });

      // 3. System Statistics Queries execution pipeline
      console.log('[Statistics Async Engine] Launching parallel analytical aggregation sequences...');

      // A. Calculate Total Garments Count
      const { count: totalGarments, error: garmentsErr } = await supabase
        .from('clothing_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (garmentsErr) console.error('[Stats Failure] Total garments count trace failed:', garmentsErr);
      const stableGarmentsCount = totalGarments || 0;
      setGarmentsCount(stableGarmentsCount);

      // B. Calculate Favorites Count
      const { count: totalFavorites, error: favoritesErr } = await supabase
        .from('clothing_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_favorite', true);

      if (favoritesErr) console.error('[Stats Failure] Favorites count trace failed:', favoritesErr);
      setFavoritesCount(totalFavorites || 0);

      // C. Calculate Items Catalogued This Week (Past 7 Days rolling)
      const sevenDaysAgoISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentGarments, error: weeklyErr } = await supabase
        .from('clothing_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgoISO);

      if (weeklyErr) console.error('[Stats Failure] Weekly accumulation trace failed:', weeklyErr);
      setWeeklyCount(recentGarments || 0);

      // D. Outfits Aggregator Integration Hook
      console.log('[Stats Notice] Outfits schema unavailable. Setting layout default fallback representation to: 0');
      setOutfitsCount(0);

      // E. Dynamic Style Profile Preference Chip Engine Generation
      if (stableGarmentsCount > 0) {
        console.log('[Style Analyzer Engine] Wardrobe entries identified. Processing tag distribution weights...');
        const { data: garmentPool, error: poolErr } = await supabase
          .from('clothing_items')
          .select('category, tags')
          .eq('user_id', user.id);

        if (!poolErr && garmentPool) {
          const contentMap: { [key: string]: number } = {};
          
          let garmentPoolIter = garmentPool;
          garmentPoolIter.forEach(item => {
            if (item.category) {
              contentMap[item.category] = (contentMap[item.category] || 0) + 2; // Category weights
            }
            if (item.tags && Array.isArray(item.tags)) {
              item.tags.forEach((tag: string) => {
                contentMap[tag] = (contentMap[tag] || 0) + 1; // Explicit user tags weight
              });
            }
          });

          const sortedPreferences = Object.keys(contentMap)
            .sort((a, b) => contentMap[b] - contentMap[a])
            .slice(0, 4); // Capture topmost unique identifiers

          setStylePreferences(sortedPreferences.length > 0 ? sortedPreferences : ['Wardrobe Fresh']);
        } else {
          setStylePreferences(['Minimalist', 'Casual']);
        }
      } else {
        setStylePreferences([]);
      }

      console.log(`[Statistics Diagnostics] Complete metrics loaded: Garments: ${stableGarmentsCount}, Favorites: ${totalFavorites || 0}, Weekly: ${recentGarments || 0}, Outfits: 0`);

    } catch (err: any) {
      console.error('[Profile Processing Breakdown Exception]:', err);
      setError(err.message || 'An unhandled exception occurred while assembling profile attributes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveUserProfileAndMetrics();
  }, []);

  const handleSystemSignOutRequest = () => {
    console.log('[Logout Flow] User initiated sign out request confirmation sequence.');
    Alert.alert(
      'Log Out Account',
      'Are you sure you want to log out of your Vyra profile session?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('[Logout Flow] Request cancelled by user.') },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Logout Flow] Access token eviction sequence executed. Clearing cookies...');
              const { error: logOutError } = await supabase.auth.signOut();
              
              if (logOutError) {
                console.error('[Logout Flow] Supabase auth subsystem rejected signOut request:', logOutError);
                throw logOutError;
              }
              
              console.log('[Logout Flow] Eviction success. Breaking down router state. Hard redirecting view...');
              router.replace('/auth/login');
            } catch (err: any) {
              console.error('[Logout Flow] Crash detected during terminal exit execution pipeline:', err);
              Alert.alert('Session Error', 'An unexpected error occurred while processing your log-out request.');
            }
          }
        }
      ]
    );
  };

  const handleItemNavigationTriggers = (item: any) => {
    if (item.type === 'action' && item.label === 'Log Out') {
      handleSystemSignOutRequest();
    } else {
      console.log(`Navigation link processing redirected for action item: ${item.label}`);
    }
  };

  const resolveProfileAvatarSource = () => {
    if (profile?.avatar_url) {
      return { uri: profile.avatar_url };
    }
    const cleanLabelFallback = profile?.username || 'User';
    return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanLabelFallback)}&background=F5F5F4&color=1C1917&size=200` };
  };

  const DYNAMIC_STATS = [
    { id: 1, label: 'Garments', value: String(garmentsCount), icon: 'hanger' },
    { id: 2, label: 'Outfits', value: String(outfitsCount), icon: 'sparkles' },
    { id: 3, label: 'This Week', value: String(weeklyCount), icon: 'calendar-blank' },
  ];

  const DYNAMIC_MENU_SECTIONS = MENU_SECTIONS.map(section => {
    if (section.title === 'My Activity') {
      return {
        ...section,
        items: section.items.map(item => 
          item.label === 'Favorites' ? { ...item, badge: String(favoritesCount) } : item
        )
      };
    }
    return section;
  });

  return (
    <PremiumScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerRow}>
          <SectionHeader 
            title="Profile" 
            style={styles.headerFlexOverride}
          />
          <TouchableOpacity 
            style={styles.settingsIconButton} 
            activeOpacity={0.7}
            onPress={() => console.log('Settings Interaction Link Activated')}
          >
            <Ionicons name="settings-outline" size={22} color="#1C1917" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.stateCenterLoaderFrame}>
            <PremiumLoader label="Syncing profile files..." />
          </View>
        ) : error ? (
          <View style={styles.stateCenterLoaderFrame}>
            <MaterialCommunityIcons name="cloud-off-outline" size={32} color="#EF4444" />
            <Text style={styles.errorHeaderTypography}>Profile Load Fault</Text>
            <Text style={styles.errorSubTypography}>{error}</Text>
            <TouchableOpacity style={styles.retryControlActionButton} onPress={fetchActiveUserProfileAndMetrics}>
              <Text style={styles.retryButtonLabelText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.profileHero}>
              <Image
                source={resolveProfileAvatarSource()}
                style={styles.avatarImage}
              />
              <Text style={styles.profileName}>{profile?.username}</Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
            </View>

            <View style={styles.statsRowGrid}>
              {DYNAMIC_STATS.map((stat) => (
                <View key={stat.id} style={styles.statMiniCard}>
                  <MaterialCommunityIcons name={stat.icon as any} size={20} color="#78716C" style={styles.statIcon} />
                  <Text style={styles.statValueText}>{stat.value}</Text>
                  <Text style={styles.statLabelText}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionBlock}>
              <SectionTitle withBottomMargin>Style Preferences</SectionTitle>
              <View style={styles.tagsContainerRow}>
                {stylePreferences.length > 0 ? (
                  stylePreferences.map((preference, index) => (
                    <View key={index} style={styles.preferenceTagBadge}>
                      <Text style={styles.preferenceTagText}>{preference}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyPreferencesTagBadge}>
                    <Text style={styles.emptyPreferencesTagText}>No style profile generated yet</Text>
                  </View>
                )}
              </View>
            </View>

            {DYNAMIC_MENU_SECTIONS.map((section, sectionIdx) => (
              <View key={sectionIdx} style={styles.sectionBlock}>
                <SectionTitle withBottomMargin>{section.title}</SectionTitle>
                <View style={styles.menuGroupCard}>
                  {section.items.map((item, itemIdx) => {
                    const isLastItem = itemIdx === section.items.length - 1;
                    return (
                      <View key={item.id}>
                        <TouchableOpacity
                          activeOpacity={item.type === 'toggle' ? 1 : 0.7}
                          style={styles.menuRowItem}
                          onPress={() => handleItemNavigationTriggers(item)}
                        >
                          <View style={styles.menuRowLeftBlock}>
                            <MaterialCommunityIcons
                              name={item.icon as any}
                              size={20}
                              color={item.danger ? '#DC2626' : '#78716C'}
                              style={styles.menuItemIcon}
                            />
                            <Text style={[styles.menuItemLabel, item.danger && styles.dangerItemLabel]}>
                              {item.label}
                            </Text>
                            {item.badge && (
                              <View style={styles.counterBadge}>
                                <Text style={styles.counterBadgeText}>{item.badge}</Text>
                              </View>
                            )}
                          </View>

                          {item.type === 'toggle' && (
                            <Switch
                              value={isDarkMode}
                              onValueChange={setIsDarkMode}
                              trackColor={{ false: '#D6D3D1', true: '#1C1917' }}
                              thumbColor="#FFFFFF"
                              ios_backgroundColor="#D6D3D1"
                            />
                          )}

                          {item.type === 'chevron' && (
                            <Ionicons name="chevron-forward" size={18} color="#78716C" />
                          )}
                        </TouchableOpacity>
                        {!isLastItem && <View style={styles.rowDividerSeparator} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={styles.appFooterDetailsContainer}>
              <Text style={styles.footerBrandText}>VYRA v1.0.0</Text>
              <Text style={styles.footerSecondaryText}>Made with love for fashion lovers</Text>
            </View>
          </>
        )}
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 20,
  },
  headerFlexOverride: {
    flex: 1,
    paddingVertical: 0,
  },
  settingsIconButton: {
    padding: 4,
    marginTop: 2,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F5F5F4',
    marginBottom: 14,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '500',
    color: '#1C1917',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#78716C',
  },
  statsRowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 28,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  statIcon: {
    marginBottom: 6,
  },
  statValueText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1C1917',
    marginBottom: 2,
  },
  statLabelText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '500',
  },
  sectionBlock: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  tagsContainerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preferenceTagBadge: {
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  preferenceTagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1917',
  },
  emptyPreferencesTagBadge: {
    paddingVertical: 4,
  },
  emptyPreferencesTagText: {
    fontSize: 13,
    color: '#78716C',
    fontStyle: 'italic',
  },
  menuGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    overflow: 'hidden',
    shadowColor: '#000000',
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
  menuRowLeftBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    marginRight: 12,
    width: 22,
    textAlign: 'center',
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1917',
  },
  dangerItemLabel: {
    color: '#DC2626',
  },
  counterBadge: {
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#78716C',
  },
  rowDividerSeparator: {
    height: 1,
    backgroundColor: '#F5F5F4',
    marginLeft: 50,
  },
  appFooterDetailsContainer: {
    marginTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  footerBrandText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '400',
  },
  footerSecondaryText: {
    fontSize: 11,
    color: '#78716C',
    opacity: 0.8,
    marginTop: 4,
  },
  stateCenterLoaderFrame: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorHeaderTypography: {
    fontSize: 16,
    color: '#1C1917',
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 4,
  },
  errorSubTypography: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryControlActionButton: {
    backgroundColor: '#1C1917',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryButtonLabelText: {
    fontSize: 13,
    color: '#FAFAF9',
    fontWeight: '600',
  },
});