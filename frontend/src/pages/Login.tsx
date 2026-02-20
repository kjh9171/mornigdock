import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useTranslation } from 'react-i18next';
import { useActivityLog } from '../utils/activityLogger';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, Languages, Globe } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function LoginPage() {
  const { login, register, isAuthenticated } = useAuthStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'info' | 'otp'>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isSignup, setIsSignup] = useState(false);
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/news');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
        if (step === 'info') {
          const res = await register(email, password, name);
          if (res.success) {
            setQrCode(res.data.qrCode);
            setStep('otp');
            logActivity(`Signup Attempt: ${email}`);
          } else {
            setError(res.message);
          }
        } else {
          // 회원가입 후 OTP 단계에서 로그인 실행
          const res = await login(email, password, otpCode);
          if (!res.requireOtp) {
            logActivity('User Signup & Login Success');
            navigate('/news');
          }
        }
      } else {
        const res = await login(email, password, otpCode);
        if (res.requireOtp) {
          setStep('otp');
        } else {
          logActivity('User Login Success');
          navigate('/news');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0a0a0b] overflow-hidden p-4">
      {/* Premium Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-900/20 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse delay-700"></div>
      
      {/* Language Toggle */}
      <div className="absolute top-8 right-8 z-50">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/70 transition-all backdrop-blur-md"
        >
          <Globe className="w-3 h-3 text-amber-500" />
          {language === 'ko' ? 'ENGLISH' : '한국어'}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10 glass-container animate-in fade-in zoom-in duration-700">
        <div className="bg-white/[0.03] backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-900 mb-6 shadow-[0_20px_40px_-10px_rgba(30,58,138,0.5)] transform hover:rotate-6 transition-transform">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
                {isSignup ? t('register') : t('login_tab')}
            </h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                {isSignup ? t('signup_subtitle') : t('login_subtitle')}
            </p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl mb-10 border border-white/5">
              <button 
                onClick={() => { setIsSignup(false); setStep('info'); setError(''); }} 
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${!isSignup ? 'bg-white text-primary-900 shadow-xl scale-[1.02]' : 'text-white/30 hover:text-white/60'}`}
              >
                  {t('login_tab')}
              </button>
              <button 
                onClick={() => { setIsSignup(true); setStep('info'); setError(''); }} 
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${isSignup ? 'bg-white text-primary-900 shadow-xl scale-[1.02]' : 'text-white/30 hover:text-white/60'}`}
              >
                  {t('signup_tab')}
              </button>
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] font-bold text-red-400 flex items-center gap-4 animate-in slide-in-from-top-4">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 'info' ? (
              <>
                {isSignup && (
                  <div className="space-y-2 group">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-primary-400 transition-colors uppercase">{t('name_label')}</label>
                    <input
                      type="text" required value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 focus:border-primary-500/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/10"
                      placeholder={t('name_placeholder')}
                    />
                  </div>
                )}
                <div className="space-y-2 group">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-primary-400 transition-colors uppercase">{t('email_label')}</label>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary-400 transition-colors" />
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 focus:border-primary-500/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/10"
                      placeholder={t('email_placeholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2 group">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-primary-400 transition-colors uppercase">{t('password_label')}</label>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary-400 transition-colors" />
                    <input
                      type="password" required value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 focus:border-primary-500/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {isSignup && qrCode && (
                  <div className="p-8 bg-white border border-white/10 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(255,255,255,0.1)] inline-block transform hover:scale-105 transition-transform">
                    <p className="text-[9px] text-stone-900 mb-6 font-black uppercase tracking-widest">{t('signup_success')}</p>
                    <QRCodeSVG value={qrCode} size={200} />
                  </div>
                )}
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] uppercase">{t('otp_label')}</label>
                  <input
                    type="text" required maxLength={6} value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full py-6 bg-white/5 border border-white/10 focus:border-amber-500/30 focus:bg-white/[0.08] rounded-2xl outline-none text-center text-4xl tracking-[0.5em] font-mono font-black text-amber-500 shadow-inner"
                    placeholder={t('otp_placeholder')}
                  />
                </div>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:from-primary-500 hover:to-primary-700 transition-all shadow-[0_20px_40px_-12px_rgba(30,58,138,0.4)] flex items-center justify-center gap-4 group disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {step === 'info' ? (isSignup ? t('register') : t('login_tab')) : t('enter_otp')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform text-amber-400" />
                </>
              )}
            </button>
            
            {step === 'otp' && (
              <button 
                type="button" 
                onClick={() => setStep('info')} 
                className="w-full text-[9px] font-black text-white/20 uppercase tracking-[0.2em] hover:text-white/50 transition-colors"
              >
                {t('back_to_info')}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
