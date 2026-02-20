import { useLanguageStore } from './store/useLanguageStore';
import { useAuth } from './contexts/AuthContext';
import { useTranslation } from 'react-i18next'
import { ShieldCheck, LogOut, LayoutDashboard, FileText, Music, Play, MessageSquare } from 'lucide-react'
import { useNavigationStore } from './store/useNavigationStore';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';

function App() {
  const { t } = useTranslation();
  const { toggleLanguage, language } = useLanguageStore();
  const { user, logout, isAuthenticated } = useAuth();
  const { view, setView, userTab, setUserTab } = useNavigationStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin && !localStorage.getItem('init_view')) {
      setView('admin');
      localStorage.setItem('init_view', 'done');
    }
  }, [isAuthenticated, user?.isAdmin, setView]);

  // ✅ 메뉴 이동 통합 제어 함수
  const handleNav = (tab: 'news' | 'discussion' | 'media' | 'finance') => {
    setUserTab(tab);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col items-center">
      <header className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center bg-white border-b border-stone-200 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setUserTab('news'); navigate('/'); }}>
          <ShieldCheck className="w-6 h-6 text-amber-600" />
          <h1 className="text-xl font-bold text-stone-900 tracking-tight uppercase italic">아고라</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* ✅ 관리자 전용 메뉴 스위치 */}
          {isAuthenticated && user?.isAdmin && (
            <div className="flex bg-stone-100 rounded-full p-1 border border-stone-200 shadow-inner mr-2">
              <button
                onClick={() => { setView('user'); navigate('/'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${view === 'user' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
              >
                <FileText className="w-3 h-3" /> 사용자 뷰
              </button>
              <button
                onClick={() => { setView('admin'); navigate('/admin'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${view === 'admin' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400'}`}
              >
                <LayoutDashboard className="w-3 h-3" /> 사령부
              </button>
            </div>
          )}

          {/* 일반 메뉴: 클릭 시 홈으로 이동하며 탭 전환 */}
          <nav className="hidden lg:flex items-center gap-1 mr-4">
             <button onClick={() => handleNav('news')} className={`text-[11px] font-black uppercase px-4 py-2 rounded-xl transition-all ${userTab === 'news' && view === 'user' && location.pathname === '/' ? 'text-amber-600 bg-amber-50' : 'text-stone-400 hover:text-stone-600'}`}>지능 보고서</button>
             <button onClick={() => handleNav('finance')} className={`text-[11px] font-black uppercase px-4 py-2 rounded-xl transition-all ${userTab === 'finance' && view === 'user' && location.pathname === '/' ? 'text-amber-600 bg-amber-50' : 'text-stone-400 hover:text-stone-600'}`}>증시 지휘소</button>
             <button onClick={() => handleNav('discussion')} className={`text-[11px] font-black uppercase px-4 py-2 rounded-xl transition-all ${userTab === 'discussion' && view === 'user' && location.pathname === '/' ? 'text-amber-600 bg-amber-50' : 'text-stone-400 hover:text-stone-600'}`}>아고라 토론</button>
             <button onClick={() => handleNav('media')} className={`text-[11px] font-black uppercase px-4 py-2 rounded-xl transition-all ${userTab === 'media' && view === 'user' && location.pathname === '/' ? 'text-amber-600 bg-amber-50' : 'text-stone-400 hover:text-stone-600'}`}>미디어 센터</button>
          </nav>

          <button onClick={toggleLanguage} className="px-3 py-1.5 text-[10px] font-black border border-stone-200 rounded-full bg-white hover:bg-stone-50 transition-colors uppercase tracking-widest">
            {language === 'ko' ? 'EN' : 'KO'}
          </button>
          
          {isAuthenticated && (
            <button onClick={() => { logout(); navigate('/login'); }} className="ml-2 p-2 text-stone-400 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* 🔥 메인 콘텐츠 영역 */}
      <main className="w-full max-w-[1600px] mt-24 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}

export default App