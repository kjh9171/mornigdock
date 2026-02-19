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
      "admin": "Admin Console",
      "search": "Search for intelligence...",
      "all": "All",
      "tech": "Tech",
      "economy": "Economy",
      "environment": "Environment",
      "analyze": "AI Analyze",
      "analyzing": "Analyzing...",
      "analysis_complete": "Analysis Complete",
      "key_points": "Key Points",
      "market_impact": "Market Impact",
      "strategic_advice": "Strategic Advice",
      "comments": "Comments",
      "write_comment": "Write a comment...",
      "submit": "Submit",
      "login_required": "Login required to comment",
      "admin_panel": "Admin Control Center",
      "user_tracking": "User Activity Tracking",
      "content_management": "Content Management",
      "system_settings": "System Settings",
      "email": "Email",
      "action": "Action",
      "target": "Target",
      "time": "Time",
      "ip": "IP Address",
      "logout": "Logout",
      "media_center": "Media Center",
      "discussion": "Discussion Board"
    }
  },
  ko: {
    translation: {
      "welcome": "아고라에 오신 것을 환영합니다",
      "subtitle": "고품격 글로벌 플랫폼",
      "loading": "AI 분석 시뮬레이션 중...",
      "login": "이메일로 로그인",
      "news": "최신 인텔리전스",
      "admin": "관리자 콘솔",
      "search": "인텔리전스 검색...",
      "all": "전체",
      "tech": "기술",
      "economy": "경제",
      "environment": "환경",
      "analyze": "AI 분석",
      "analyzing": "분석 중...",
      "analysis_complete": "분석 완료",
      "key_points": "핵심 요약",
      "market_impact": "시장 영향",
      "strategic_advice": "전략 조언",
      "comments": "의견",
      "write_comment": "의견을 작성하세요...",
      "submit": "등록",
      "login_required": "로그인이 필요합니다",
      "admin_panel": "통합 관제 센터",
      "user_tracking": "사용자 활동 추적",
      "content_management": "콘텐츠 관리",
      "system_settings": "시스템 설정",
      "email": "이메일",
      "action": "활동",
      "target": "대상",
      "time": "시간",
      "ip": "IP 주소",
      "logout": "로그아웃",
      "media_center": "미디어 센터",
      "discussion": "토론 광장"
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
