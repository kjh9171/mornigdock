import { useLanguageStore } from './store/useLanguageStore';
import { useAuthStore } from './store/useAuthStore';
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, ShieldCheck, LogOut, LayoutDashboard, FileText } from 'lucide-react'
import { NewsList } from './components/NewsList';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';

function App() {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguageStore();
  const { user, logout } = useAuthStore();
  const [view, setView] = useState<'news' | 'admin'>('news');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b-[0.5px] border-stone-200 z-10 transition-all">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-accent-600" />
          <h1 className="text-xl font-bold tracking-tight text-primary-800">Agora</h1>
        </div>
        <div className="flex items-center gap-3">
          {user?.isAdmin && (
            <div className="flex bg-stone-100 rounded-full p-1 mr-2 border border-stone-200">
              <button
                onClick={() => setView('news')}
                className={`p-2 rounded-full transition-all ${view === 'news' ? 'bg-white shadow-sm text-primary-800' : 'text-stone-400 hover:text-stone-600'}`}
                title="News Feed"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('admin')}
                className={`p-2 rounded-full transition-all ${view === 'admin' ? 'bg-white shadow-sm text-primary-800' : 'text-stone-400 hover:text-stone-600'}`}
                title="Admin Console"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </div>
          )}

          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-white border-[0.5px] border-stone-300 rounded-full hover:bg-stone-50 transition-colors shadow-soft"
          >
            <Globe className="w-4 h-4" />
            {language === 'ko' ? 'English' : '한국어'}
          </button>
          
          {user && (
            <button
              onClick={() => { logout(); setView('news'); }}
              className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className={`max-w-4xl w-full flex flex-col items-center space-y-8 mt-24 ${view === 'admin' ? 'px-4' : 'max-w-md'}`}>
        {!user ? (
          <Login />
        ) : (
          <>
            {view === 'news' ? (
              <div className="space-y-8 w-full max-w-md flex flex-col items-center">
                <div className="space-y-2 text-center">
                  <h2 className="text-4xl font-bold text-primary-800 tracking-tighter">
                    {t('welcome')}
                  </h2>
                  <p className="text-stone-500 font-light text-lg">
                    {user.email}
                  </p>
                </div>

                <div className="w-full p-6 bg-white border-[0.5px] border-stone-200 rounded-2xl shadow-soft">
                  <p className="text-sm text-stone-400 mb-4 uppercase tracking-widest font-semibold text-xs">
                    System Status
                  </p>
                  <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <span className="text-sm font-medium text-stone-600">Backend API</span>
                    <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                  </div>
                  <div className="mt-2 flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <span className="text-sm font-medium text-stone-600">Secure Hash</span>
                    <span className="text-xs font-mono text-stone-400 truncate max-w-[150px]">{user.hashedEmail}</span>
                  </div>
                </div>

                <div className="w-full flex justify-center">
                  <NewsList />
                </div>
              </div>
            ) : (
              <AdminPanel />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
