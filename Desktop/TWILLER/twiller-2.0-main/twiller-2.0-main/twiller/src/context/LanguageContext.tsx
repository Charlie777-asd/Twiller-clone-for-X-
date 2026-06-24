"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useTranslation } from "react-i18next";
import "../i18n/config";

export type Language = "English" | "Spanish" | "Hindi" | "Portuguese" | "Chinese" | "French";

interface LanguageContextType {
  currentLanguage: Language;
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
}

const LanguageCtx = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageCtx);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
};

const LANG_MAP: Record<Language, string> = {
  English: 'en',
  Spanish: 'es',
  Hindi: 'hi',
  Portuguese: 'pt',
  Chinese: 'zh',
  French: 'fr'
};

const VALID_LANGUAGES = Object.keys(LANG_MAP) as Language[];

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<Language>("English");
  const { t, i18n } = useTranslation();

  useEffect(() => {
    let langToSet: Language = "English";
    if (user?.language && VALID_LANGUAGES.includes(user.language as Language)) {
      langToSet = user.language as Language;
      localStorage.setItem("twiller-language", user.language);
    } else {
      const stored = localStorage.getItem("twiller-language") as Language;
      if (stored && VALID_LANGUAGES.includes(stored)) {
        langToSet = stored;
      }
    }
    setCurrentLanguage(langToSet);
    i18n.changeLanguage(LANG_MAP[langToSet]);
  }, [user?.language, i18n]);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem("twiller-language", lang);
    i18n.changeLanguage(LANG_MAP[lang]);
  };

  const wrappedT = (key: string): string => {
    const translated = t(key);
    return translated || key;
  };

  return (
    <LanguageCtx.Provider value={{ currentLanguage, t: wrappedT, setLanguage }}>
      {children}
    </LanguageCtx.Provider>
  );
};
