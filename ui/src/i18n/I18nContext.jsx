import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './en.json';
import te from './te.json';
import hi from './hi.json';
import ta from './ta.json';

const translations = { en, te, hi, ta };

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('carepilot_lang') || 'en';
  });

  const setLang = (newLang) => {
    if (translations[newLang]) {
      setLangState(newLang);
      localStorage.setItem('carepilot_lang', newLang);
      document.documentElement.lang = newLang;
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Translation helper supporting dotted key access: t('nav.dashboard')
  const t = (key, fallback = '') => {
    const keys = key.split('.');
    let current = translations[lang];
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        // Fallback to English
        let enCurrent = translations['en'];
        for (const enK of keys) {
          if (enCurrent && typeof enCurrent === 'object' && enK in enCurrent) {
            enCurrent = enCurrent[enK];
          } else {
            return fallback || key;
          }
        }
        return enCurrent || fallback || key;
      }
    }
    return current || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, availableLanguages: [
      { code: 'en', label: 'English', native: 'English' },
      { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
      { code: 'te', label: 'Telugu', native: 'తెలుగు' },
      { code: 'ta', label: 'Tamil', native: 'தமிழ்' }
    ] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useT must be used within an I18nProvider');
  }
  return context;
}
