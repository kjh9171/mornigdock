import { useAuth } from '../contexts/AuthContext';
import { User, Shield, Mail, Key, Bell, Globe, Database, ShieldAlert } from 'lucide-react';

export function UserSettings() {
  const { user } = useAuth();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ─── 헤더 섹션 ─── */}
      <div className="bg-stone-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-stone-800">
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
          <Shield className="w-40 h-40" />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-24 h-24 bg-amber-600 rounded-3xl flex items-center justify-center shadow-lg border-4 border-stone-800">
            <User className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">{user?.username} 요원 설정</h1>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-stone-800 text-stone-400 text-[10px] font-black rounded-full border border-stone-700 uppercase tracking-widest">
                ID: {user?.id}
              </span>
              <span className="px-3 py-1 bg-amber-600/20 text-amber-500 text-[10px] font-black rounded-full border border-amber-600/30 uppercase tracking-widest">
                Clearance: {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ─── 개인 정보 관리 ─── */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm">
            <h2 className="text-lg font-black text-primary-950 mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" /> 기본 프로필 정보
            </h2>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">이메일 주소</label>
                <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <Mail className="w-4 h-4 text-stone-400" />
                  <span className="text-sm font-bold text-stone-600">{user?.email}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 pt-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">비밀번호</label>
                <button className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-2xl hover:border-amber-600 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <Key className="w-4 h-4 text-stone-400" />
                    <span className="text-sm font-bold text-stone-900">비밀번호 변경하기</span>
                  </div>
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Change</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm">
            <h2 className="text-lg font-black text-primary-950 mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" /> 작전 알림 설정
            </h2>
            <div className="space-y-4">
              {[
                { label: '새로운 지능 보고서 알림', desc: '사령부에서 새로운 뉴스 분석이 완료되면 즉시 통보합니다.' },
                { label: '아고라 토론 참여 알림', desc: '내 발제글에 새로운 댓글이나 대댓글이 달리면 알림을 보냅니다.' },
                { label: '증시 변동성 긴급 알림', desc: 'KOSPI/NASDAQ 지수가 급변할 경우 긴급 브리핑을 전송합니다.' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-stone-50/50 rounded-2xl border border-stone-100">
                  <div>
                    <p className="text-sm font-black text-stone-800">{item.label}</p>
                    <p className="text-[10px] text-stone-400 font-medium">{item.desc}</p>
                  </div>
                  <div className="w-10 h-5 bg-stone-200 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── 보안 및 환경 ─── */}
        <div className="space-y-6">
          <div className="bg-stone-50 p-8 rounded-[2rem] border border-stone-200 shadow-inner">
            <h2 className="text-sm font-black text-stone-800 mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" /> 보안 센터
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-stone-200">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">2단계 인증</p>
                <p className="text-xs font-bold text-stone-900">사용 중 (Google OTP)</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-stone-200">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">최근 접속 IP</p>
                <p className="text-xs font-mono font-bold text-stone-900">172.19.0.1</p>
              </div>
              <button className="w-full py-3 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-100 hover:bg-red-100 transition-all mt-4">
                계정 영구 폐쇄
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm">
            <h2 className="text-sm font-black text-stone-800 mb-6 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-600" /> 언어 설정
            </h2>
            <select className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-600/20 appearance-none">
              <option value="ko">한국어 (HQ Standard)</option>
              <option value="en">English (Global Operations)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
