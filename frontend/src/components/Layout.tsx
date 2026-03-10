import { Outlet, Link, useLocation } from 'react-router';
import { useAuthStore } from '../store/useAuthStore';
import {
  Newspaper, Tv, Shield, LogOut,
  MessageSquare, BarChart3, Bell, Search,
  Menu, X, TrendingUp, Info, CheckCheck, ChevronDown, Check,
  ArrowRight, Clock, Flame
} from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { getNotificationsAPI } from '../lib/api';

// ═══════════════════════════════════════════════════════════
// 1. 언어 컨텍스트
// ═══════════════════════════════════════════════════════════
interface LangContextType {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
}

const LANGS = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文',   flag: '🇨🇳' },
];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  ko: { news: '뉴스지능', finance: '금융분석', board: '아고라광장', media: '미디어', admin: '관제실' },
  en: { news: 'News',    finance: 'Finance',  board: 'Board',      media: 'Media',  admin: 'Admin'  },
  ja: { news: 'ニュース', finance: '金融分析', board: '掲示板',     media: 'メディア', admin: '管理室' },
  zh: { news: '新闻',    finance: '金融分析',  board: '论坛',       media: '媒体',   admin: '管理室' },
};

const LangContext = createContext<LangContextType>({
  lang: 'ko',
  setLang: function() {},
  t: function(key) { return key; },
});

function useLang() { return useContext(LangContext); }

// ═══════════════════════════════════════════════════════════
// 2. 알림 타입 & 목 데이터
// ═══════════════════════════════════════════════════════════
interface Notification {
  id:    string | number;
  type:  'news' | 'finance' | 'system';
  title: string;
  body:  string;
  time:  Date | string;
  read:  boolean;
}

function formatNotiTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
  if (diff < 1)    return '방금 전';
  if (diff < 60)   return diff + '분 전';
  if (diff < 1440) return Math.floor(diff / 60) + '시간 전';
  return (date.getMonth() + 1) + '/' + date.getDate();
}

// ═══════════════════════════════════════════════════════════
// 3. 검색 모달
// ═══════════════════════════════════════════════════════════
const QUICK_LINKS = [
  { title: '뉴스 브리핑',  desc: '연합뉴스 실시간 RSS',       path: '/news'    },
  { title: '금융 분석',    desc: '연합인포맥스 금융뉴스',      path: '/finance' },
  { title: '아고라 광장',  desc: '커뮤니티 게시판',            path: '/board'   },
  { title: '미디어 랩',    desc: 'YouTube · 팟캐스트 · 음악', path: '/media'   },
];

const TRENDING = ['코스피', '환율', '금리', '부동산', '반도체'];

