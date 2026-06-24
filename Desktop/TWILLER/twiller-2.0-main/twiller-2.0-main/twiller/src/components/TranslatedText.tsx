"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axiosInstance";

interface TranslatedTextProps {
  text: string;
  className?: string;
}

// Simple in-memory cache to prevent duplicate translation requests
const translationCache: Record<string, Record<string, string>> = {};

export default function TranslatedText({ text, className }: TranslatedTextProps) {
  const { currentLanguage } = useLanguage();
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    if (!text) {
      setTranslated("");
      return;
    }
    
    if (currentLanguage === "English") {
      setTranslated(text);
      return;
    }

    // Check cache
    if (translationCache[currentLanguage]?.[text]) {
      setTranslated(translationCache[currentLanguage][text]);
      return;
    }

    let active = true;
    const performTranslation = async () => {
      try {
        const res = await axiosInstance.post("/translate", {
          text,
          targetLang: currentLanguage
        });
        if (active && res.data?.translated) {
          const translatedVal = res.data.translated;
          if (!translationCache[currentLanguage]) {
            translationCache[currentLanguage] = {};
          }
          translationCache[currentLanguage][text] = translatedVal;
          setTranslated(translatedVal);
        }
      } catch (err) {
        console.warn("Translation failed, falling back to original:", err);
        if (active) setTranslated(text);
      }
    };

    performTranslation();

    return () => {
      active = false;
    };
  }, [text, currentLanguage]);

  return <span className={className}>{translated}</span>;
}
