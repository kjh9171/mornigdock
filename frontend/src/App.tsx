import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from './store/useAuthStore'; // AuthStore 전역 상태 임포트
import Layout from './components/Layout';         // 공용 레이아웃 셸
import Login from './pages/Login';

// 새로 만들어진 멋진 페이지 컴포넌트들을 임포트합니다.
import News from './pages/News';
import Finance from './pages/Finance';
import Board from './pages/Board';
import Media from './pages/Media';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

// 임시 ProtectedRoute 컴포넌트: 인증 여부에 따라 페이지 접근을 방어합니다.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    // 비인가 시 로그인 화면으로 즉각 리다이렉션
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const fetchMe = useAuthStore(state => state.fetchMe); 

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        {/* 단독 인증 페이지 */}
        <Route path="/login" element={<Login />} />
        
        {/* 공통 헤더/푸터가 적용되는 메인 레이아웃 라우트 */}
        <Route path="/" element={<Layout />}>
          {/* 기본 경로는 뉴스 허브로 연결 */}
          <Route index element={<Navigate to="/news" replace />} />
          
          {/* 실제 퍼블리싱된 멋진 뷰들과 연결합니다! */}
          <Route path="/news" element={<News />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/board" element={<Board />} />
          <Route path="/media" element={<Media />} />
          
          {/* 보안이 필요한 개인 및 관리자 구역 */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        </Route>
        
        {/* 길 잃은 요원들을 위한 기본 리다이렉트 */}
        <Route path="*" element={<Navigate to="/news" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
