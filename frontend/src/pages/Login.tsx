import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useActivityLog } from '../utils/activityLogger';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function LoginPage() {
  const { login, register, isAuthenticated } = useAuthStore();
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

  // 이미 로그인된 경우 메인으로 튕겨냄
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
          }
        } else {
          const res = await login(email, password, otpCode);
          if (!res.requireOtp) {
            logActivity('User Signup & Login');
            navigate('/news');
          }
        }
      } else {
        const res = await login(email, password, otpCode);
        if (res.requireOtp) {
          setStep('otp');
        } else {
          logActivity('User Login');
          navigate('/news');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl border border-stone-100 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-900 mb-4 shadow-xl">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tighter uppercase">
              {isSignup ? 'Initialize Unit' : 'Secure Access'}
          </h2>
          <p className="text-stone-400 mt-2 text-xs font-bold uppercase tracking-widest">
              {isSignup ? 'Register for Intelligence Core' : 'Enter credentials for Agora V2'}
          </p>
        </div>

        <div className="flex bg-stone-100 p-1.5 rounded-2xl mb-8">
            <button 
               onClick={() => { setIsSignup(false); setStep('info'); setError(''); }} 
               className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${!isSignup ? 'bg-white text-primary-900 shadow-lg' : 'text-stone-400 hover:text-stone-600'}`}
            >
                Login
            </button>
            <button 
               onClick={() => { setIsSignup(true); setStep('info'); setError(''); }} 
               className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${isSignup ? 'bg-white text-primary-900 shadow-lg' : 'text-stone-400 hover:text-stone-600'}`}
            >
                Sign Up
            </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600 flex items-center gap-3 animate-in slide-in-from-top-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {step === 'info' ? (
            <>
              {isSignup && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Full Identity</label>
                  <input
                    type="text" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent focus:border-primary-900/10 rounded-2xl outline-none transition-all font-bold text-stone-800"
                    placeholder="HONG GIL DONG"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Comm Link (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-stone-50 border-2 border-transparent focus:border-primary-900/10 rounded-2xl outline-none transition-all font-bold text-stone-800"
                    placeholder="agent@agora.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Access Code (Password)</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                  <input
                    type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-stone-50 border-2 border-transparent focus:border-primary-900/10 rounded-2xl outline-none transition-all font-bold text-stone-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center space-y-6">
              {isSignup && qrCode && (
                <div className="p-6 bg-white border border-stone-100 rounded-[2rem] shadow-xl inline-block">
                  <p className="text-[10px] text-stone-400 mb-4 font-black uppercase tracking-widest">Scan Tactical QR</p>
                  <QRCodeSVG value={qrCode} size={180} />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Secondary Auth Code (OTP)</label>
                <input
                  type="text" required maxLength={6} value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-5 bg-stone-50 border-2 border-transparent focus:border-primary-900/10 rounded-2xl outline-none text-center text-3xl tracking-[0.5em] font-mono font-black text-primary-900"
                  placeholder="000000"
                />
              </div>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-5 bg-primary-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-3 group disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {step === 'info' ? (isSignup ? 'Initialize Unit' : 'Authorize Login') : 'Verify & Execute'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-amber-500" />
              </>
            )}
          </button>
          
          {step === 'otp' && (
            <button type="button" onClick={() => setStep('info')} className="w-full text-[10px] font-black text-stone-400 uppercase tracking-widest hover:text-stone-600">
              Back to Primary Auth
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