function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery]     = useState('');
  const inputRef              = useRef<HTMLInputElement>(null);
  const location              = useLocation();

  const results = query.trim()
    ? QUICK_LINKS.filter(function(item) {
        return item.title.includes(query) || item.desc.includes(query);
      })
    : [];

  useEffect(function() {
    if (open) { setTimeout(function() { inputRef.current?.focus(); }, 50); setQuery(''); }
  }, [open]);

  useEffect(function() {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onClose(); }
    }
    document.addEventListener('keydown', handleKey);
    return function() { document.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  // 페이지 이동 시 모달 닫기
  useEffect(function() { onClose(); }, [location.pathname]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={function(e) { e.stopPropagation(); }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="검색어를 입력하세요..."
            value={query}
            onChange={function(e) { setQuery(e.target.value); }}
            className="flex-1 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={function() { setQuery(''); }} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={14} className="text-slate-400" />
            </button>
          )}
          <kbd className="hidden sm:flex px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-400">ESC</kbd>
        </div>

        <div className="p-3">
          {results.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">검색 결과</p>
              {results.map(function(item, idx) {
                return (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={onClose}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <ArrowRight size={14} className="text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-400 font-medium">{item.desc}</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}

          {!query && (
            <div className="mb-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">빠른 이동</p>
              {QUICK_LINKS.map(function(item, idx) {
                return (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <ArrowRight size={14} className="text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-400 font-medium">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!query && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 flex items-center gap-1">
                <Flame size={10} /> 인기 키워드
              </p>
              <div className="flex flex-wrap gap-2 px-2">
                {TRENDING.map(function(keyword) {
                  return (
                    <button
                      key={keyword}
                      onClick={function() { setQuery(keyword); }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-slate-600 transition-colors"
                    >
                      {keyword}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {query && results.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              <Search size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-bold">'{query}' 검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 4. 알림 벨
// ═══════════════════════════════════════════════════════════
function NotificationBell() {
  const [open, setOpen]   = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref               = useRef<HTMLDivElement>(null);
  const unreadCount       = items.filter(function(n) { return !n.read; }).length;

  // 데이터 로드
  const loadNotifications = async () => {
    try {
      const res = await getNotificationsAPI();
      if (res.success) setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(function() {
    loadNotifications();
    // 5분마다 갱신
    const timer = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(function() {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, []);

  function markAllRead() {
    setItems(function(prev) { return prev.map(function(n) { return { ...n, read: true }; }); });
  }

  function dismiss(id: string | number) {
    setItems(function(prev) { return prev.filter(function(n) { return n.id !== id; }); });
  }

  function getNotiIcon(type: Notification['type']): React.ReactElement {
    if (type === 'finance') return <TrendingUp size={13} className="text-emerald-500" />;
    if (type === 'news')    return <Newspaper  size={13} className="text-blue-500" />;
    return <Info size={13} className="text-slate-400" />;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={function() { setOpen(function(v) { return !v; }); }}
        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800">알림</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors"
              >
                <CheckCheck size={12} /> 모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Bell size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold">알림이 없습니다</p>
              </div>
            ) : (
              items.map(function(item) {
                return (
                  <div
                    key={item.id}
                    className={'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors ' + (item.read ? 'opacity-60' : '')}
                    onClick={function() {
                      setItems(function(prev) { return prev.map(function(n) { return n.id === item.id ? { ...n, read: true } : n; }); });
                    }}
                  >
                    <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getNotiIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-700">{item.title}</p>
                      <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5">{item.body}</p>
                      <p className="text-[10px] text-slate-300 font-bold mt-1">{formatNotiTime(item.time)}</p>
                    </div>
                    {!item.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                    <button
                      onClick={function(e) { e.stopPropagation(); dismiss(item.id); }}
                      className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <X size={11} className="text-slate-400" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 5. 언어 전환 버튼
// ═══════════════════════════════════════════════════════════
function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const current           = LANGS.find(function(l) { return l.code === lang; }) || LANGS[0];

  useEffect(function() {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={function() { setOpen(function(v) { return !v; }); }}
        className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-slate-400 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all mr-2"
      >
        <span>{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
        <ChevronDown size={10} className={'transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <div className="absolute right-2 top-11 w-36 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden py-1">
          {LANGS.map(function(l) {
            return (
              <button
                key={l.code}
                onClick={function() { setLang(l.code); setOpen(false); }}
                className={'w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors ' + (lang === l.code ? 'bg-slate-50' : '')}
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

// ═══════════════════════════════════════════════════════════
// 6. 메인 Layout
// ═══════════════════════════════════════════════════════════
function LayoutInner() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { t }                             = useLang();
  const location                          = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen]             = useState(false);

  const navItems = useMemo(function() {
    const baseNav = [
      { path: '/news',    label: t('news'),    icon: Newspaper    },
      { path: '/finance', label: t('finance'), icon: BarChart3    },
      { path: '/board',   label: t('board'),   icon: MessageSquare },
      { path: '/media',   label: t('media'),   icon: Tv           },
    ];
    if (user?.role === 'admin') {
      baseNav.push({ path: '/admin', label: t('admin'), icon: Shield });
    }
    return baseNav;
  }, [user?.role, t]);

  // Cmd+K 단축키
  useEffect(function() {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKey);
    return function() { document.removeEventListener('keydown', handleKey); };
  }, []);

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/80 font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* ── 검색 모달 ── */}
      <SearchModal open={searchOpen} onClose={function() { setSearchOpen(false); }} />

      {/* ── 헤더 ── */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-20 px-6">

          {/* 좌측: 로고 + 네비 */}
          <div className="flex items-center gap-12">
            <Link to="/news" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:rotate-6 transition-transform">
                <Shield className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">AGORA</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(function(item) {
                const isActive = location.pathname.startsWith(item.path);
                const Icon     = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={'px-6 py-2.5 rounded-2xl text-[13px] font-black uppercase tracking-tight transition-all flex items-center gap-2 ' + (isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50')}
                  >
                    <Icon size={16} className={isActive ? 'text-blue-600' : 'text-slate-300'} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 우측: 검색 + 알림 + 언어 + 유저 */}
          <div className="flex items-center gap-2">

            {/* 검색 버튼 */}
            <div className="hidden md:flex items-center gap-1 mr-2">
              <button
                onClick={function() { setSearchOpen(true); }}
                className="group flex items-center gap-2 p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                title="검색 (⌘K)"
              >
                <Search size={20} />
                <kbd className="hidden xl:flex items-center gap-1 px-2 py-0.5 bg-slate-100 group-hover:bg-blue-100 rounded-lg text-[10px] font-black text-slate-400 group-hover:text-blue-500 transition-colors">
                  ⌘K
                </kbd>
              </button>

              {/* 알림 벨 */}
              <NotificationBell />
            </div>

            {/* 언어 전환 */}
            <LanguageSwitcher />

            {/* 유저 영역 */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[1.5rem] border border-slate-100">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-2 bg-white rounded-[1.25rem] shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px]">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{user?.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-3 text-slate-300 hover:text-red-500 transition-all"
                  title="로그아웃"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-white font-black text-xs px-8 py-3.5 bg-slate-900 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest"
              >
                Agent Access
              </Link>
            )}

            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={function() { setIsMobileMenuOpen(function(v) { return !v; }); }}
              className="lg:hidden p-3 text-slate-600 hover:bg-slate-100 rounded-2xl transition-all ml-1"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* ── 모바일 메뉴 ── */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 p-6 shadow-xl">
            <nav className="flex flex-col gap-2 mb-4">
              {navItems.map(function(item) {
                const isActive = location.pathname.startsWith(item.path);
                const Icon     = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={function() { setIsMobileMenuOpen(false); }}
                    className={'flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase ' + (isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50')}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {/* 모바일 검색 */}
            <button
              onClick={function() { setIsMobileMenuOpen(false); setSearchOpen(true); }}
              className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-50"
            >
              <Search size={20} /> 검색
            </button>
          </div>
        )}
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 w-full py-6">
        <Outlet />
      </main>

      {/* ── 푸터 ── */}
      <footer className="bg-white border-t border-slate-100 py-16 mt-20">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
              <Shield className="text-slate-300 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black tracking-[0.5em] text-blue-600 uppercase mb-3">Antigravity Security Platform</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8">© 2026 Agora Intelligence Hub. Authorized Access Only.</p>
            </div>
            <div className="flex gap-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy Protocol</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Operational Terms</a>
              <a href="#" className="hover:text-blue-600 transition-colors">HQ Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 7. LangProvider로 감싼 최종 export
// ═══════════════════════════════════════════════════════════
export default function Layout() {
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
      <LayoutInner />
    </LangContext.Provider>
  );
}