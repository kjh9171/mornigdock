// frontend/src/App.tsx 전체 수정
import { useLanguageStore } from './store/useLanguageStore';
import { useAuth } from './contexts/AuthContext';
import { useTranslation } from 'react-i18next'
import { Globe, ShieldCheck, LogOut, LayoutDashboard, FileText } from 'lucide-react'
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

  // ✅ [보안 조치] 무한 루프 방지: 현재 경로가 이미 이동하려는 곳이면 이동하지 않음
  useEffect(() => {
    if (user?.isAdmin && view !== 'admin' && location.pathname === '/') {
      setView('admin');
      navigate('/admin', { replace: true });
    }
  }, [user, view, navigate, location.pathname, setView]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-stone-200 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <ShieldCheck className="w-6 h-6 text-amber-600" />
          <h1 className="text-xl font-bold text-stone-900">MorningDock</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {user?.isAdmin && (
            <div className="flex bg-stone-100 rounded-full p-1 border border-stone-200">
              <button
                onClick={() => { setView('user'); navigate('/'); }}
                className={`p-2 rounded-full transition-all ${view === 'user' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-400'}`}
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setView('admin'); navigate('/admin'); }}
                className={`p-2 rounded-full transition-all ${view === 'admin' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-400'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={toggleLanguage} className="px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-full bg-white">
            {language === 'ko' ? 'EN' : 'KO'}
          </button>
          
          <button onClick={logout} className="p-2 text-stone-400 hover:text-stone-600">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-5xl mt-24 p-4">
        {/* ✅ 중요: 자식 컴포넌트들이 여기서 렌더링됨 */}
        <Outlet />
      </main>
    </div>
  )
}

export default App