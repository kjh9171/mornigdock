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
// 인증 보호 라우트 컴포넌트: 로그인 여부를 확인하여 접근을 제어합니다.
// ─────────────────────────────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  
  // 인증 정보를 불러오는 중일 때 표시할 로딩 화면
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </div>
    )
  }
  
  // 인증되었다면 자식 컴포넌트를 보여주고, 아니면 로그인 페이지로 강제 이동
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 렌더링 로직: 라우팅 구조를 정의합니다.
// ─────────────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 1. 인증이 필요 없는 공용 경로 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 2. 인증이 필요한 보호된 경로 (App 레이아웃 적용) */}
          <Route path="/" element={<PrivateRoute><App /></PrivateRoute>}>
            {/* ✅ 수정 포인트: <index> 태그가 아닌 index 속성을 가진 Route 사용 */}
            <Route index element={<News />} />
            <Route path="board" element={<Board />} />
            <Route path="board/write" element={<BoardWrite />} />
            <Route path="board/:id" element={<BoardDetail />} />
            <Route path="media" element={<Media />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          {/* 3. 정의되지 않은 모든 경로는 홈으로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)