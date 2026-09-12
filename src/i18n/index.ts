import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './locales/es.json';

// Only Spanish is shipped today, but the app targets Spanish-speaking users
// regardless of device locale — new languages are added by dropping a file
// in locales/ and registering it in `resources` + `supportedLanguages` below.
export const supportedLanguages = ['es'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
const fallbackLanguage: SupportedLanguage = 'es';

const resources = {
  es: { translation: es },
};

function resolveDeviceLanguage(): SupportedLanguage {
  const deviceLanguage = getLocales()[0]?.languageCode;
  return supportedLanguages.includes(deviceLanguage as SupportedLanguage)
    ? (deviceLanguage as SupportedLanguage)
    : fallbackLanguage;
}

i18n.use(initReactI18next).init({
  resources,
  lng: resolveDeviceLanguage(),
  fallbackLng: fallbackLanguage,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
