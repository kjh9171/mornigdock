// frontend/src/contexts/AuthContext.tsx 전체 수정
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getMeAPI, logoutAPI, UserInfo } from '../lib/api'

interface AuthContextType {
  user: UserInfo | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setAuth: (token: string, user: UserInfo) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token')
      if (!savedToken) {
        setIsLoading(false)
        return
      }

      try {
        setToken(savedToken)
        const res = await getMeAPI()
        // API 응답 구조에 따라 유연하게 대처 (res.user 또는 res 자체가 유저 정보인 경우)
        const userData = res.user || (res.email ? res : null)
        
        if (userData) {
          setUser(userData)
        } else {
          handleAuthFailure()
        }
      } catch (error) {
        handleAuthFailure()
      } finally {
        setIsLoading(false)
      }
    }
    initAuth()
  }, [])

  const handleAuthFailure = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const setAuth = (newToken: string, newUser: UserInfo) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    setIsLoading(false)
  }

  const logout = () => {
    logoutAPI()
    handleAuthFailure()
  }

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      isAuthenticated: !!user && !!token,
      setAuth, logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}