import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useColorScheme, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, lightTheme, darkTheme } from './theme';

type ThemeType = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: Theme;
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
};

const THEME_STORAGE_KEY = '@vyra_theme_preference';
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeTypeState] = useState<ThemeType>('system');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Use a ref for the opacity to create a smooth fade for the entire app container
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Load saved preference
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved) {
          setThemeTypeState(saved as ThemeType);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadPreference();
  }, []);

  const setThemeType = async (type: ThemeType) => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0.8,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setThemeTypeState(type);
      // Fade back in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, type);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const theme = useMemo(() => {
    if (themeType === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeType === 'dark' ? darkTheme : lightTheme;
  }, [themeType, systemColorScheme]);

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, themeType, setThemeType }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {children}
      </Animated.View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
