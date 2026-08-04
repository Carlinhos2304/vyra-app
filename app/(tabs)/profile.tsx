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
import { PremiumTouchable } from '../../components/ui/PremiumTouchable';
import { useNotifications } from '../../hooks/useNotifications';
import { useTheme } from '../../theme';
import { useLanguage, LanguageType } from '../../i18n';

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

function buildMenuSections(t: (key: string) => string) {
  return [
    {
      title: t('profile.main.sectionMyActivity'),
      items: [
        { id: 'favs', label: t('profile.main.favorites'), icon: 'heart-outline', type: 'chevron', badge: '0' },
        { id: 'history', label: t('profile.main.historyLog'), icon: 'history', type: 'chevron' },
      ],
    },
    {
      title: t('profile.main.sectionPreferences'),
      items: [
        { id: 'appearance', label: t('profile.main.appearance'), icon: 'theme-light-dark', type: 'segmented' },
        { id: 'language', label: t('profile.main.language'), icon: 'translate', type: 'language-segmented' },
        { id: 'notifications', label: t('profile.main.pushNotifications'), icon: 'bell-outline', type: 'toggle' },
      ],
    },
    {
      title: t('profile.main.sectionAccountSecurity'),
      items: [
        { id: 'edit_prof', label: t('profile.main.editProfile'), icon: 'account-edit-outline', type: 'chevron' },
        { id: 'logout', label: t('profile.main.logOut'), icon: 'logout', type: 'action', danger: true },
      ],
    },
  ];
}

function buildAppearanceOptions(t: (key: string) => string): { id: 'light' | 'dark' | 'system'; label: string }[] {
  return [
    { id: 'light', label: t('profile.main.appearanceLight') },
    { id: 'dark', label: t('profile.main.appearanceDark') },
    { id: 'system', label: t('profile.main.appearanceSystem') },
  ];
}

function buildLanguageOptions(t: (key: string) => string): { id: LanguageType; label: string }[] {
  return [
    { id: 'en', label: t('profile.main.languageEnglish') },
    { id: 'es', label: t('profile.main.languageSpanish') },
  ];
}

