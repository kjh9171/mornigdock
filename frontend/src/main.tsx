import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import App from './App'
import Login from './pages/Login'
import Register from './pages/Register'
import News from './pages/News'
import Board from './pages/Board'
import BoardDetail from './pages/BoardDetail'
import BoardWrite from './pages/BoardWrite'
import Media from './pages/Media'
import Admin from './pages/Admin'
import './index.css'

// ─────────────────────────────────────────────────────────────────────────────
// ✅ 인증 보호 라우트: 불필요한 리렌더링 방지를 위해 메모이제이션 적용 검토 가능
// ─────────────────────────────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </div>
    )
  }
  
  // 인증되지 않았다면 로그인으로 보내고, 인증되었다면 children(App)을 렌더링
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 1. 공개 경로 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 2. 보호된 경로: App 컴포넌트를 레이아웃으로 사용 */}
          <Route path="/" element={<PrivateRoute><App /></PrivateRoute>}>
            {/* ✅ [구조 최적화] 
                App.tsx 내부의 <Outlet /> 지점에 아래 컴포넌트들이 끼워집니다.
                index는 기본 경로('/')일 때 News를 보여줍니다.
            */}
            <Route index element={<News />} />
            <Route path="board" element={<Board />} />
            <Route path="board/write" element={<BoardWrite />} />
            <Route path="board/:id" element={<BoardDetail />} />
            <Route path="media" element={<Media />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          {/* 3. 예외 처리 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)