import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Layout    from './components/Layout';
import LoginPage from './pages/Login';
import NewsPage  from './pages/News';
import MediaPage from './pages/Media';
import AdminPage from './pages/Admin';
import ProfilePage from './pages/Profile';
import BoardPage   from './pages/Board';
import BoardDetail from './pages/BoardDetail';
import BoardWrite  from './pages/BoardWrite';
import FinancePage from './pages/Finance';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/news" replace />;
  return <>{children}</>;
}

export default function App() {
  const fetchMe = useAuthStore(state => state.fetchMe);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index                element={<Navigate to="/news" replace />} />
          <Route path="news"          element={<NewsPage />} />
          <Route path="media"         element={<MediaPage />} />
          <Route path="finance"       element={<FinancePage />} />
          <Route path="board"         element={<BoardPage />} />
          <Route path="board/write"   element={<ProtectedRoute><BoardWrite /></ProtectedRoute>} />
          <Route path="board/:id"     element={<BoardDetail />} />
          <Route path="profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="admin"         element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/news" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
