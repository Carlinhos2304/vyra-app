import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './translations';

/**
 * Vyra — Internationalization (i18n).
 *
 * Deliberately mirrors theme/ThemeContext.tsx's architecture (same
 * AsyncStorage-persisted Context provider with an isLoaded gate) so anyone
 * already familiar with the theme system recognizes this immediately. Two
 * languages only for now — English and Spanish — with English always the
 * default for a first-time user (never inferred from device locale; that
 * was an explicit product decision, not an oversight).
 *
 * Usage: `const { t } = useLanguage();` then `t('common.cancel')` or, for
 * strings with placeholders, `t('home.greeting.morning', { name: 'Carlos' })`
 * where the translation string itself contains `{{name}}`.
 */

export type LanguageType = 'en' | 'es';

type TranslationParams = Record<string, string | number>;

type LanguageContextType = {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const LANGUAGE_STORAGE_KEY = '@vyra_language_preference';
const DEFAULT_LANGUAGE: LanguageType = 'en';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function resolvePath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
    const value = params[token];
    return value === undefined ? match : String(value);
  });
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>(DEFAULT_LANGUAGE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === 'en' || saved === 'es') {
          setLanguageState(saved);
        }
      } catch (e) {
        console.error('Failed to load language preference', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadPreference();
  }, []);

  const setLanguage = useCallback((lang: LanguageType) => {
    setLanguageState(lang);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang).catch((e) => {
      console.error('Failed to save language preference', e);
    });
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      const dict = translations[language];
      let value = resolvePath(dict, key);

      if (value === undefined && language !== 'en') {
        // Missing Spanish string — fall back to English rather than
        // showing a raw key to the user.
        value = resolvePath(translations.en, key);
      }

      if (typeof value !== 'string') {
        if (__DEV__) {
          console.warn(`[i18n] Missing translation key: "${key}"`);
        }
        return key;
      }

      return interpolate(value, params);
    },
    [language]
  );

  const contextValue = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  if (!isLoaded) return null;

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
