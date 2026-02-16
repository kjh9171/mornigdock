import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
// (tip: move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      "welcome": "Welcome to Agora",
      "subtitle": "High-End Global Platform",
      "loading": "Simulating AI Analysis...",
      "login": "Login with Email",
      "news": "Latest Intelligence",
      "admin": "Admin Console"
    }
  },
  ko: {
    translation: {
      "welcome": "아고라에 오신 것을 환영합니다",
      "subtitle": "고품격 글로벌 플랫폼",
      "loading": "AI 분석 시뮬레이션 중...",
      "login": "이메일로 로그인",
      "news": "최신 인텔리전스",
      "admin": "관리자 콘솔"
    }
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "ko", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

  export default i18n;
