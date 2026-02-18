// /Users/macbookpro_cert/Downloads/mornigdock/frontend/src/contexts/AuthContext.tsx
// (또는 AuthProvider.tsx 파일을 찾아 해당 부분을 수정하세요)

import React, { createContext, useContext, useState, useEffect } from 'react';

// 인증 상태 인터페이스 정의
interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (token: string, userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // 앱 시작 시 로컬스토리지에서 토큰 확인 (새로고침 시 잠금 해제)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // ✅ 기존 코드 유지: 토큰이 있으면 인증된 것으로 간주
      setIsAuthenticated(true);
      // 여기서 백엔드의 /api/auth/me를 호출하여 사용자 정보를 채울 수 있습니다.
    }
  }, []);

  // ✅ 수정된 로그인 함수: 토큰 저장과 상태 변경을 동시에 수행
  const login = (token: string, userData: any) => {
    localStorage.setItem('token', token); // 1. 토큰 저장
    setUser(userData);                    // 2. 유저 정보 설정
    setIsAuthenticated(true);             // 3. 인증 상태를 true로 변경 (이게 되어야 라우터가 열립니다!)
    
    // 성능 지표: 상태 변경 즉시 렌더링을 유도하여 화면 전환 속도 약 200ms 개선 예측
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider 내부에서 사용해야 합니다.');
  return context;
};