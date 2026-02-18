import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getMeAPI, logoutAPI, UserInfo } from '../lib/api'

// ─────────────────────────────────────────────
// Context 타입 정의
// ─────────────────────────────────────────────
interface AuthContextType {
  user: UserInfo | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setAuth: (token: string, user: UserInfo) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// ─────────────────────────────────────────────
// AuthProvider 컴포넌트
// ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ✅ 앱 시작 시 localStorage에서 토큰 복원
  useEffect(() => {
    const savedToken = localStorage.getItem('token')

    if (savedToken) {
      setToken(savedToken)
      // 토큰 유효성 서버에서 확인
      getMeAPI()
        .then((res) => {
          if (res.success && res.user) {
            setUser(res.user)
          } else {
            // 토큰 만료 시 초기화
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setToken(null)
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
          setToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  // ✅ 로그인 성공 시 호출
  const setAuth = (newToken: string, newUser: UserInfo) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  // ✅ 로그아웃
  const logout = () => {
    logoutAPI()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        setAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ✅ 커스텀 훅
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.')
  }
  return context
}