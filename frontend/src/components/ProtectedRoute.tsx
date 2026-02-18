// /Users/macbookpro_cert/Downloads/mornigdock/frontend/src/components/ProtectedRoute.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  // ✅ 로직 수정: 인증 상태가 false면 무조건 로그인으로 리다이렉트
  // 만약 로딩 상태가 있다면 여기에 '로딩 중...' 스피너를 넣어 무한 대기를 방지해야 합니다.
  if (!isAuthenticated) {
    console.warn('CERT 경고: 미인증 접근 감지! 로그인 페이지로 이동합니다.');
    return <Navigate to="/login" replace />;
  }

  // 인증 성공 시 하위 컴포넌트(메인 화면) 렌더링
  return <Outlet />;
};

export default ProtectedRoute;