import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, ShieldCheck } from 'lucide-react'

function App() {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState('ko');

  const toggleLanguage = () => {
    const newLang = lang === 'ko' ? 'en' : 'ko';
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b-[0.5px] border-stone-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-accent-600" />
          <h1 className="text-xl font-bold tracking-tight text-primary-800">Agora</h1>
        </div>
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 bg-white border-[0.5px] border-stone-300 rounded-full hover:bg-stone-50 transition-colors shadow-soft"
        >
          <Globe className="w-4 h-4" />
          {lang === 'ko' ? 'English' : '한국어'}
        </button>
      </header>

      <main className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-primary-800 tracking-tighter">
            {t('welcome')}
          </h2>
          <p className="text-stone-500 font-light text-lg">
            {t('subtitle')}
          </p>
        </div>

        <div className="p-6 bg-white border-[0.5px] border-stone-200 rounded-2xl shadow-soft">
          <p className="text-sm text-stone-400 mb-4 uppercase tracking-widest font-semibold text-xs">
            System Status
          </p>
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
            <span className="text-sm font-medium text-stone-600">Backend API</span>
            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
          </div>
          <div className="mt-2 flex items-center justify-between p-3 bg-stone-50 rounded-lg">
            <span className="text-sm font-medium text-stone-600">Database (D1)</span>
            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