export default function ProfileScreen() {
  const { theme, themeType, setThemeType } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const MENU_SECTIONS = buildMenuSections(t);
  const APPEARANCE_OPTIONS = buildAppearanceOptions(t);
  const LANGUAGE_OPTIONS = buildLanguageOptions(t);
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

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('[Profile Sync Error] User token evaluation failed or session missing:', authError);
        setError(t('profile.main.noActiveCredentials'));
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
      setError(err.message || t('profile.main.unhandledException'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveUserProfileAndMetrics();
  }, []);

  const handleSystemSignOutRequest = () => {
    Alert.alert(
      t('profile.main.logOutDialogTitle'),
      t('profile.main.logOutDialogMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.main.logOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: logOutError } = await supabase.auth.signOut();
              if (logOutError) throw logOutError;
              router.replace('/auth/login');
            } catch (err: any) {
              Alert.alert(t('profile.main.sessionErrorTitle'), t('profile.main.sessionErrorMessage'));
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
      Alert.alert(t('common.error'), t('profile.main.notificationsErrorMessage'));
      setNotificationsEnabled(!value);
    }
  };

  const handleItemNavigationTriggers = (item: any) => {
    if (item.type === 'action' && item.id === 'logout') {
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
    // Not user-visible text — just the seed name ui-avatars.com uses to
    // generate placeholder initials, so it's intentionally not translated.
    const cleanLabelFallback = profile?.username || 'User';
    return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanLabelFallback)}&background=F5F5F4&color=1C1917&size=200` };
  };

  const DYNAMIC_STATS = [
    { id: 1, label: t('profile.main.statGarments'), value: String(garmentsCount), icon: 'hanger' },
    { id: 2, label: t('profile.main.statOutfits'), value: String(outfitsCount), icon: 'sparkles' },
    { id: 3, label: t('profile.main.statThisWeek'), value: String(weeklyCount), icon: 'calendar-blank' },
  ];

  const DYNAMIC_MENU_SECTIONS = MENU_SECTIONS.map(section => {
    return {
      ...section,
      items: section.items.map(item =>
        item.id === 'favs' ? { ...item, badge: String(favoritesCount) } : item
      )
    };
  });

  return (
    <PremiumScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Main Content Animated Assembly Area */}
        <Animated.View style={[styles.mainLayoutWrapper, animatedScreenStyle]}>

          <View style={styles.headerRow}>
            <SectionHeader
              title={t('profile.main.title')}
              style={styles.headerFlexOverride}
            />
            {/* Settings button with spring interactive gesture scaling */}
            <Pressable
              style={styles.settingsIconButton}
              onPressIn={() => { settingsBtnScale.value = withSpring(0.92); }}
              onPressOut={() => { settingsBtnScale.value = withSpring(1); }}
            >
              <Animated.View style={animatedSettingsBtnStyle}>
                <Ionicons name="settings-outline" size={22} color={theme.colors.textPrimary} />
              </Animated.View>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.stateCenterLoaderFrame}>
              <PremiumLoader label={t('profile.main.loadingProfile')} />
            </View>
          ) : error ? (
            <View style={styles.stateCenterLoaderFrame}>
              <MaterialCommunityIcons name="cloud-off-outline" size={32} color={theme.colors.danger} />
              <Text style={[styles.errorHeaderTypography, { color: theme.colors.textPrimary }]}>{t('profile.main.loadFaultTitle')}</Text>
              <Text style={[styles.errorSubTypography, { color: theme.colors.textSecondary }]}>{error}</Text>

              <Pressable
                style={[styles.retryControlActionButton, { backgroundColor: theme.colors.accent }]}
                onPressIn={() => { retryBtnScale.value = withSpring(0.95); }}
                onPressOut={() => { retryBtnScale.value = withSpring(1); }}
                onPress={fetchActiveUserProfileAndMetrics}
              >
                <Animated.View style={animatedRetryBtnStyle}>
                  <Text style={[styles.retryButtonLabelText, { color: theme.colors.accentForeground }]}>{t('profile.main.retryConnection')}</Text>
                </Animated.View>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Profile Hero Zoom Card */}
              <Animated.View style={[styles.profileHero, animatedLogoStyle]}>
                <Image
                  source={resolveProfileAvatarSource()}
                  style={[styles.avatarImage, { backgroundColor: theme.colors.surfaceSecondary }]}
                />
                <Animated.View style={[styles.metaTextWrapper, animatedNameStyle]}>
                  <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>{profile?.username}</Text>
                  <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>{profile?.email}</Text>
                </Animated.View>
              </Animated.View>

              {/* Dynamic Stats Row Grid */}
              <Animated.View style={[styles.statsRowGrid, animatedStatsStyle]}>
                {DYNAMIC_STATS.map((stat) => (
                  <View key={stat.id} style={[styles.statMiniCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
                    <MaterialCommunityIcons name={stat.icon as any} size={20} color={theme.colors.textSecondary} style={styles.statIcon} />
                    <Text style={[styles.statValueText, { color: theme.colors.textPrimary }]}>{stat.value}</Text>
                    <Text style={[styles.statLabelText, { color: theme.colors.textSecondary }]}>{stat.label}</Text>
                  </View>
                ))}
              </Animated.View>

              {/* Style Preferences Section */}
              <Animated.View style={[styles.sectionBlock, animatedTagsStyle]}>
                <SectionTitle withBottomMargin>{t('profile.main.stylePreferencesTitle')}</SectionTitle>
                <View style={styles.tagsContainerRow}>
                  {stylePreferences.length > 0 ? (
                    stylePreferences.map((preference, index) => (
                      <View key={index} style={[styles.preferenceTagBadge, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                        <Text style={[styles.preferenceTagText, { color: theme.colors.textPrimary }]}>{preference}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyPreferencesTagBadge}>
                      <Text style={[styles.emptyPreferencesTagText, { color: theme.colors.textSecondary }]}>{t('profile.main.noStyleProfileYet')}</Text>
                    </View>
                  )}
                </View>
              </Animated.View>

              {/* Menu Sections Container */}
              <Animated.View style={[styles.sectionBlock, animatedMenuStyle]}>
                {DYNAMIC_MENU_SECTIONS.map((section, sectionIdx) => (
                  <View key={sectionIdx} style={styles.menuSectionSpacer}>
                    <SectionTitle withBottomMargin>{section.title}</SectionTitle>
                    <View style={[styles.menuGroupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
                      {section.items.map((item, itemIdx) => {
                        const isLastItem = itemIdx === section.items.length - 1;

                        if (item.type === 'segmented') {
                          // "Appearance" — the entry point for the theme system
                          // built for this feature (Light / Dark / System),
                          // driven by ThemeContext.setThemeType.
                          return (
                            <View key={item.id}>
                              <View style={[styles.menuRowItem, styles.appearanceRow]}>
                                <View style={styles.menuRowLeftBlock}>
                                  <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={20}
                                    color={theme.colors.textSecondary}
                                    style={styles.menuItemIcon}
                                  />
                                  <Text style={[styles.menuItemLabel, { color: theme.colors.textPrimary }]}>
                                    {item.label}
                                  </Text>
                                </View>
                                <View style={[styles.appearanceSegmentedTrack, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                                  {APPEARANCE_OPTIONS.map((option) => {
                                    const isActive = themeType === option.id;
                                    return (
                                      <PremiumTouchable
                                        key={option.id}
                                        onPress={() => setThemeType(option.id)}
                                        style={[
                                          styles.appearanceSegmentedPill,
                                          isActive && { backgroundColor: theme.colors.accent },
                                        ]}
                                      >
                                        <Text style={[
                                          styles.appearanceSegmentedLabel,
                                          { color: isActive ? theme.colors.accentForeground : theme.colors.textSecondary },
                                        ]}>
                                          {option.label}
                                        </Text>
                                      </PremiumTouchable>
                                    );
                                  })}
                                </View>
                              </View>
                              {!isLastItem && <View style={[styles.rowDividerSeparator, { backgroundColor: theme.colors.surfaceSecondary }]} />}
                            </View>
                          );
                        }

                        if (item.type === 'language-segmented') {
                          // "Language" — the toggle for the i18n system,
                          // built the same way as "Appearance" above, driven
                          // by LanguageContext.setLanguage.
                          return (
                            <View key={item.id}>
                              <View style={[styles.menuRowItem, styles.appearanceRow]}>
                                <View style={styles.menuRowLeftBlock}>
                                  <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={20}
                                    color={theme.colors.textSecondary}
                                    style={styles.menuItemIcon}
                                  />
                                  <Text style={[styles.menuItemLabel, { color: theme.colors.textPrimary }]}>
                                    {item.label}
                                  </Text>
                                </View>
                                <View style={[styles.appearanceSegmentedTrack, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                                  {LANGUAGE_OPTIONS.map((option) => {
                                    const isActive = language === option.id;
                                    return (
                                      <PremiumTouchable
                                        key={option.id}
                                        onPress={() => setLanguage(option.id)}
                                        style={[
                                          styles.appearanceSegmentedPill,
                                          isActive && { backgroundColor: theme.colors.accent },
                                        ]}
                                      >
                                        <Text style={[
                                          styles.appearanceSegmentedLabel,
                                          { color: isActive ? theme.colors.accentForeground : theme.colors.textSecondary },
                                        ]}>
                                          {option.label}
                                        </Text>
                                      </PremiumTouchable>
                                    );
                                  })}
                                </View>
                              </View>
                              {!isLastItem && <View style={[styles.rowDividerSeparator, { backgroundColor: theme.colors.surfaceSecondary }]} />}
                            </View>
                          );
                        }

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
                                  color={item.danger ? theme.colors.danger : theme.colors.textSecondary}
                                  style={styles.menuItemIcon}
                                />
                                <Text style={[styles.menuItemLabel, { color: item.danger ? theme.colors.danger : theme.colors.textPrimary }]}>
                                  {item.label}
                                </Text>
                                {item.badge && (
                                  <View style={[styles.counterBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
                                    <Text style={[styles.counterBadgeText, { color: theme.colors.textSecondary }]}>{item.badge}</Text>
                                  </View>
                                )}
                              </View>

                              {item.type === 'toggle' && (
                                <Switch
                                  value={notificationsEnabled}
                                  onValueChange={handleToggleNotifications}
                                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                                  thumbColor={theme.colors.surface}
                                  ios_backgroundColor={theme.colors.border}
                                />
                              )}

                              {item.type === 'chevron' && (
                                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                              )}
                            </Pressable>
                            {!isLastItem && <View style={[styles.rowDividerSeparator, { backgroundColor: theme.colors.surfaceSecondary }]} />}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </Animated.View>

              {/* Bottom Layout footer text elements */}
              <Animated.View style={[styles.appFooterDetailsContainer, animatedFooterStyle]}>
                <Text style={[styles.footerBrandText, { color: theme.colors.textSecondary }]}>VYRA v0.1.0</Text>
                <Text style={[styles.footerSecondaryText, { color: theme.colors.textSecondary }]}>{t('profile.main.footerTagline')}</Text>
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
    marginBottom: 14,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
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
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
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
    marginBottom: 2,
  },
  statLabelText: {
    fontSize: 11,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  preferenceTagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyPreferencesTagBadge: {
    paddingVertical: 4,
  },
  emptyPreferencesTagText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
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
  appearanceRow: {
    height: undefined,
    flexWrap: 'wrap',
    rowGap: 10,
  },
  appearanceSegmentedTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  appearanceSegmentedPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appearanceSegmentedLabel: {
    fontSize: 12,
    fontWeight: '600',
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
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  rowDividerSeparator: {
    height: 1,
    marginLeft: 50,
  },
  appFooterDetailsContainer: {
    marginTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  footerBrandText: {
    fontSize: 12,
    fontWeight: '400',
  },
  footerSecondaryText: {
    fontSize: 11,
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
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 4,
  },
  errorSubTypography: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryControlActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryButtonLabelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
