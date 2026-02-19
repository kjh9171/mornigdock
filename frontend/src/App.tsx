import { useLanguageStore } from './store/useLanguageStore';
import { useAuth } from './contexts/AuthContext';
import { useTranslation } from 'react-i18next'
import { ShieldCheck, LogOut, LayoutDashboard, FileText, Music, Play } from 'lucide-react'
import { useNavigationStore } from './store/useNavigationStore';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';

function App() {
  const { t } = useTranslation();
  const { toggleLanguage, language } = useLanguageStore();
  const { user, logout, isAuthenticated } = useAuth();
  const { view, setView } = useNavigationStore();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ [수정] 관리자 강제 리다이렉트 로직 제거
  // 이제 관리자도 일반 유저 페이지(뉴스, 미디어)를 자유롭게 돌아다닐 수 있습니다.
  useEffect(() => {
    // 최초 로그인 시 관리자면 관리자 뷰를 기본으로 보여주되, 강제 이동은 하지 않음
    if (isAuthenticated && user?.isAdmin && !localStorage.getItem('init_view')) {
      setView('admin');
      localStorage.setItem('init_view', 'done');
    }
  }, [isAuthenticated, user?.isAdmin, setView]);

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col items-center">
      <header className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center bg-white border-b border-stone-200 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <ShieldCheck className="w-6 h-6 text-amber-600" />
          <h1 className="text-xl font-bold text-stone-900 tracking-tight uppercase italic">아고라</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* ✅ 관리자 전용 메뉴 스위치 (뉴스/미디어 vs 관리자 통제) */}
          {isAuthenticated && user?.isAdmin && (
            <div className="flex bg-stone-100 rounded-full p-1 border border-stone-200 shadow-inner">
              <button
                onClick={() => { setView('user'); navigate('/'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${view === 'user' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
              >
                <FileText className="w-3.5 h-3.5" /> Intel
              </button>
              <button
                onClick={() => { setView('admin'); navigate('/admin'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all ${view === 'admin' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400'}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Control
              </button>
            </div>
          )}

          {/* 일반 메뉴 */}
          <nav className="hidden md:flex items-center gap-1 mr-4">
             <Link to="/" className={`text-xs font-black uppercase px-3 py-2 rounded-lg transition-all ${location.pathname === '/' ? 'text-amber-600 bg-amber-50' : 'text-stone-400 hover:text-stone-600'}`}>Insights</Link>
             <Link to="/media" className={`text-xs font-black uppercase px-3 py-2 rounded-lg transition-all ${location.pathname === '/media' ? 'text-amber-600 bg-amber-50' : 'text-stone-400 hover:text-stone-600'}`}>Operations</Link>
          </nav>

          <button onClick={toggleLanguage} className="px-3 py-1.5 text-[10px] font-black border border-stone-200 rounded-full bg-white hover:bg-stone-50 transition-colors uppercase tracking-widest">
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