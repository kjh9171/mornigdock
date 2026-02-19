import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './App'
import Login from './pages/Login'
import News from './pages/News'
import Board from './pages/Board'
import BoardDetail from './pages/BoardDetail'
import BoardWrite from './pages/BoardWrite'
import Media from './pages/Media'
import Admin from './pages/Admin'
import './index.css'
import './i18n'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
    </div>
  )
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            {/* 🔥 뉴스 상세 경로 추가하여 토론장과 연동 */}
            <Route path="/" element={<News />} />
            <Route path="/news/:id" element={<News />} /> 
            
            <Route path="/board" element={<Board />} />
            <Route path="/board/write" element={<BoardWrite />} />
            <Route path="/board/:id" element={<BoardDetail />} />
            <Route path="/media" element={<Media />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
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
