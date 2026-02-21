import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Shield, Key, User, Loader2, CheckCircle, Fingerprint, Lock, Mail, Calendar, Edit3 } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { t } = useTranslation();
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
      setPwError(t('password_mismatch') || '비밀번호가 일치하지 않습니다.');
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
      alert('OTP Profile Activated');
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'OTP Activation Failed');
    } finally { setOtpSaving(false); }
  };

  return (
    <div className="bg-[#0a0a0b] min-h-screen -mt-6 -mx-4 lg:-mx-0 px-4 lg:px-10 py-10 text-white"> {/* 다크 테마 복구 */}
      <div className="max-w-4xl mx-auto space-y-10">
      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end justify-between border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 text-agora-gold mb-2">
            <Fingerprint size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Identity Protocol v4.0</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">{t('profile')}</h1>
          <p className="text-white/30 text-xs font-bold mt-2 uppercase tracking-wider">Operational Identity & Authentication Configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* 계정 정보 카드 */}
        <div className="lg:col-span-2 space-y-8">
           <div className="glass-container p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-agora-gold/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-agora-gold/10 transition-all duration-700"></div>
             
             <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-agora-gold/20 to-transparent border border-white/10 flex items-center justify-center text-3xl font-black text-white shadow-2xl mb-6 transform group-hover:scale-110 transition-transform duration-500">
                    {user?.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">{user?.name}</h2>
                <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-agora-gold mb-8">
                    {user?.role === 'admin' ? 'Strategic Administrator' : user?.role === 'editor' ? 'Lead Analyst' : 'Intelligence Agent'}
                </div>

                <div className="w-full space-y-4 text-left">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <Mail size={14} className="text-white/20" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{t('email_text')}</span>
                            <span className="text-[11px] font-bold text-white/70">{user?.email}</span>
                        </div>
                    </div>
                   <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                             <Shield size={14} className={user?.otp_enabled ? 'text-emerald-400' : 'text-white/20'} />
                             <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Security State</span>
                                <span className={`text-[11px] font-bold ${user?.otp_enabled ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {user?.otp_enabled ? 'Active Encryption' : 'Risk Detected'}
                                </span>
                             </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${user?.otp_enabled ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                    </div>
                </div>
             </div>
           </div>
        </div>

        {/* 설정 폼 영역 */}
        <div className="lg:col-span-3 space-y-10">
            {/* 비밀번호 변경 */}
            <div className="glass-container p-10 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center gap-3 mb-10">
                    <Lock size={18} className="text-agora-gold" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Neural Key Recalibration</h3>
                </div>
                <form onSubmit={handlePwChange} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {[
                            { id: 'currentPassword', label: 'Current Authentication Key' },
                            { id: 'newPassword', label: 'New Neural Signature' },
                            { id: 'confirm', label: 'Confirm New Signature' }
                        ].map((field) => (
                            <div key={field.id} className="space-y-3 group">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-agora-gold transition-colors">{field.label}</label>
                                <input className="w-full px-6 py-4 bg-white/5 border border-white/10 focus:border-agora-gold/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white focus:ring-1 ring-agora-gold/20" 
                                    type="password" required
                                    value={pwForm[field.id as keyof typeof pwForm]}
                                    onChange={e => setPwForm(f => ({ ...f, [field.id]: e.target.value }))} />
                            </div>
                        ))}
                    </div>
                    
                    {pwError && <p className="text-[10px] font-bold text-red-400 bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20">{pwError}</p>}
                    {pwSuccess && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                            <CheckCircle size={16} className="text-emerald-400" />
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-relaxed">System updated. Please re-authenticate neural link.</p>
                        </div>
                    )}
                    
                    <button type="submit" className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 duration-200" disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} className="text-agora-gold" />}
                        {t('save_settings')}
                    </button>
                </form>
            </div>

            {/* OTP 활성화 */}
            {!user?.otp_enabled && (
                <div className="glass-container p-10 rounded-[2.5rem] border border-white/5 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield size={18} className="text-agora-gold" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">2-Factor Neural Link</h3>
                    </div>
                    <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-8 leading-relaxed">
                        Scan the protocol QR issued at induction. Enter the 6-digit cryptographic token below.
                    </p>
                    <form onSubmit={handleOtpEnable} className="flex flex-col sm:flex-row gap-4">
                        <input className="flex-1 px-8 py-5 bg-white/5 border border-white/10 focus:border-agora-gold/40 rounded-2xl outline-none font-black text-white text-2xl tracking-[0.5em] text-center placeholder:text-white/10" 
                            type="text"
                            inputMode="numeric" maxLength={6} pattern="\d{6}"
                            value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000" required />
                        <button type="submit" className="sm:w-48 py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-900/40 flex items-center justify-center gap-3 active:scale-95" disabled={otpSaving}>
                            {otpSaving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                            Activate Protocol
                        </button>
                    </form>
                </div>
            )}
        </div>
      </div>
      </div>
    </div>
  );
}
