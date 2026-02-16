import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useActivityLog } from '../utils/activityLogger';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, UserPlus } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export function Login() {
  const { login } = useAuthStore();
  const { logActivity } = useActivityLog();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Signup State
  const [isSignup, setIsSignup] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
          // Signup Flow
          const res = await fetch('http://localhost:8787/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          
          if (!res.ok) {
             if (res.status === 409) {
                 setError(data.error);
             } else {
                 throw new Error(data.error || 'Signup failed');
             }
          } else {
             // Success -> Show QR
             setQrUrl(data.otpauth);
             setStep('otp'); // Move to verification
          }
      } else {
          // Login Flow
          const res = await fetch('http://localhost:8787/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          
          if (!res.ok) {
             if (data.needSignup) {
                 setError('User not found. Please Sign Up first.');
             } else {
                throw new Error(data.error || 'Login failed');
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
      const res = await fetch('http://localhost:8787/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Verification failed');

      // Success
      login(data.user, data.token);
      logActivity(isSignup ? 'User Signup' : 'User Login');
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
             onClick={() => { setIsSignup(false); setStep('email'); setError(''); }} 
             className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isSignup ? 'bg-white text-primary-800 shadow-sm' : 'text-stone-500'}`}
          >
              Login
          </button>
          <button 
             onClick={() => { setIsSignup(true); setStep('email'); setError(''); }} 
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

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 transition-all font-medium text-stone-800"
                placeholder="name@company.com"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-800 text-white rounded-xl font-bold text-sm hover:bg-stone-900 transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Next Step <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="text-center">
            {isSignup && qrUrl && (
                <div className="mb-6 p-4 bg-white border border-stone-100 rounded-xl shadow-sm inline-block">
                    <p className="text-sm text-stone-500 mb-2">Scan with Google Authenticator</p>
                    <div className="flex justify-center">
                         <QRCodeCanvas value={qrUrl} size={160} />
                    </div>
                </div>
            )}
            
            <label className="block text-sm font-medium text-stone-700 mb-2">
               {isSignup ? 'Enter Verification Code' : 'Google Authenticator Code'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 transition-all font-mono text-center text-xl tracking-widest text-primary-800"
                placeholder="000 000"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent-600 text-white rounded-xl font-bold text-sm hover:bg-accent-700 transition-all shadow-lg shadow-accent-200 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignup ? 'Complete Signup' : 'Verify & Login')}
          </button>
          
          <button 
            type="button" 
            onClick={() => setStep('email')}
            className="w-full text-xs text-stone-400 hover:text-stone-600"
          >
            Change Email
          </button>
        </form>
      )}
    </div>
  );
}
