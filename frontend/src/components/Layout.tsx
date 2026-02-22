import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from 'react-i18next';
import { Newspaper, Tv, Shield, User, LogIn, LogOut, Globe, MessageSquare, BarChart3, Menu } from 'lucide-react';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate  = useNavigate();

  const nav = [
    { path: '/news',  label: '뉴스', icon: Newspaper },
    { path: '/finance', label: '금융', icon: BarChart3 },
    { path: '/board', label: '커뮤니티', icon: MessageSquare },
    { path: '/media', label: '미디어', icon: Tv },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: '관리자', icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0b] text-white font-sans selection:bg-agora-gold/30">
      {/* ── 아고라 프리미엄 상단 헤더 ── */}
      <header className="bg-black/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between h-16 px-4 lg:px-0">
          <div className="flex items-center gap-10">
            <Link to="/news" className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tighter text-white uppercase italic">AGORA</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-2">
              {nav.map(({ path, label }) => {
                const isActive = location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`px-5 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
                      isActive
                        ? 'text-agora-gold bg-agora-gold/10 border border-agora-gold/20'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-6">
             <button 
              onClick={toggleLanguage}
              className="px-3 py-1.5 text-[10px] font-black text-white/40 border border-white/10 rounded-lg hover:bg-white/5 transition-all"
            >
              {language === 'ko' ? 'EN' : 'KO'}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-6">
                <Link to="/profile" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                  <User size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">{user?.name} 요원</span>
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="text-white/30 hover:text-red-400 transition-all active:scale-95"
                  title="로그아웃"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="text-white font-black text-[11px] px-6 py-2.5 bg-primary-600 rounded-xl hover:bg-primary-500 transition-all shadow-lg shadow-primary-900/20 uppercase tracking-widest">
                Login Access
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 max-w-[1100px] mx-auto w-full px-4 lg:px-0 py-10 animate-fade-in">
        <Outlet />
      </main>

      {/* ── 푸터 ── */}
      <footer className="bg-black/40 border-t border-white/5 py-12 text-center text-white/20 mt-20">
        <div className="max-w-[1100px] mx-auto px-4">
          <p className="text-[10px] mb-3 font-black tracking-[0.5em] text-agora-gold/40 uppercase">Antigravity Security Platform</p>
          <p className="text-[9px] font-bold uppercase tracking-widest">© 2026 Agora Intel Hub. Authorized Access Only.</p>
        </div>
      </footer>
    </div>
  );
}
