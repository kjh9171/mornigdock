import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useActivityLog } from '../utils/activityLogger';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function Login() {
  const { login, register } = useAuthStore();
  const { logActivity } = useActivityLog();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'info' | 'otp'>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isSignup, setIsSignup] = useState(false);
  const [qrCode, setQrCode] = useState('');

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
          // 회원가입 후 바로 로그인 시도 (OTP 검증 포함)
          const res = await login(email, password, otpCode);
          if (!res.requireOtp) {
            logActivity('User Signup & Login');
          }
        }
      } else {
        const res = await login(email, password, otpCode);
        if (res.requireOtp) {
          setStep('otp');
        } else {
          logActivity('User Login');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border-[0.5px] border-stone-200 animate-in fade-in zoom-in duration-300">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-50 mb-4 border border-stone-100">
          <ShieldCheck className="w-8 h-8 text-primary-800" />
        </div>
        <h2 className="text-2xl font-bold text-primary-800 tracking-tight">
            {isSignup ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-stone-500 mt-2 text-sm">
            {isSignup ? 'Secure your account with Google OTP' : 'Please enter your credentials to access Agora'}
        </p>
      </div>

      <div className="flex bg-stone-100 p-1 rounded-lg mb-6">
          <button 
             onClick={() => { setIsSignup(false); setStep('info'); setError(''); }} 
             className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isSignup ? 'bg-white text-primary-800 shadow-sm' : 'text-stone-500'}`}
          >
              Login
          </button>
          <button 
             onClick={() => { setIsSignup(true); setStep('info'); setError(''); }} 
             className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isSignup ? 'bg-white text-primary-800 shadow-sm' : 'text-stone-500'}`}
          >
              Sign Up
          </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center gap-2 animate-in slide-in-from-top-2">
          <ShieldCheck className="w-4 h-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 'info' ? (
          <>
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                <input
                  type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                  placeholder="Hong Gil Dong"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            {isSignup && qrCode && (
              <div className="p-4 bg-white border border-stone-100 rounded-xl shadow-sm inline-block">
                <p className="text-xs text-stone-500 mb-2 font-bold">Scan with Google Authenticator</p>
                <QRCodeSVG value={qrCode} size={160} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Google Authenticator Code</label>
              <input
                type="text" required maxLength={6} value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none text-center text-xl tracking-widest font-mono"
                placeholder="000 000"
              />
            </div>
          </div>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-primary-800 text-white rounded-xl font-bold text-sm hover:bg-stone-900 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              {step === 'info' ? (isSignup ? 'Create Account' : 'Next Step') : 'Verify & Login'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
        
        {step === 'otp' && (
          <button type="button" onClick={() => setStep('info')} className="w-full text-xs text-stone-400 hover:text-stone-600">
            Back to Credentials
          </button>
        )}
      </form>
    </div>
  );
}
