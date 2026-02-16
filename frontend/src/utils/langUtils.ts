import { useLanguageStore } from '../store/useLanguageStore';

export type LocalizedText = {
  ko: string;
  en: string;
};

export const useLocalizedContent = () => {
  const { language } = useLanguageStore();

  const ln = (content: LocalizedText | string) => {
    if (typeof content === 'string') return content;
    return content[language] || content['ko']; // Default to Korean if missing
  };

  return { ln, language };
};
