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
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#1e293b] font-sans">
      {/* ── 클리앙 스타일 상단 헤더 ── */}
      <header className="bg-[#1d4ed8] shadow-md sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between h-14 px-4 lg:px-0">
          <div className="flex items-center gap-6">
            <Link to="/news" className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tighter text-white">MORNINGDOCK</span>
            </Link>
            
            <nav className="hidden md:flex items-center">
              {nav.map(({ path, label }) => {
                const isActive = location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`px-4 py-4 text-[14px] font-bold transition-all ${
                      isActive
                        ? 'text-white bg-black/10'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={toggleLanguage}
              className="px-2 py-1 text-[11px] font-bold text-white/70 border border-white/30 rounded hover:bg-white/10 transition-all"
            >
              {language === 'ko' ? 'EN' : 'KO'}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-2 text-white/90 hover:text-white">
                  <User size={16} />
                  <span className="text-[13px] font-medium hidden sm:inline">{user?.name}님</span>
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="text-white/70 hover:text-white transition-all"
                  title="로그아웃"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="text-white font-bold text-[13px] px-4 py-1.5 bg-white/10 rounded hover:bg-white/20">
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── 서브 네비게이션 (클리앙 느낌) ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-0 flex items-center h-10 gap-6">
          <span className="text-[12px] font-bold text-blue-600 border-r border-slate-200 pr-4 mr-0">HOT</span>
          <span className="text-[12px] text-slate-500 hover:text-blue-600 cursor-pointer">모두의공원</span>
          <span className="text-[12px] text-slate-500 hover:text-blue-600 cursor-pointer">새소식</span>
          <span className="text-[12px] text-slate-500 hover:text-blue-600 cursor-pointer">알뜰구매</span>
          <span className="text-[12px] text-slate-500 hover:text-blue-600 cursor-pointer">직거래장터</span>
        </div>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 max-w-[1100px] mx-auto w-full px-4 lg:px-0 py-6 animate-fade-in">
        <Outlet />
      </main>

      {/* ── 푸터 ── */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-400 mt-10">
        <div className="max-w-[1100px] mx-auto px-4">
          <p className="text-[11px] mb-2 font-bold tracking-widest text-slate-300 uppercase">Morningdock Platform</p>
          <p className="text-[10px]">© 2026 Morningdock. All rights reserved. CERT Division.</p>
        </div>
      </footer>
    </div>
  );
}
