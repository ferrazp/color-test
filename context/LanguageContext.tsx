import { getLocales } from 'expo-localization';
import { ReactNode, createContext, useContext, useMemo } from 'react';
import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import pt from '../locales/pt.json';
import { ColorId } from '../lib/colors';

const DICTIONARIES = { en, es, pt, fr, de } as const;
type LocaleCode = keyof typeof DICTIONARIES;
type UiKey = keyof typeof en.ui;

function isSupportedLocale(code: string | null): code is LocaleCode {
  return code !== null && code in DICTIONARIES;
}

function resolveLocale(): LocaleCode {
  const deviceCode = getLocales()[0]?.languageCode ?? null;
  return isSupportedLocale(deviceCode) ? deviceCode : 'en';
}

type LanguageContextValue = {
  locale: LocaleCode;
  t: (key: UiKey) => string;
  colorName: (id: ColorId) => string;
  instructionsSteps: string[];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const value = useMemo<LanguageContextValue>(() => {
    const locale = resolveLocale();
    const dictionary = DICTIONARIES[locale];
    return {
      locale,
      t: (key) => dictionary.ui[key],
      colorName: (id) => dictionary.colors[id],
      instructionsSteps: dictionary.instructionsSteps,
    };
  }, []);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
