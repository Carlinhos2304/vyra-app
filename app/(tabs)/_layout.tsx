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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function PremiumFloatingTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const dynamicBottomPadding = insets.bottom > 0 ? insets.bottom - 4 : 16;

  return (
    <View style={[styles.absoluteContainer, { bottom: dynamicBottomPadding }]}>
      <BlurView tint="light" intensity={90} style={styles.blurWrapper}>
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
                  <Animated.View style={[styles.premiumCreateCircle, animatedCreateStyle]}>
                    <Ionicons name="add" size={26} color="#FAFAF9" />
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
                  color: isFocused ? '#1C1917' : '#78716C',
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name="hanger" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{}}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
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
        shadowColor: '#1C1917',
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
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(231, 229, 228, 0.6)', 
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
    backgroundColor: '#1C1917',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});