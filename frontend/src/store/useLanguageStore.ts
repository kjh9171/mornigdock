// frontend/src/store/useLanguageStore.ts

import { create } from 'zustand';
import i18n from 'i18next'; // i18n 모듈은 나중에 구현합니다.

interface LanguageState {
  language: string;
  setLanguage: (lang: string) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: localStorage.getItem('language') || 'ko', // 기본 언어는 'ko'
  
  setLanguage: (lang: string) => {
    i18n.changeLanguage(lang); // i18n 모듈에 언어 변경 요청
    localStorage.setItem('language', lang);
    set({ language: lang });
  },

  toggleLanguage: () => {
    set((state) => {
      const newLang = state.language === 'ko' ? 'en' : 'ko';
      i18n.changeLanguage(newLang); // i18n 모듈에 언어 변경 요청
      localStorage.setItem('language', newLang);
      return { language: newLang };
    });
  },
}));
