import { useLanguageStore } from './store/useLanguageStore';
import { useAuth } from './contexts/AuthContext';
import { useTranslation } from 'react-i18next'
import { ShieldCheck, LogOut, LayoutDashboard, FileText, Music, Play, MessageSquare, TrendingUp, Settings } from 'lucide-react'
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
  const handleNav = (tab: 'news' | 'discussion' | 'media' | 'finance' | 'settings') => {
    setUserTab(tab);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col items-center">
      <header className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center bg-white border-b border-stone-200 z-50 shadow-sm">
        {/* ─── 좌측: 사령부 로고 ─── */}
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setUserTab('news'); navigate('/'); }}>
          <div className="p-1.5 bg-stone-900 rounded-lg group-hover:bg-amber-600 transition-colors">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black text-stone-900 tracking-tighter uppercase italic">아고라</h1>
        </div>
        
        {/* ─── 중앙: 핵심 전술 메뉴 ─── */}
        <nav className="hidden lg:flex items-center gap-1 bg-stone-50 p-1 rounded-2xl border border-stone-100">
           <button onClick={() => handleNav('news')} className={`flex items-center gap-2 text-[11px] font-black uppercase px-5 py-2.5 rounded-xl transition-all ${userTab === 'news' && view === 'user' && location.pathname === '/' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
             <FileText className="w-3.5 h-3.5" /> 지능 보고서
           </button>
           <button onClick={() => handleNav('finance')} className={`flex items-center gap-2 text-[11px] font-black uppercase px-5 py-2.5 rounded-xl transition-all ${userTab === 'finance' && view === 'user' && location.pathname === '/' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
             <TrendingUp className="w-3.5 h-3.5" /> 증시 지휘소
           </button>
           <button onClick={() => handleNav('discussion')} className={`flex items-center gap-2 text-[11px] font-black uppercase px-5 py-2.5 rounded-xl transition-all ${userTab === 'discussion' && view === 'user' && location.pathname === '/' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
             <MessageSquare className="w-3.5 h-3.5" /> 아고라 토론
           </button>
           <button onClick={() => handleNav('media')} className={`flex items-center gap-2 text-[11px] font-black uppercase px-5 py-2.5 rounded-xl transition-all ${userTab === 'media' && view === 'user' && location.pathname === '/' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
             <Play className="w-3.5 h-3.5" /> 미디어 센터
           </button>
           
           {/* 관리자 전용: 사령부 메뉴 */}
           {isAuthenticated && user?.isAdmin && (
             <div className="w-[1px] h-4 bg-stone-200 mx-2" />
           )}
           {isAuthenticated && user?.isAdmin && (
             <button
               onClick={() => { setView('admin'); navigate('/admin'); }}
               className={`flex items-center gap-2 text-[11px] font-black uppercase px-5 py-2.5 rounded-xl transition-all ${view === 'admin' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
             >
               <LayoutDashboard className="w-3.5 h-3.5" /> 사령부
             </button>
           )}
        </nav>

        {/* ─── 우측: 요원 제어 센터 ─── */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleNav('settings')}
            className={`p-2.5 rounded-full transition-all ${userTab === 'settings' ? 'bg-amber-50 text-amber-600' : 'text-stone-400 hover:bg-stone-50'}`}
            title="사용자 설정"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button onClick={toggleLanguage} className="px-3 py-1.5 text-[10px] font-black border border-stone-200 rounded-full bg-white hover:bg-stone-50 transition-colors uppercase tracking-widest">
            {language === 'ko' ? 'EN' : 'KO'}
          </button>
          
          {isAuthenticated && (
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-stone-100">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[10px] font-black text-stone-900 uppercase tracking-tighter">{user?.username} 요원</span>
                <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">{user?.role} clearance</span>
              </div>
              <button onClick={() => { logout(); navigate('/login'); }} className="p-2.5 bg-stone-50 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 🔥 메인 콘텐츠 영역 (와이드스크린 대응 확장) */}
      <main className="w-full max-w-[1800px] mt-24 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}

export default App