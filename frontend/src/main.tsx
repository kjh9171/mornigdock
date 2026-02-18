import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import App from './App' // 위에서 수정한 App.tsx
import Login from './pages/Login'
import Register from './pages/Register'
import News from './pages/News'
import Board from './pages/Board'
import BoardDetail from './pages/BoardDetail'
import BoardWrite from './pages/BoardWrite'
import Media from './pages/Media'
import Admin from './pages/Admin'
import './index.css'

// 인증 보호 라우트 컴포넌트
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
    </div>
  )
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 로그인/회원가입은 레이아웃 제외 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 메인 레이아웃(App) 적용 경로 */}
          <Route path="/" element={<PrivateRoute><App /></PrivateRoute>}>
            <index element={<News />} />
            <Route path="board" element={<Board />} />
            <Route path="board/write" element={<BoardWrite />} />
            <Route path="board/:id" element={<BoardDetail />} />
            <Route path="media" element={<Media />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)