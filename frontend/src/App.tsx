import { useLanguageStore } from './store/useLanguageStore';
import { useAuthStore } from './store/useAuthStore';
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, ShieldCheck, LogOut, LayoutDashboard, FileText, MessageSquare, Play } from 'lucide-react'
import { NewsList } from './components/NewsList';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { AgoraDiscussion } from './components/AgoraDiscussion';
import { MediaCenter } from './components/MediaCenter';
import { useNavigationStore } from './store/useNavigationStore';

function App() {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguageStore();
  const { user, logout } = useAuthStore();
  
  // Use Global Navigation Store
  const { view, userTab, setView, setUserTab } = useNavigationStore();

  // Auto-redirect Admin to Admin Panel
  useEffect(() => {
    if (user?.isAdmin) {
      setView('admin');
    }
  }, [user, setView]);

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
                onClick={() => setView('user')}
                className={`p-2 rounded-full transition-all ${view === 'user' ? 'bg-white shadow-sm text-primary-800' : 'text-stone-400 hover:text-stone-600'}`}
                title="User View"
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
            {language === 'ko' ? 'EN' : 'KO'}
          </button>
          
          {user && (
            <button
              onClick={() => { logout(); setView('user'); }}
              className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className={`max-w-4xl w-full flex flex-col items-center space-y-8 mt-24 ${view === 'admin' ? 'px-4' : 'max-w-xl'}`}>
        {!user ? (
          <Login />
        ) : (
          <>
            {view === 'user' ? (
              <div className="space-y-8 w-full flex flex-col items-center">
                {/* User Status Header */}
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-primary-800 tracking-tighter">
                    {t('welcome')}
                  </h2>
                  <p className="text-stone-500 font-light">
                    Logged in as <span className="font-medium text-stone-800">{user.email}</span>
                  </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex p-1 bg-stone-100 rounded-xl w-full max-w-sm">
                  <button
                    onClick={() => setUserTab('news')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                      userTab === 'news' 
                        ? 'bg-white shadow-sm text-primary-800' 
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Global News
                  </button>
                  <button
                    onClick={() => setUserTab('discussion')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                      userTab === 'discussion' 
                        ? 'bg-white shadow-sm text-primary-800' 
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" /> Agora Board
                  </button>
                  <button
                    onClick={() => setUserTab('media')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                      userTab === 'media' 
                        ? 'bg-white shadow-sm text-primary-800' 
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <Play className="w-4 h-4" /> Media Hub
                  </button>
                </div>

                {/* Content Area */}
                <div className="w-full flex justify-center">
                  {userTab === 'news' && <NewsList />}
                  {userTab === 'discussion' && <AgoraDiscussion />}
                  {userTab === 'media' && <MediaCenter />}
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
