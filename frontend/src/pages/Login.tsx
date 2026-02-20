import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Columns2, Eye, EyeOff, Loader2 } from 'lucide-react';

type Step = 'login' | 'otp' | 'register' | 'register-otp';

export default function LoginPage() {
  const [step,      setStep]      = useState<Step>('login');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [name,      setName]      = useState('');
  const [otpCode,   setOtpCode]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState('');
  const [regData,   setRegData]   = useState<any>(null);

  const { login, register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await login(email, password);
      if (result.requireOtp) {
        setStep('otp');
      } else {
        navigate('/news');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password, otpCode);
      navigate('/news');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await register(email, password, name);
      setRegData(data.data);
      setStep('register-otp');
    } catch (err: any) {
      setError(err.response?.data?.message ?? '회원가입 실패');
    }
  };

  return (
    <div className="min-h-screen bg-agora-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-bold mb-2">
            <Columns2 className="text-agora-accent" size={28} />
            <span>Agora</span>
          </div>
          <p className="text-agora-muted text-sm">하이엔드 글로벌 지능형 플랫폼</p>
        </div>

        <div className="card">
          {/* ── 로그인 폼 ── */}
          {step === 'login' && (
            <>
              <h2 className="text-lg font-semibold mb-5">로그인</h2>
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="text-xs text-agora-muted mb-1 block">이메일</label>
                  <input className="input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="admin@agora.com" required />
                </div>
                <div>
                  <label className="text-xs text-agora-muted mb-1 block">비밀번호</label>
                  <div className="relative">
                    <input className="input pr-10" type={showPw ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-agora-muted hover:text-agora-text"
                      onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" className="btn-primary w-full justify-center flex items-center gap-2 mt-2" disabled={isLoading}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  로그인
                </button>
              </form>
              <p className="text-center text-agora-muted text-sm mt-4">
                계정이 없으신가요?{' '}
                <button className="text-agora-accent hover:underline" onClick={() => { setStep('register'); setError(''); }}>
                  회원가입
                </button>
              </p>
            </>
          )}

          {/* ── OTP 폼 ── */}
          {step === 'otp' && (
            <>
              <h2 className="text-lg font-semibold mb-2">OTP 인증</h2>
              <p className="text-agora-muted text-sm mb-5">Google Authenticator의 6자리 코드를 입력하세요.</p>
              <form onSubmit={handleOtp} className="space-y-3">
                <input className="input text-center text-2xl tracking-[0.5em] font-mono" type="text"
                  inputMode="numeric" maxLength={6} pattern="\d{6}"
                  value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000" required />
                {error && <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" className="btn-primary w-full justify-center flex items-center gap-2" disabled={isLoading}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  확인
                </button>
                <button type="button" className="btn-ghost w-full text-sm" onClick={() => { setStep('login'); setError(''); }}>
                  ← 뒤로
                </button>
              </form>
            </>
          )}

          {/* ── 회원가입 폼 ── */}
          {step === 'register' && (
            <>
              <h2 className="text-lg font-semibold mb-5">회원가입</h2>
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="text-xs text-agora-muted mb-1 block">이름</label>
                  <input className="input" type="text" value={name}
                    onChange={e => setName(e.target.value)} placeholder="홍길동" required />
                </div>
                <div>
                  <label className="text-xs text-agora-muted mb-1 block">이메일</label>
                  <input className="input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="user@example.com" required />
                </div>
                <div>
                  <label className="text-xs text-agora-muted mb-1 block">비밀번호 (8자 이상)</label>
                  <div className="relative">
                    <input className="input pr-10" type={showPw ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required minLength={8} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-agora-muted hover:text-agora-text"
                      onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" className="btn-primary w-full justify-center flex items-center gap-2 mt-2" disabled={isLoading}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  회원가입
                </button>
                <button type="button" className="btn-ghost w-full text-sm" onClick={() => { setStep('login'); setError(''); }}>
                  ← 로그인으로
                </button>
              </form>
            </>
          )}

          {/* ── 회원가입 OTP QR ── */}
          {step === 'register-otp' && regData && (
            <>
              <h2 className="text-lg font-semibold mb-2">OTP 설정</h2>
              <p className="text-agora-muted text-sm mb-4">
                Google Authenticator로 아래 QR코드를 스캔하세요. 2단계 인증이 권장됩니다.
              </p>
              <div className="bg-white p-4 rounded-xl mb-4 flex justify-center">
                <img src={regData.qrCode} alt="OTP QR Code" className="w-40 h-40" />
              </div>
              <div className="bg-agora-bg border border-agora-border rounded-lg p-3 mb-4">
                <p className="text-xs text-agora-muted mb-1">수동 입력 키</p>
                <code className="text-agora-accent text-xs font-mono break-all">{regData.otpSecret}</code>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary flex-1 text-sm" onClick={() => navigate('/login')}>
                  로그인하기
                </button>
              </div>
              <p className="text-agora-muted text-xs text-center mt-3">
                * OTP 없이도 로그인 후 프로필에서 활성화 가능합니다.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
