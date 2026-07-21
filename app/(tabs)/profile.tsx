import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Switch,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PremiumScreen } from '../../components/ui/PremiumScreen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
import { useNotifications } from '../../hooks/useNotifications';

// Supabase client instance integration
import { supabase } from '../../lib/supabase';

// React Native Reanimated v4 Integrations
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  withSpring,
  Easing 
} from 'react-native-reanimated';

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
      { id: 'notifications', label: 'Push Notifications', icon: 'bell-outline', type: 'toggle' },
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { syncNotifications } = useNotifications();
  
  const [profile, setProfile] = useState<UserProfileState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [garmentsCount, setGarmentsCount] = useState<number>(0);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [outfitsCount, setOutfitsCount] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);

  // ==========================================
  // ANIMATION SETUP (Reanimated Shared Values)
  // ==========================================
  const screenOpacity = useSharedValue(0);
  const screenTranslateY = useSharedValue(20);

  const logoScale = useSharedValue(0.9);
  const logoOpacity = useSharedValue(0);

  const nameOpacity = useSharedValue(0);
  const nameTranslateY = useSharedValue(15);

  const statsOpacity = useSharedValue(0);
  const statsTranslateY = useSharedValue(15);

  const tagsOpacity = useSharedValue(0);
  const tagsTranslateY = useSharedValue(15);

  const menuOpacity = useSharedValue(0);
  const menuTranslateY = useSharedValue(15);

  const footerOpacity = useSharedValue(0);
  const footerTranslateY = useSharedValue(15);

  // Press interaction scales
  const settingsBtnScale = useSharedValue(1);
  const retryBtnScale = useSharedValue(1);

  // Trigger entering animations once mounted
  const runEntranceAnimations = () => {
    const easeOutCubic = Easing.out(Easing.cubic);

    // 1. Entire screen transition
    screenOpacity.value = withTiming(1, { duration: 600, easing: easeOutCubic });
    screenTranslateY.value = withTiming(0, { duration: 600, easing: easeOutCubic });

    // 2. Logo / Hero zoom
    logoScale.value = withDelay(150, withTiming(1, { duration: 500, easing: easeOutCubic }));
    logoOpacity.value = withDelay(150, withTiming(1, { duration: 500, easing: easeOutCubic }));

    // 3. Staggered Text Blocks (+80ms increments)
    nameOpacity.value = withDelay(230, withTiming(1, { duration: 500, easing: easeOutCubic }));
    nameTranslateY.value = withDelay(230, withTiming(0, { duration: 500, easing: easeOutCubic }));

    statsOpacity.value = withDelay(310, withTiming(1, { duration: 500, easing: easeOutCubic }));
    statsTranslateY.value = withDelay(310, withTiming(0, { duration: 500, easing: easeOutCubic }));

    tagsOpacity.value = withDelay(390, withTiming(1, { duration: 500, easing: easeOutCubic }));
    tagsTranslateY.value = withDelay(390, withTiming(0, { duration: 500, easing: easeOutCubic }));

    menuOpacity.value = withDelay(470, withTiming(1, { duration: 500, easing: easeOutCubic }));
    menuTranslateY.value = withDelay(470, withTiming(0, { duration: 500, easing: easeOutCubic }));

    // 4. Primary Footer / App Detail Elements
    footerOpacity.value = withDelay(550, withTiming(1, { duration: 500, easing: easeOutCubic }));
    footerTranslateY.value = withDelay(550, withTiming(0, { duration: 500, easing: easeOutCubic }));
  };

  // ==========================================
  // ANIMATED STYLE SHEETS
  // ==========================================
  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenTranslateY.value }],
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedNameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameTranslateY.value }],
  }));

  const animatedStatsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: statsTranslateY.value }],
  }));

  const animatedTagsStyle = useAnimatedStyle(() => ({
    opacity: tagsOpacity.value,
    transform: [{ translateY: tagsTranslateY.value }],
  }));

  const animatedMenuStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ translateY: menuTranslateY.value }],
  }));

  const animatedFooterStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: footerTranslateY.value }],
  }));

  const animatedSettingsBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: settingsBtnScale.value }],
  }));

  const animatedRetryBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: retryBtnScale.value }],
  }));

  const fetchActiveUserProfileAndMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[Profile Sync] Resolving secure active authentication token...');

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('[Profile Sync Error] User token evaluation failed or session missing:', authError);
        setError('No active credentials verified.');
        setIsLoading(false);
        return;
      }

      const { data: dbProfile, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (dbError) {
        throw dbError;
      }

      setNotificationsEnabled(dbProfile?.notifications_enabled || false);

      setProfile({
        id: user.id,
        username: dbProfile?.username || 'Vyra Curator',
        avatar_url: dbProfile?.avatar_url,
        birth_date: dbProfile?.birth_date,
        gender: dbProfile?.gender,
        created_at: dbProfile?.created_at,
        email: user.email || 'unassigned@vyra.app',
      });

      // Stats Queries execution pipeline
      const { count: totalGarments } = await supabase
        .from('clothing_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const stableGarmentsCount = totalGarments || 0;
      setGarmentsCount(stableGarmentsCount);

      const { count: totalFavorites } = await supabase
        .from('clothing_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_favorite', true);

      setFavoritesCount(totalFavorites || 0);

      const sevenDaysAgoISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentGarments } = await supabase
        .from('clothing_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgoISO);

      setWeeklyCount(recentGarments || 0);

      const { count: totalOutfits } = await supabase
        .from('outfits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setOutfitsCount(totalOutfits || 0);

      if (stableGarmentsCount > 0) {
        const { data: garmentPool, error: poolErr } = await supabase
          .from('clothing_items')
          .select('category, tags')
          .eq('user_id', user.id);

        if (!poolErr && garmentPool) {
          const contentMap: { [key: string]: number } = {};
          garmentPool.forEach(item => {
            if (item.category) {
              contentMap[item.category] = (contentMap[item.category] || 0) + 2;
            }
            if (item.tags && Array.isArray(item.tags)) {
              item.tags.forEach((tag: string) => {
                contentMap[tag] = (contentMap[tag] || 0) + 1;
              });
            }
          });

          const sortedPreferences = Object.keys(contentMap)
            .sort((a, b) => contentMap[b] - contentMap[a])
            .slice(0, 4);

          setStylePreferences(sortedPreferences.length > 0 ? sortedPreferences : ['Wardrobe Fresh']);
        } else {
          setStylePreferences(['Minimalist', 'Casual']);
        }
      } else {
        setStylePreferences([]);
      }

      // Fire entrance animations as soon as data loading has succeeded
      runEntranceAnimations();

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
    Alert.alert(
      'Log Out Account',
      'Are you sure you want to log out of your Vyra profile session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: logOutError } = await supabase.auth.signOut();
              if (logOutError) throw logOutError;
              router.replace('/auth/login');
            } catch (err: any) {
              Alert.alert('Session Error', 'An unexpected error occurred while processing your log-out request.');
            }
          }
        }
      ]
    );
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: value })
        .eq('id', user.id);

      if (error) throw error;
      await syncNotifications(value);
    } catch (err) {
      Alert.alert('Error', 'Could not update notification settings.');
      setNotificationsEnabled(!value);
    }
  };

  const handleItemNavigationTriggers = (item: any) => {
    if (item.type === 'action' && item.label === 'Log Out') {
      handleSystemSignOutRequest();
    } else if (item.id === 'edit_prof') {
      router.push('/profile/edit-profile');
    } else if (item.id === 'favs') {
      router.push('/profile/favorites');
    } else if (item.id === 'history') {
      router.push('/profile/history');
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
        
        {/* Main Content Animated Assembly Area */}
        <Animated.View style={[styles.mainLayoutWrapper, animatedScreenStyle]}>
          
          <View style={styles.headerRow}>
            <SectionHeader 
              title="Profile" 
              style={styles.headerFlexOverride}
            />
            {/* Settings button with spring interactive gesture scaling */}
            <Pressable 
              style={styles.settingsIconButton} 
              onPressIn={() => { settingsBtnScale.value = withSpring(0.92); }}
              onPressOut={() => { settingsBtnScale.value = withSpring(1); }}
              onPress={() => console.log('Settings Interaction Link Activated')}
            >
              <Animated.View style={animatedSettingsBtnStyle}>
                <Ionicons name="settings-outline" size={22} color="#1C1917" />
              </Animated.View>
            </Pressable>
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
              
              <Pressable 
                style={styles.retryControlActionButton} 
                onPressIn={() => { retryBtnScale.value = withSpring(0.95); }}
                onPressOut={() => { retryBtnScale.value = withSpring(1); }}
                onPress={fetchActiveUserProfileAndMetrics}
              >
                <Animated.View style={animatedRetryBtnStyle}>
                  <Text style={styles.retryButtonLabelText}>Retry Connection</Text>
                </Animated.View>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Profile Hero Zoom Card */}
              <Animated.View style={[styles.profileHero, animatedLogoStyle]}>
                <Image
                  source={resolveProfileAvatarSource()}
                  style={styles.avatarImage}
                />
                <Animated.View style={[styles.metaTextWrapper, animatedNameStyle]}>
                  <Text style={styles.profileName}>{profile?.username}</Text>
                  <Text style={styles.profileEmail}>{profile?.email}</Text>
                </Animated.View>
              </Animated.View>

              {/* Dynamic Stats Row Grid */}
              <Animated.View style={[styles.statsRowGrid, animatedStatsStyle]}>
                {DYNAMIC_STATS.map((stat) => (
                  <View key={stat.id} style={styles.statMiniCard}>
                    <MaterialCommunityIcons name={stat.icon as any} size={20} color="#78716C" style={styles.statIcon} />
                    <Text style={styles.statValueText}>{stat.value}</Text>
                    <Text style={styles.statLabelText}>{stat.label}</Text>
                  </View>
                ))}
              </Animated.View>

              {/* Style Preferences Section */}
              <Animated.View style={[styles.sectionBlock, animatedTagsStyle]}>
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
              </Animated.View>

              {/* Menu Sections Container */}
              <Animated.View style={[styles.sectionBlock, animatedMenuStyle]}>
                {DYNAMIC_MENU_SECTIONS.map((section, sectionIdx) => (
                  <View key={sectionIdx} style={styles.menuSectionSpacer}>
                    <SectionTitle withBottomMargin>{section.title}</SectionTitle>
                    <View style={styles.menuGroupCard}>
                      {section.items.map((item, itemIdx) => {
                        const isLastItem = itemIdx === section.items.length - 1;
                        return (
                          <View key={item.id}>
                            <Pressable
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
                                  value={item.id === 'notifications' ? notificationsEnabled : isDarkMode}
                                  onValueChange={item.id === 'notifications' ? handleToggleNotifications : setIsDarkMode}
                                  trackColor={{ false: '#D6D3D1', true: '#1C1917' }}
                                  thumbColor="#FFFFFF"
                                  ios_backgroundColor="#D6D3D1"
                                />
                              )}

                              {item.type === 'chevron' && (
                                <Ionicons name="chevron-forward" size={18} color="#78716C" />
                              )}
                            </Pressable>
                            {!isLastItem && <View style={styles.rowDividerSeparator} />}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </Animated.View>

              {/* Bottom Layout footer text elements */}
              <Animated.View style={[styles.appFooterDetailsContainer, animatedFooterStyle]}>
                <Text style={styles.footerBrandText}>VYRA v0.1.0</Text>
                <Text style={styles.footerSecondaryText}>Made with love for fashion lovers</Text>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  mainLayoutWrapper: {
    flex: 1,
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
  metaTextWrapper: {
    alignItems: 'center',
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
  menuSectionSpacer: {
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