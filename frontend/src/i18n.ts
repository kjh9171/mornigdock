// frontend/src/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 언어 리소스 정의
const resources = {
  ko: {
    translation: {
      // 일반 UI 텍스트
      "login_tab": "로그인",
      "signup_tab": "회원가입",
      "register": "가입하기",
      "login_subtitle": "인증된 요원만 접근 가능합니다.",
      "signup_subtitle": "보안 프로토콜에 따라 계정을 생성합니다.",
      "name_label": "요원 이름",
      "name_placeholder": "성함을 입력하세요",
      "email_label": "이메일",
      "email_placeholder": "email@agora.com",
      "password_label": "비밀번호",
      "otp_label": "OTP 코드",
      "otp_placeholder": "000000",
      "enter_otp": "OTP 확인",
      "back_to_info": "정보 입력으로 돌아가기",
      "signup_success": "Google Authenticator로 QR 코드를 스캔하세요.",

      // 내비게이션
      "뉴스지능": "뉴스지능",
      "금융분석": "금융분석",
      "아고라광장": "아고라광장",
      "미디어": "미디어",
      "관제실": "관제실",
      
      // 기타
      "back_to_hq": "기지 복귀",
      "write_insight": "인사이트 등록",
      "subject": "제목",
      "content_placeholder": "요원들과 공유할 통찰을 작성하세요...",
      "category": "카테고리",
      "general": "일반",
      "tech": "기술",
      "economy": "경제",
      "environment": "환경",
      "news_analysis": "뉴스 분석",
      "all": "전체",
    }
  },
  en: {
    translation: {
      // General UI text
      "login_tab": "LOGIN",
      "signup_tab": "SIGN UP",
      "register": "REGISTER",
      "login_subtitle": "AUTHORIZED PERSONNEL ONLY",
      "signup_subtitle": "CREATE ACCOUNT VIA SECURE PROTOCOL",
      "name_label": "AGENT NAME",
      "name_placeholder": "ENTER YOUR NAME",
      "email_label": "EMAIL IDENTITY",
      "email_placeholder": "email@agora.com",
      "password_label": "ACCESS KEY",
      "otp_label": "OTP CODE",
      "otp_placeholder": "000000",
      "enter_otp": "VERIFY OTP",
      "back_to_info": "BACK TO CREDENTIALS",
      "signup_success": "SCAN QR WITH GOOGLE AUTHENTICATOR",

      // Navigation
      "뉴스지능": "NEWS INTEL",
      "금융분석": "FINANCE ANALYTICS",
      "아고라광장": "AGORA SQUARE",
      "미디어": "MEDIA",
      "관제실": "CONTROL ROOM",

      // Other
      "back_to_hq": "BACK TO HQ",
      "write_insight": "DEPLOY INSIGHT",
      "subject": "SUBJECT",
      "content_placeholder": "WRITE YOUR INSIGHT TO SHARE WITH AGENTS...",
      "category": "CATEGORY",
      "general": "GENERAL",
      "tech": "TECH",
      "economy": "ECONOMY",
      "environment": "ENVIRONMENT",
      "news_analysis": "NEWS ANALYSIS",
      "all": "ALL",
    }
  }
};

i18n
  .use(initReactI18next) // i18n을 react-i18next에 연결
  .init({
    resources,          // 위에서 정의한 리소스
    lng: localStorage.getItem('language') || 'ko', // 기본 언어 설정 (로컬 스토리지에 저장된 값 또는 'ko')
    fallbackLng: 'en',  // 현재 언어를 찾을 수 없을 때 사용할 언어
    interpolation: {
      escapeValue: false // React는 XSS 방지를 기본적으로 제공하므로 escapeValue를 false로 설정
    }
  });

export default i18n;
