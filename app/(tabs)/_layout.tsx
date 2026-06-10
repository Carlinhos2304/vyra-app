import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#1C1917', // Derived from --primary token in theme.css
        tabBarInactiveTintColor: '#78716C', // Derived from --muted-foreground token in theme.css
        tabBarStyle: [styles.tabBar,{
            height: 60 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 10),
          },],
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={focused ? 24 : 22} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: 'Closet',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "hanger" : "hanger"} 
              size={focused ? 24 : 22} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.createIconContainer, focused && styles.createIconContainerActive]}>
              <Ionicons 
                name="add" 
                size={24} 
                color={focused ? '#FAFAF9' : '#1C1917'} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "calendar" : "calendar-outline"} 
              size={focused ? 24 : 22} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={focused ? 24 : 22} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: '#FFFFFF', // Mapped from --card token in theme.css
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4', // Mapped from --border token in theme.css
    paddingTop: 8,
    elevation: 4,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  tabBarItem: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500', // Mapped from --font-weight-medium token in theme.css
    marginTop: 4,
  },
  createIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F5F5F4', // Mapped from --secondary token in theme.css
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  createIconContainerActive: {
    backgroundColor: '#1C1917', // Active primary dark block style override
    borderColor: '#1C1917',
  },
});