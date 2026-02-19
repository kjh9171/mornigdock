import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import News from './pages/News'
import Board from './pages/Board'
import BoardDetail from './pages/BoardDetail'
import BoardWrite from './pages/BoardWrite'
import Media from './pages/Media'
import Admin from './pages/Admin'
import './index.css'

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
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><News /></PrivateRoute>} />
          <Route path="/board" element={<PrivateRoute><Board /></PrivateRoute>} />
          <Route path="/board/write" element={<PrivateRoute><BoardWrite /></PrivateRoute>} />
          <Route path="/board/:id" element={<PrivateRoute><BoardDetail /></PrivateRoute>} />
          <Route path="/media" element={<PrivateRoute><Media /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
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