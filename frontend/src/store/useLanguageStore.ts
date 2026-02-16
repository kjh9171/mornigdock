import { create } from 'zustand';
import i18n from '../i18n';

type Language = 'ko' | 'en';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'ko',
  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
  },
  toggleLanguage: () => set((state) => {
    const newLang = state.language === 'ko' ? 'en' : 'ko';
    i18n.changeLanguage(newLang);
    return { language: newLang };
  }),
}));
