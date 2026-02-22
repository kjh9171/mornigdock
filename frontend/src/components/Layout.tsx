import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from 'react-i18next';
import { 
  Newspaper, Tv, Shield, User, LogOut, 
  MessageSquare, BarChart3, Bell, Search, 
  Menu, X
} from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate  = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const nav = [
    { path: '/news',  label: '뉴스지능', icon: Newspaper },
    { path: '/finance', label: '금융분석', icon: BarChart3 },
    { path: '/board', label: '아고라광장', icon: MessageSquare },
    { path: '/media', label: '미디어', icon: Tv },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: '관제실', icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* ── 아고라 프리미엄 상단 헤더 ── */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-20 px-6">
          <div className="flex items-center gap-12">
            <Link to="/news" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:rotate-6 transition-transform">
                <Shield className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">AGORA</span>
            </Link>
            
            <nav className="hidden lg:flex items-center gap-1">
              {nav.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`px-6 py-2.5 rounded-2xl text-[13px] font-black uppercase tracking-tight transition-all flex items-center gap-2 ${
                      isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-blue-600' : 'text-slate-300'} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* 검색 & 알림 (UI 전용) */}
            <div className="hidden md:flex items-center gap-2 mr-4">
              <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                <Search size={20} />
              </button>
              <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all relative">
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>

            <button 
              onClick={toggleLanguage}
              className="hidden sm:block px-4 py-2 text-[11px] font-black text-slate-400 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all mr-2"
            >
              {language === 'ko' ? 'KR' : 'EN'}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[1.5rem] border border-slate-100">
                <Link to="/profile" className="flex items-center gap-3 px-4 py-2 bg-white rounded-[1.25rem] shadow-sm hover:shadow-md transition-all group">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px]">
                    {user?.name?.[0].toUpperCase()}
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
              <Link to="/login" className="text-white font-black text-xs px-8 py-3.5 bg-slate-900 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest">
                Agent Access
              </Link>
            )}

            {/* 모바일 메뉴 버튼 */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-3 text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* ── 모바일 메뉴 ── */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 p-6 animate-in slide-in-from-top-4 duration-300 shadow-xl">
            <nav className="flex flex-col gap-2">
              {nav.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase ${
                    location.pathname.startsWith(path) ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 w-full py-6 animate-fade-in">
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
