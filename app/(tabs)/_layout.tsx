import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function PremiumFloatingTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const dynamicBottomPadding = insets.bottom > 0 ? insets.bottom - 4 : 16;
  const { theme } = useTheme();

  // Translucent chrome for the floating blur pill — derived from the theme
  // rather than a global token, since this frosted-glass effect is unique
  // to this component.
  const blurTint = theme.dark ? 'dark' : 'light';
  const blurBackground = theme.dark ? 'rgba(27, 27, 27, 0.78)' : 'rgba(255, 255, 255, 0.88)';
  const blurBorder = theme.dark ? 'rgba(46, 46, 46, 0.8)' : 'rgba(231, 229, 228, 0.6)';

  return (
    <View style={[styles.absoluteContainer, { bottom: dynamicBottomPadding, shadowColor: theme.colors.shadow }]}>
      <BlurView tint={blurTint} intensity={90} style={[styles.blurWrapper, { backgroundColor: blurBackground, borderColor: blurBorder }]}>
        <View style={styles.tabContentRow}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            // Reanimated Shared Values for explicit layout transformations
            const scale = useSharedValue(isFocused ? 1.05 : 0.95);
            const opacity = useSharedValue(isFocused ? 1 : 0.6);
            const createPressed = useSharedValue(0);

            useEffect(() => {
              scale.value = withTiming(isFocused ? 1.05 : 0.95, { duration: 250 });
              opacity.value = withTiming(isFocused ? 1 : 0.6, { duration: 250 });
            }, [isFocused]);

            // Safe Animated Style Sheets mapped away from raw primitive inline evaluation arrays
            const animatedIconStyle = useAnimatedStyle(() => ({
              transform: [{ scale: scale.value }],
              opacity: opacity.value,
            }));

            const animatedCreateStyle = useAnimatedStyle(() => ({
              transform: [{
                scale: withTiming(createPressed.value === 1 ? 0.92 : 1, { duration: 150 })
              }]
            }));

            if (route.name === 'create') {
              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onPressIn={() => { createPressed.value = 1; }}
                  onPressOut={() => { createPressed.value = 0; }}
                  style={styles.createButtonViewport}
                >
                  <Animated.View
                    style={[
                      styles.premiumCreateCircle,
                      { backgroundColor: theme.colors.accent, shadowColor: theme.colors.shadow },
                      animatedCreateStyle,
                    ]}
                  >
                    <Ionicons name="add" size={26} color={theme.colors.accentForeground} />
                  </Animated.View>
                </Pressable>
              );
            }

            return (
              <AnimatedPressable
                key={route.key}
                onPress={onPress}
                style={styles.tabItemViewport}
                animatedStyle={animatedIconStyle}
              >
                {options.tabBarIcon && options.tabBarIcon({
                  color: isFocused ? theme.colors.accent : theme.colors.textSecondary,
                  focused: isFocused,
                  size: 24
                })}
              </AnimatedPressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      tabBar={(props) => <PremiumFloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarAccessibilityLabel: t('tabs.tabBar.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          tabBarAccessibilityLabel: t('tabs.tabBar.closet'),
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name="hanger" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarAccessibilityLabel: t('tabs.tabBar.create'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarAccessibilityLabel: t('tabs.tabBar.calendar'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarAccessibilityLabel: t('tabs.tabBar.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignSelf: 'center',
    borderRadius: 32,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  blurWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tabContentRow: {
    flexDirection: 'row',
    height: 68,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItemViewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  createButtonViewport: {
    width: 60,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  premiumCreateCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});
