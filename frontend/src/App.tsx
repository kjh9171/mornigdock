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

  // ✅ [보안 및 안정성 조치] 관리자 권한 체크 및 자동 리다이렉트 로직 최적화
  useEffect(() => {
    // 사용자가 로그인 상태이고 관리자인 경우에만 작동
    if (isAuthenticated && user?.isAdmin) {
      // 메인('/')에 진입했을 때만 관리자 뷰로 자동 이동
      if (location.pathname === '/' && view !== 'admin') {
        setView('admin');
        navigate('/admin', { replace: true });
      }
    }
    // 미인증 사용자가 보호된 경로에 있다면 로그인으로 강제 이동 (선택 사항)
    // else if (!isAuthenticated && location.pathname !== '/login') {
    //   navigate('/login');
    // }
  }, [isAuthenticated, user, view, navigate, location.pathname, setView]);

  // ✅ 로그인이 필요한 서비스이므로, 인증되지 않은 상태에서 헤더가 보이는 것을 방지하려면 처리 가능
  // 현재는 레이아웃 구성을 위해 그대로 유지합니다.

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* 상단 헤더: 로그인 상태일 때만 더 명확한 정보 노출 */}
      <header className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-stone-200 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <ShieldCheck className="w-6 h-6 text-amber-600" />
          <h1 className="text-xl font-bold text-stone-900">MorningDock</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 관리자 전용 메뉴 스위치 */}
          {isAuthenticated && user?.isAdmin && (
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

          <button 
            onClick={toggleLanguage} 
            className="px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-full bg-white hover:bg-stone-50 transition-colors"
          >
            {language === 'ko' ? 'EN' : 'KO'}
          </button>
          
          {isAuthenticated && (
            <button 
              onClick={() => { logout(); navigate('/login'); }} 
              className="p-2 text-stone-400 hover:text-red-500 transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-5xl mt-24 p-4">
        {/* ✅ 핵심: 라우터에 정의된 하위 페이지들이 렌더링되는 지점 */}
        <Outlet />
      </main>
    </div>
  )
}

export default App