import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import './index.css'

// ✅ 인증 필요 라우트 보호 컴포넌트
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// ✅ 메인 홈 페이지 (임시 - 실제 컴포넌트로 교체 필요)
function Home() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-stone-800">안녕하세요, {user?.username}님!</h1>
        <p className="mt-2 text-stone-500">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-6 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}

// ✅ 앱 라우터 설정
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 인증 필요 라우트 */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />

          {/* 기타 경로 → 홈으로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)