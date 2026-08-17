import { commonEn, commonEs } from './common';
import { homeEn, homeEs } from './home';
import { profileMainEn, profileMainEs } from './profileMain';
import { profileSubEn, profileSubEs } from './profileSub';
import { authEn, authEs } from './auth';
import { onboardingEn, onboardingEs } from './onboarding';
import { plannerEn, plannerEs } from './planner';
import { clothingEn, clothingEs } from './clothing';
import { tabsCoreEn, tabsCoreEs } from './tabsCore';
import { outfitAiEn, outfitAiEs } from './outfitAi';
import { outfitRecommendEn, outfitRecommendEs } from './outfitRecommend';
import { notificationsEn, notificationsEs } from './notifications';

/**
 * Central merge point — every namespace file lives in this directory and
 * gets combined here into the two locale trees `en`/`es` that
 * LanguageContext.tsx does dot-path lookups against (e.g. `t('common.cancel')`,
 * `t('home.weather.title')`, `t('profile.main.title')`).
 *
 * Adding a new namespace: create `i18n/translations/<name>.ts` exporting
 * `<name>En`/`<name>Es` objects, import them here, and add them to both
 * `en` and `es` below under the same key.
 */
export const translations = {
  en: {
    common: commonEn,
    home: homeEn,
    profile: {
      main: profileMainEn,
      ...profileSubEn,
    },
    auth: authEn,
    onboarding: onboardingEn,
    planner: plannerEn,
    clothing: clothingEn,
    tabs: tabsCoreEn,
    outfitAi: outfitAiEn,
    outfitRecommend: outfitRecommendEn,
    notifications: notificationsEn,
  },
  es: {
    common: commonEs,
    home: homeEs,
    profile: {
      main: profileMainEs,
      ...profileSubEs,
    },
    auth: authEs,
    onboarding: onboardingEs,
    planner: plannerEs,
    clothing: clothingEs,
    tabs: tabsCoreEs,
    outfitAi: outfitAiEs,
    outfitRecommend: outfitRecommendEs,
    notifications: notificationsEs,
  },
};

export type Translations = typeof translations.en;
