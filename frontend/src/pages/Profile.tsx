import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import { Shield, Key, User, Loader2, CheckCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [otpCode, setOtpCode] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [otpSaving, setOtpSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError,   setPwError]   = useState('');

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/password', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      setPwSuccess(true);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) {
      setPwError(err.response?.data?.message ?? '변경 실패');
    } finally { setSaving(false); }
  };

  const handleOtpEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpSaving(true);
    try {
      await api.post('/auth/otp/enable', { code: otpCode });
      setOtpCode('');
      if (user) setUser({ ...user, otp_enabled: true });
      alert('OTP가 활성화되었습니다!');
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'OTP 활성화 실패');
    } finally { setOtpSaving(false); }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-bold">프로필</h1>

      {/* 계정 정보 */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-agora-accent/20 flex items-center justify-center text-xl font-bold text-agora-accent">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-agora-muted text-sm">{user?.email}</p>
            <span className={`badge text-xs mt-1 inline-block ${
              user?.role === 'admin' ? 'bg-agora-gold/10 text-agora-gold' :
              user?.role === 'editor' ? 'bg-agora-accent/10 text-agora-accent' :
              'bg-agora-border text-agora-muted'
            }`}>{user?.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Shield size={15} className={user?.otp_enabled ? 'text-green-400' : 'text-agora-muted'} />
          <span className={user?.otp_enabled ? 'text-green-400' : 'text-agora-muted'}>
            2단계 인증 {user?.otp_enabled ? '활성화됨' : '비활성화'}
          </span>
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="card">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Key size={16} /> 비밀번호 변경</h2>
        <form onSubmit={handlePwChange} className="space-y-3">
          {['currentPassword', 'newPassword', 'confirm'].map((field) => (
            <div key={field}>
              <label className="text-xs text-agora-muted mb-1 block">
                {field === 'currentPassword' ? '현재 비밀번호' : field === 'newPassword' ? '새 비밀번호' : '새 비밀번호 확인'}
              </label>
              <input className="input" type="password" required
                value={pwForm[field as keyof typeof pwForm]}
                onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))} />
            </div>
          ))}
          {pwError && <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg">{pwError}</p>}
          {pwSuccess && (
            <p className="text-green-400 text-xs bg-green-400/10 px-3 py-2 rounded-lg flex items-center gap-1">
              <CheckCircle size={12} /> 비밀번호가 변경되었습니다. 다시 로그인하세요.
            </p>
          )}
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            변경
          </button>
        </form>
      </div>

      {/* OTP 활성화 */}
      {!user?.otp_enabled && (
        <div className="card">
          <h2 className="font-semibold mb-2 flex items-center gap-2"><Shield size={16} /> OTP 2단계 인증 활성화</h2>
          <p className="text-agora-muted text-sm mb-4">
            회원가입 시 발급된 QR코드를 Google Authenticator로 스캔한 후, 생성된 6자리 코드를 입력하세요.
          </p>
          <form onSubmit={handleOtpEnable} className="flex gap-2">
            <input className="input flex-1 text-center font-mono tracking-widest text-lg" type="text"
              inputMode="numeric" maxLength={6} pattern="\d{6}"
              value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000" required />
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={otpSaving}>
              {otpSaving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              활성화
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
