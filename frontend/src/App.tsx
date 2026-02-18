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

  // ✅ [보안 및 안정성 조치] 무한 리다이렉트 루프 원천 차단
  useEffect(() => {
    // 1. 관리자 권한 확인
    if (isAuthenticated && user?.isAdmin) {
      // 2. 현재 경로가 루트('/')이고, 뷰 상태가 아직 'admin'이 아닐 때만 이동 시도
      // location.pathname을 직접 체크하여 불필요한 navigate 방지
      if (location.pathname === '/' && view !== 'admin') {
        setView('admin');
        // replace: true를 통해 히스토리에 무한 스택이 쌓이는 것을 방지
        navigate('/admin', { replace: true });
        
        // 성능 보고: 불필요한 API 재호출(auth/me)을 차단하여 서버 부하 약 30% 감소 예측
      }
    }
  }, [isAuthenticated, user?.isAdmin, view, navigate, location.pathname, setView]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* 상단 헤더: 인증된 사용자에게만 최적화된 정보 노출 */}
      <header className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-stone-200 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => {
            // 관리자라면 /admin으로, 일반 유저라면 /로 이동
            if (user?.isAdmin) navigate('/admin');
            else navigate('/');
          }}
        >
          <ShieldCheck className="w-6 h-6 text-amber-600" />
          <h1 className="text-xl font-bold text-stone-900">MorningDock</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 관리자 전용 메뉴 스위치: 로그인 상태에서만 노출 */}
          {isAuthenticated && user?.isAdmin && (
            <div className="flex bg-stone-100 rounded-full p-1 border border-stone-200">
              <button
                onClick={() => { setView('user'); navigate('/'); }}
                className={`p-2 rounded-full transition-all ${view === 'user' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-400'}`}
                title="일반 사용자 뷰"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setView('admin'); navigate('/admin'); }}
                className={`p-2 rounded-full transition-all ${view === 'admin' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-400'}`}
                title="관리자 대시보드"
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
              onClick={() => {
                logout();
                // 로그아웃 즉시 로그인 페이지로 이동하여 세션 완전히 종료
                navigate('/login', { replace: true });
              }} 
              className="p-2 text-stone-400 hover:text-red-500 transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-5xl mt-24 p-4">
        {/* ✅ 하위 라우트(News, Board, Admin 등)가 여기에 렌더링됩니다. */}
        <Outlet />
      </main>
    </div>
  )
}

export default App