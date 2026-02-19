import { useLanguageStore } from './store/useLanguageStore';
import { useAuth } from './contexts/AuthContext';
import { useTranslation } from 'react-i18next'
import { ShieldCheck, LogOut, LayoutDashboard, FileText, Music } from 'lucide-react'
import { useNavigationStore } from './store/useNavigationStore';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function App() {
  const { t } = useTranslation();
  const { toggleLanguage, language } = useLanguageStore();
  const { user, logout, isAuthenticated } = useAuth();
  const { view, setView } = useNavigationStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // ✅ 관리자 자동 리다이렉트 (무한 루프 방지 처리됨)
    if (isAuthenticated && user?.isAdmin) {
      if (location.pathname === '/' && view !== 'admin') {
        setView('admin');
        navigate('/admin', { replace: true });
      }
    }
  }, [isAuthenticated, user?.isAdmin, view, navigate, location.pathname, setView]);

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col items-center">
      <header className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center bg-white border-b border-stone-200 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <ShieldCheck className="w-6 h-6 text-amber-600" />
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">MorningDock</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* ✅ 관리자 전용 메뉴 스위치 */}
          {isAuthenticated && user?.isAdmin && (
            <div className="flex bg-stone-100 rounded-full p-1 border border-stone-200">
              <button
                onClick={() => { setView('user'); navigate('/'); }}
                className={`p-2 rounded-full transition-all ${view === 'user' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-400'}`}
                title="일반 뷰"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setView('admin'); navigate('/admin'); }}
                className={`p-2 rounded-full transition-all ${view === 'admin' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-400'}`}
                title="관리자 뷰"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={toggleLanguage} className="px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-full bg-white hover:bg-stone-50 transition-colors">
            {language === 'ko' ? 'EN' : 'KO'}
          </button>
          
          {isAuthenticated && (
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 text-stone-400 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-5xl mt-24 p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default App