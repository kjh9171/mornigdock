import { useLanguageStore } from './store/useLanguageStore';
import { useAuth } from './contexts/AuthContext'; // Context API로 교체
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, ShieldCheck, LogOut, LayoutDashboard, FileText, MessageSquare, Play } from 'lucide-react'
import { useNavigationStore } from './store/useNavigationStore';
import { Outlet, useNavigate } from 'react-router-dom'; // 라우팅 호환을 위해 추가

function App() {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguageStore();
  const { user, logout, isAuthenticated } = useAuth(); // Context 데이터 사용
  const navigate = useNavigate();
  
  const { view, userTab, setView, setUserTab } = useNavigationStore();

  // 관리자 권한 확인 후 자동 리다이렉트 로직
  useEffect(() => {
    if (user?.isAdmin && view !== 'admin') {
      setView('admin');
      navigate('/admin');
    }
  }, [user, setView, navigate, view]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      {/* 고정 헤더 영역 */}
      <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b-[0.5px] border-stone-200 z-10 transition-all">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <ShieldCheck className="w-6 h-6 text-accent-600" />
          <h1 className="text-xl font-bold tracking-tight text-primary-800">Agora</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {user?.isAdmin && (
            <div className="flex bg-stone-100 rounded-full p-1 mr-2 border border-stone-200">
              <button
                onClick={() => { setView('user'); navigate('/'); }}
                className={`p-2 rounded-full transition-all ${view === 'user' ? 'bg-white shadow-sm text-primary-800' : 'text-stone-400 hover:text-stone-600'}`}
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setView('admin'); navigate('/admin'); }}
                className={`p-2 rounded-full transition-all ${view === 'admin' ? 'bg-white shadow-sm text-primary-800' : 'text-stone-400 hover:text-stone-600'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </div>
          )}

          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-white border-[0.5px] border-stone-300 rounded-full hover:bg-stone-50 shadow-soft"
          >
            <Globe className="w-4 h-4" />
            {language === 'ko' ? 'EN' : 'KO'}
          </button>
          
          {isAuthenticated && (
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2 text-stone-400 hover:text-stone-600"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* 실제 페이지 콘텐츠가 렌더링되는 영역 */}
      <main className="max-w-4xl w-full mt-24">
        <Outlet /> 
      </main>
    </div>
  )
}

export default App