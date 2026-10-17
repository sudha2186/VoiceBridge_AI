import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Language, SUPPORTED_LANGUAGES } from '@/types/language';
import { translations } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  hasSelectedLanguage: boolean;
  isLanguageModalOpen: boolean;
  openLanguageModal: () => void;
  closeLanguageModal: () => void;
  selectLanguageAndClose: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_LANG_KEY = 'voicebridge_language';
const STORAGE_SELECTED_KEY = 'voicebridge_lang_selected';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_LANG_KEY);
      if (stored === 'en' || stored === 'hi' || stored === 'mr') {
        return stored;
      }
    } catch {
      // Fallback
    }
    return 'en';
  });

  const [hasSelectedLanguage, setHasSelectedLanguage] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_SELECTED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Modal opens on first-time onboarding (if user hasn't selected language yet)
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_SELECTED_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
      localStorage.setItem(STORAGE_SELECTED_KEY, 'true');
    } catch {
      // Storage failure protection
    }
    setHasSelectedLanguage(true);
    // Set document lang for accessibility & font support
    document.documentElement.lang = lang;
  }, []);

  const selectLanguageAndClose = useCallback((lang: Language) => {
    setLanguage(lang);
    setIsLanguageModalOpen(false);
  }, [setLanguage]);

  const openLanguageModal = useCallback(() => {
    setIsLanguageModalOpen(true);
  }, []);

  const closeLanguageModal = useCallback(() => {
    setIsLanguageModalOpen(false);
    // Ensure we mark it as dismissed so it doesn't loop
    try {
      localStorage.setItem(STORAGE_SELECTED_KEY, 'true');
    } catch {}
    setHasSelectedLanguage(true);
  }, []);

  // Update document language attribute on mount and change
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Translation helper function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let currentVal: any = translations[language];

      for (const k of keys) {
        if (currentVal && typeof currentVal === 'object' && k in currentVal) {
          currentVal = currentVal[k];
        } else {
          currentVal = undefined;
          break;
        }
      }

      // Fallback to English if translation missing in selected language
      if (currentVal === undefined && language !== 'en') {
        let fallbackVal: any = translations.en;
        for (const k of keys) {
          if (fallbackVal && typeof fallbackVal === 'object' && k in fallbackVal) {
            fallbackVal = fallbackVal[k];
          } else {
            fallbackVal = undefined;
            break;
          }
        }
        currentVal = fallbackVal;
      }

      if (typeof currentVal !== 'string') {
        return key;
      }

      // Replace {param} placeholders
      if (params) {
        return Object.entries(params).reduce((str, [paramKey, val]) => {
          return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        }, currentVal);
      }

      return currentVal;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        hasSelectedLanguage,
        isLanguageModalOpen,
        openLanguageModal,
        closeLanguageModal,
        selectLanguageAndClose,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
