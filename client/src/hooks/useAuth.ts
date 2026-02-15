import { useState, useEffect } from 'react';
import { User, LoginRequest, RegisterRequest } from '@shared/schema'; // 서버와 공유되는 User 타입 임포트

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true, // 초기 로딩 상태
  error: null,
};

const AUTH_TOKEN_KEY = 'jwt_token';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  // 컴포넌트 마운트 시 토큰 확인 및 사용자 정보 가져오기
  useEffect(() => {
    const checkAuthStatus = async () => {
      setAuthState((prev) => ({ ...prev, isLoading: true }));
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);

      if (storedToken) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const user = await response.json();
            setAuthState({
              isAuthenticated: true,
              user,
              token: storedToken,
              isLoading: false,
              error: null,
            });
          } else {
            // 토큰이 유효하지 않으면 제거
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setAuthState({ ...defaultAuthState, isLoading: false });
          }
        } catch (err) {
          console.error('Failed to fetch user data:', err);
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setAuthState({ ...defaultAuthState, isLoading: false, error: '인증 상태 확인 실패' });
        }
      } else {
        setAuthState({ ...defaultAuthState, isLoading: false });
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (credentials: LoginRequest) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        setAuthState({
          isAuthenticated: true,
          user: data.user,
          token: data.token,
          isLoading: false,
          error: null,
        });
        return { success: true, user: data.user };
      } else if (response.ok && data.mfaRequired) {
        setAuthState((prev) => ({ ...prev, isLoading: false, error: null }));
        return { success: false, mfaRequired: true };
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false, error: data.message || '로그인 실패' }));
        return { success: false, message: data.message || '로그인 실패' };
      }
    } catch (err: any) {
      setAuthState((prev) => ({ ...prev, isLoading: false, error: err.message || '네트워크 오류' }));
      return { success: false, message: err.message || '네트워크 오류' };
    }
  };

  const register = async (userData: RegisterRequest) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        setAuthState({
          isAuthenticated: true,
          user: data.user,
          token: data.token,
          isLoading: false,
          error: null,
        });
        return { success: true, user: data.user };
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false, error: data.message || '회원가입 실패' }));
        return { success: false, message: data.message || '회원가입 실패' };
      }
    } catch (err: any) {
      setAuthState((prev) => ({ ...prev, isLoading: false, error: err.message || '네트워크 오류' }));
      return { success: false, message: err.message || '네트워크 오류' };
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthState({ ...defaultAuthState, isLoading: false }); // 로그아웃 후 로딩 상태는 false
  };

  return { ...authState, login, register, logout };
};