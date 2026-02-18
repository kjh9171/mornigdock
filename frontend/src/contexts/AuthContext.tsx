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

  // ✅ 앱 시작 시 localStorage에서 토큰 복원 로직 최적화
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token')

      if (savedToken) {
        setToken(savedToken)
        try {
          // 서버에서 내 정보 가져오기 시도
          const res = await getMeAPI()
          
          // 백엔드 로그상 200이 찍히므로 데이터가 있으면 유저 정보를 즉시 업데이트
          // 만약 res.success 구조가 아니라면 res 데이터 자체를 확인하도록 유연하게 대응
          if (res && (res.user || res.email)) {
            setUser(res.user || res) // 서버 응답 구조가 {user: {...}} 또는 {...user}인 경우 모두 대응
          } else {
            // 응답이 부실할 경우 토큰 제거
            handleAuthFailure()
          }
        } catch (error) {
          // 네트워크 에러나 401 에러 발생 시 처리
          console.error('인증 복원 실패:', error)
          handleAuthFailure()
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // ✅ 중복 코드 방지를 위한 실패 처리 함수
  const handleAuthFailure = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  // ✅ 로그인 성공 시 호출
  const setAuth = (newToken: string, newUser: UserInfo) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    setIsLoading(false) // 로그인 성공 시 로딩 확실히 종료
  }

  // ✅ 로그아웃
  const logout = () => {
    logoutAPI()
    handleAuthFailure()
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
      {/* ⚠️ 로딩 중일 때는 잠시 처리를 멈추거나 UI에서 스피너를 돌려야 화면 깜빡임이 없습니다. */}
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