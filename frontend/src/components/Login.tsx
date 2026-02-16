import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { Mail, KeyRound, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Login() {
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8787/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
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
      
      if (res.ok) {
        setAuth(data.token, data.user);
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-soft border-[0.5px] border-stone-200">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-primary-800 tracking-tight">
          {step === 'email' ? t('login') : 'Enter Verification Code'}
        </h2>
        <p className="text-stone-500 text-sm mt-2 font-light">
          {step === 'email' 
            ? 'Access your secure dashboard via email' 
            : `Code sent to ${email}`}
        </p>
      </div>

      <AnimatePresence mode='wait'>
        {step === 'email' ? (
          <motion.form 
            key="email-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4" 
            onSubmit={handleRequestOtp}
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 transition-all font-medium text-primary-800 placeholder:text-stone-400"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-800 text-white py-3 rounded-xl hover:bg-stone-900 transition-all shadow-lg shadow-stone-200 disabled:opacity-70 disabled:cursor-not-allowed font-medium"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Continue <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.form>
        ) : (
          <motion.form 
            key="otp-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4" 
            onSubmit={handleVerifyOtp}
          >
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 transition-all font-medium text-primary-800 placeholder:text-stone-400 tracking-widest"
                placeholder="1 2 3 4 5 6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent-600 text-white py-3 rounded-xl hover:bg-accent-700 transition-all shadow-lg shadow-accent-100 disabled:opacity-70 disabled:cursor-not-allowed font-medium"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Verify & Login <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={() => setStep('email')} 
              className="w-full text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Back to Email
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {error && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center text-red-500 text-sm bg-red-50 py-2 rounded-lg"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
