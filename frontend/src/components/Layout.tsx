import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from 'react-i18next';
import { Newspaper, Tv, Shield, User, LogIn, LogOut, Columns2, Globe, MessageSquare } from 'lucide-react';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate  = useNavigate();

  const nav = [
    { path: '/news',  label: t('news'), icon: Newspaper },
    { path: '/media', label: t('media_center'), icon: Tv },
    { path: '/board', label: t('board'), icon: MessageSquare },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: t('admin'), icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-agora-bg text-agora-text font-sans">
      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-50 bg-agora-bg/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
          {/* 로고 */}
          <Link to="/news" className="flex items-center gap-3 transition-transform hover:scale-105">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center shadow-lg transform rotate-3">
              <Columns2 className="text-white" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter uppercase leading-none">Agora</span>
              <span className="text-[8px] font-bold text-agora-accent tracking-widest uppercase mt-0.5">Intelligence</span>
            </div>
          </Link>

          {/* 중앙 네비게이션 */}
          <nav className="hidden md:flex items-center gap-2">
            {nav.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`relative group flex items-center gap-3 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                    isActive
                      ? 'bg-white/5 text-white shadow-xl translate-y-[-1px]'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-agora-accent' : 'text-white/20 group-hover:text-white/40'} />
                  {label}
                  {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-agora-accent rounded-full mb-1"></div>}
                </Link>
              );
            })}
          </nav>

          {/* 우측 액션 */}
          <div className="flex items-center gap-4">
            {/* 언어 토글 */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-black text-white/40 hover:text-white transition-all backdrop-blur-md"
            >
              <Globe className="w-3.2 h-3.2 text-agora-gold" />
              <span className="hidden lg:inline">{language === 'ko' ? 'EN' : 'KO'}</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 pl-4 border-l border-white/5">
                <Link
                  to="/profile"
                  className="group flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 group-hover:text-agora-accent transition-colors">
                    <User size={16} />
                  </div>
                  <div className="hidden lg:flex flex-col items-start leading-tight">
                    <span className="text-[11px] font-black text-white">{user?.name}</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">{user?.role}</span>
                  </div>
                </Link>

                <button 
                  onClick={handleLogout} 
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all flex items-center justify-center border border-white/5"
                  title={t('logout')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-3 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-500 transition-all shadow-xl shadow-primary-900/40">
                <LogIn size={16} />
                {t('login_tab')}
              </Link>
            )}
          </div>
        </div>

        {/* 모바일 하단 네비게이션 */}
        <div className="md:hidden flex border-t border-white/5 bg-agora-bg/60 backdrop-blur-2xl">
          {nav.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex-1 flex flex-col items-center py-4 text-[9px] font-black uppercase tracking-widest transition-all ${
                  isActive ? 'text-white' : 'text-white/30'
                }`}
              >
                <Icon size={18} className={`mb-1.5 ${isActive ? 'text-agora-accent' : ''}`} />
                {label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 animate-fade-in">
        <Outlet />
      </main>

      {/* ── 푸터 ── */}
      <footer className="mt-auto py-10 border-t border-white/5 text-center flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 opacity-30">
          <Columns2 size={16} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Agora Platform</span>
        </div>
        <p className="text-white/10 text-[9px] font-bold uppercase tracking-widest">
          © 2025 · CERT Intelligence Unit · All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
