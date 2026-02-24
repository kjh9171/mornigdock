import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// ── 언어 컨텍스트 ──────────────────────────────────────────
interface LangContextType {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
}

const LANGS = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  ko: {
    news:          '뉴스지능',
    finance:       '금융분석',
    board:         '아고라광장',
    media:         '미디어',
    admin:         '관제실',
    search_placeholder: '검색어를 입력하세요...',
    notifications: '알림',
    all_read:      '모두 읽음',
    no_notifications: '알림이 없습니다',
    just_now:      '방금 전',
    refresh:       '새로고침',
    grid:          '그리드',
    list:          '목록',
  },
  en: {
    news:          'News',
    finance:       'Finance',
    board:         'Board',
    media:         'Media',
    admin:         'Admin',
    search_placeholder: 'Search...',
    notifications: 'Notifications',
    all_read:      'Mark all read',
    no_notifications: 'No notifications',
    just_now:      'Just now',
    refresh:       'Refresh',
    grid:          'Grid',
    list:          'List',
  },
  ja: {
    news:          'ニュース',
    finance:       '金融分析',
    board:         '掲示板',
    media:         'メディア',
    admin:         '管理室',
    search_placeholder: '検索...',
    notifications: '通知',
    all_read:      '全部既読',
    no_notifications: '通知なし',
    just_now:      'たった今',
    refresh:       '更新',
    grid:          'グリッド',
    list:          'リスト',
  },
  zh: {
    news:          '新闻',
    finance:       '金融分析',
    board:         '论坛',
    media:         '媒体',
    admin:         '管理室',
    search_placeholder: '搜索...',
    notifications: '通知',
    all_read:      '全部已读',
    no_notifications: '暂无通知',
    just_now:      '刚刚',
    refresh:       '刷新',
    grid:          '网格',
    list:          '列表',
  },
};

export const LangContext = createContext<LangContextType>({
  lang: 'ko',
  setLang: function() {},
  t: function(key) { return key; },
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState(function() {
    return localStorage.getItem('agora_lang') || 'ko';
  });

  function setLang(code: string) {
    setLangState(code);
    localStorage.setItem('agora_lang', code);
    document.documentElement.lang = code;
  }

  function t(key: string): string {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['ko']?.[key] || key;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

// ── LanguageSwitcher UI 컴포넌트 ───────────────────────────
export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  const current = LANGS.find(function(l) { return l.code === lang; }) || LANGS[0];

  useEffect(function() {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={function() { setOpen(function(v) { return !v; }); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all text-sm font-black text-slate-600"
      >
        <span>{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
        <ChevronDown size={12} className={'transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-36 bg-white rounded-2xl shadow-2xl shadow-slate-900/15 border border-slate-100 z-50 overflow-hidden py-1">
          {LANGS.map(function(l) {
            return (
              <button
                key={l.code}
                onClick={function() { setLang(l.code); setOpen(false); }}
                className={'w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left ' + (lang === l.code ? 'bg-slate-50' : '')}
              >
                <span className="text-base">{l.flag}</span>
                <span className="text-sm font-black text-slate-700 flex-1">{l.label}</span>
                {lang === l.code && <Check size={12} className="text-emerald-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}