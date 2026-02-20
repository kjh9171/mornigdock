import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Newspaper, Tv, Shield, User, LogIn, LogOut, Columns2 } from 'lucide-react';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const location = useLocation();
  const navigate  = useNavigate();

  const nav = [
    { path: '/news',  label: '인텔리전스', icon: Newspaper },
    { path: '/media', label: '미디어 센터', icon: Tv },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: '관제실', icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-agora-bg">
      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-50 bg-agora-bg/80 backdrop-blur-xl border-b border-agora-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* 로고 */}
          <Link to="/news" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <Columns2 className="text-agora-accent" size={22} />
            <span className="text-agora-text">Agora</span>
          </Link>

          {/* 네비게이션 */}
          <nav className="hidden sm:flex items-center gap-1">
            {nav.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith(path)
                    ? 'bg-agora-accent/10 text-agora-accent'
                    : 'text-agora-muted hover:text-agora-text hover:bg-agora-border'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>

          {/* 우측 액션 */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 text-sm text-agora-muted hover:text-agora-text transition-colors px-2 py-1.5 rounded-lg hover:bg-agora-border"
                >
                  <User size={15} />
                  <span className="hidden sm:inline">{user?.name}</span>
                  {user?.role !== 'user' && (
                    <span className={`badge hidden sm:inline-block ${user?.role === 'admin' ? 'bg-agora-gold/10 text-agora-gold' : 'bg-agora-accent/10 text-agora-accent'}`}>
                      {user?.role}
                    </span>
                  )}
                </Link>
                <button onClick={handleLogout} className="btn-ghost text-sm flex items-center gap-1.5 !px-3 !py-1.5">
                  <LogOut size={15} />
                  <span className="hidden sm:inline">로그아웃</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary text-sm flex items-center gap-1.5">
                <LogIn size={15} />
                로그인
              </Link>
            )}
          </div>
        </div>

        {/* 모바일 네비게이션 */}
        <div className="sm:hidden flex border-t border-agora-border">
          {nav.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                location.pathname.startsWith(path)
                  ? 'text-agora-accent'
                  : 'text-agora-muted'
              }`}
            >
              <Icon size={18} className="mb-0.5" />
              {label}
            </Link>
          ))}
        </div>
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 animate-fade-in">
        <Outlet />
      </main>

      {/* ── 푸터 ── */}
      <footer className="border-t border-agora-border py-4 text-center text-agora-muted text-xs">
        © 2025 Agora Intelligence Platform · Powered by CERT
      </footer>
    </div>
  );
}
