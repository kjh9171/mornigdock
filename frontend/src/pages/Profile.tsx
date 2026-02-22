import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { 
  Shield, Key, User, Loader2, CheckCircle, 
  Fingerprint, Lock, Mail, Calendar, Edit3,
  ShieldCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

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
    setPwSuccess(false);
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
      setPwError(err.response?.data?.message ?? '비밀번호 변경 실패');
    } finally { 
      setSaving(false); 
    }
  };

  const handleOtpEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpSaving(true);
    try {
      await api.post('/auth/otp/enable', { code: otpCode });
      setOtpCode('');
      if (user) setUser({ ...user, otp_enabled: true });
      alert('OTP 보안 인증이 활성화되었습니다.');
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'OTP 활성화 실패');
    } finally { 
      setOtpSaving(false); 
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500 min-h-screen">
      {/* ── 헤더 섹션 ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Fingerprint size={28} className="stroke-[2.5]" />
            <span className="text-sm font-black uppercase tracking-widest">Identity Management</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">요원 프로필</h1>
          <p className="text-slate-500 mt-2 font-medium">기지 접속 권한 및 보안 인증 프로토콜 관리</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 요원 정보 카드 */}
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group transition-all hover:shadow-xl">
            <div className="w-28 h-28 rounded-[2.5rem] bg-blue-50 border border-blue-100 flex items-center justify-center text-4xl font-black text-blue-600 shadow-inner mb-6 group-hover:scale-105 transition-transform duration-500">
              {user?.name?.[0].toUpperCase()}
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">{user?.name} 요원</h2>
            <span className="px-4 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full mb-10">
              {user?.role === 'admin' ? 'Strategic Director' : user?.role === 'editor' ? 'Lead Analyst' : 'Active Agent'}
            </span>

            <div className="w-full space-y-4">
              <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-left">
                <Mail size={18} className="text-slate-300" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Identity</span>
                  <span className="text-sm font-bold text-slate-700 truncate">{user?.email}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-left">
                <div className="flex items-center gap-4">
                  <ShieldCheck size={18} className={user?.otp_enabled ? 'text-emerald-500' : 'text-slate-300'} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Link</span>
                    <span className={`text-sm font-bold ${user?.otp_enabled ? 'text-emerald-600' : 'text-red-500'}`}>
                      {user?.otp_enabled ? 'Active Secure' : 'Low Security'}
                    </span>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${user?.otp_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* 설정 영역 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 비밀번호 변경 */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Lock size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">비밀번호 재설정</h3>
            </div>

            <form onSubmit={handlePwChange} className="space-y-6">
              {[
                { id: 'currentPassword', label: '현재 비밀번호' },
                { id: 'newPassword', label: '새 비밀번호' },
                { id: 'confirm', label: '새 비밀번호 확인' }
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                  <input 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800" 
                    type="password" required
                    value={pwForm[field.id as keyof typeof pwForm]}
                    onChange={e => setPwForm(f => ({ ...f, [field.id]: e.target.value }))}
                  />
                </div>
              ))}

              {pwError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                  <AlertCircle size={16} /> {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-xs font-bold">
                  <CheckCircle size={16} /> 비밀번호가 안전하게 변경되었습니다.
                </div>
              )}

              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all shadow-xl hover:bg-slate-800 active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                변경 사항 저장
              </button>
            </form>
          </div>

          {/* OTP 활성화 */}
          {!user?.otp_enabled && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Shield size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">2단계 보안 설정</h3>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                기지 보안 강화를 위해 OTP 인증을 활성화하십시오. 발급된 QR 코드를 스캔한 후 6자리 번호를 입력하세요.
              </p>
              <form onSubmit={handleOtpEnable} className="flex flex-col sm:flex-row gap-4">
                <input 
                  className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-slate-800 text-2xl tracking-[0.5em] text-center placeholder:text-slate-200" 
                  type="text" inputMode="numeric" maxLength={6}
                  value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000" required 
                />
                <button 
                  type="submit" 
                  disabled={otpSaving}
                  className="sm:w-48 py-5 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
                >
                  {otpSaving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  보안 링크 활성화
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
