import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLog } from '../utils/activityLogger';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { setAuth } = useAuth();
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Signup State
  const [isSignup, setIsSignup] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || '';

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
          // Signup Flow
          const res = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          
          if (!res.ok) {
             throw new Error(data.error || data.message || 'Signup failed');
          } else {
             // Success -> Show QR
             setQrUrl(data.otpauth);
             setStep('otp'); // Move to verification
          }
      } else {
          // Login Flow
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          
          if (!res.ok) {
             if (data.needSignup) {
                 setError('사용자를 찾을 수 없습니다. 회원가입을 먼저 해주세요.');
             } else {
                throw new Error(data.error || data.message || '로그인 요청 실패');
             }
          } else {
             // Success -> Ask for OTP
             setStep('otp');
          }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || data.message || '인증 실패');

      // Success
      setAuth(data.token, data.user);
      logActivity(isSignup ? 'User Signup' : 'User Login');
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border-[0.5px] border-stone-200 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-50 mb-4 border border-stone-100">
            <ShieldCheck className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
              {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-stone-500 mt-2 text-sm">
              {isSignup ? 'Google OTP를 사용하여 계정을 보호하세요' : 'Agora 플랫폼 접속을 위해 인증을 완료해주세요'}
          </p>
        </div>

        <div className="flex bg-stone-100 p-1 rounded-lg mb-6">
            <button 
               onClick={() => { setIsSignup(false); setStep('email'); setError(''); setQrUrl(''); }} 
               className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isSignup ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
                로그인
            </button>
            <button 
               onClick={() => { setIsSignup(true); setStep('email'); setError(''); setQrUrl(''); }} 
               className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isSignup ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
            >
                회원가입
            </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center gap-2 animate-in slide-in-from-top-2">
            <ShieldCheck className="w-4 h-4" />
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">이메일 주소</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all font-medium text-stone-800"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    다음 단계 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="text-center">
              {isSignup && qrUrl && (
                  <div className="mb-6 p-4 bg-white border border-stone-100 rounded-xl shadow-sm inline-block">
                      <p className="text-xs text-stone-500 mb-3">Google Authenticator 앱으로 스캔하세요</p>
                      <div className="flex justify-center p-2 bg-white rounded-lg">
                           <QRCodeCanvas value={qrUrl} size={160} />
                      </div>
                  </div>
              )}
              
              <label className="block text-sm font-medium text-stone-700 mb-2">
                 {isSignup ? '인증 코드 입력' : 'Google OTP 인증 코드'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all font-mono text-center text-xl tracking-widest text-stone-900"
                  placeholder="000000"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignup ? '가입 완료' : '인증 및 로그인')}
            </button>
            
            <button 
              type="button" 
              onClick={() => { setStep('email'); setQrUrl(''); }}
              className="w-full text-xs text-stone-400 hover:text-stone-600 font-medium"
            >
              이메일 주소 변경
            </button>
          </form>
        )}
      </div>
    </div>
  );
}