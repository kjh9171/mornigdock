import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore'; // AuthStore는 나중에 구현합니다.
import Layout from './components/Layout';         // Layout은 나중에 구현합니다.

// 임시 ProtectedRoute 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore(); // useAuthStore는 나중에 구현합니다.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const fetchMe = useAuthStore(state => state.fetchMe); // useAuthStore는 나중에 구현합니다.

  useEffect(() => {
    // fetchMe(); // AuthStore 구현 후 활성화
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인 페이지 (나중에 구현) */}
        <Route path="/login" element={<div className="min-h-screen flex items-center justify-center bg-slate-100/80"><h1>Login Page (Placeholder)</h1></div>} />
        
        <Route path="/" element={<Layout />}> {/* Layout은 나중에 구현합니다. */}
          <Route index element={<Navigate to="/news" replace />} />
          {/* 다른 라우트들은 나중에 추가합니다. */}
          <Route path="/news" element={<div className="p-4">뉴스 페이지 (Placeholder)</div>} />
          <Route path="/finance" element={<div className="p-4">금융 분석 페이지 (Placeholder)</div>} />
          <Route path="/board" element={<div className="p-4">게시판 페이지 (Placeholder)</div>} />
          <Route path="/media" element={<div className="p-4">미디어 페이지 (Placeholder)</div>} />
          <Route path="/profile" element={<ProtectedRoute><div className="p-4">프로필 페이지 (Placeholder)</div></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><div className="p-4">관리자 페이지 (Placeholder)</div></ProtectedRoute>} />
        </Route>
        
        {/* 없는 경로는 뉴스 페이지로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/news" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
