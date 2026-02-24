import { ShieldCheck, Mail, LogOut, Key } from 'lucide-react'; // 프로필 시각화를 돕는 아이콘 로드.
import { useAuthStore } from '../store/useAuthStore'; // AuthStore 상태 가져오기.

// 유저 개인 설정 및 정보 확인용 프로필 페이지
export default function Profile() {
  // 전역 상태에서 유저 객체와 로그아웃 함수를 구조분해할당으로 가져옵니다.
  const { user, logout } = useAuthStore();

  return (
    // 페이지 최상단 컨테이너
    <div className="p-8 max-w-4xl mx-auto animate-in slide-in-from-top-5 duration-700">
      
      {/* 프로필 카드 본체: 하얀 배경에 거대한 그림자와 둥근 라운딩 처리로 떠보이는 효과 */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl shadow-blue-500/10">
        
        {/* 프로필 헤더: 좌측 정렬된 아바타와 사용자 기본 정보 */}
        <div className="flex items-center gap-8 mb-12 border-b border-slate-50 pb-10">
          {/* 아바타 원형 컨테이너: 그라데이션 테두리와 내부 텍스트 조합 */}
          <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center p-1 shadow-2xl shadow-blue-500/30">
            <div className="w-full h-full bg-white rounded-[1.8rem] flex items-center justify-center">
              <span className="text-5xl font-black text-blue-600">
                {/* 사용자 이름의 첫 글자를 크게 보여줍니다 */}
                {user?.name?.[0].toUpperCase() ?? 'A'}
              </span>
            </div>
          </div>
          
          <div>
            {/* 사용자명 밑에 배지를 두어 보안 상태나 직책을 표기합니다 */}
            <div className="inline-flex items-center gap-1 px-3 py-1 mb-3 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100">
              <ShieldCheck size={12} />
              보안 인증 계정
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">{user?.name ?? '요원 신원 미상'}</h1>
            {/* 소속이나 직무 표시용 작은 텍스트 */}
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">
              최고 관리자 권한 (Level: {user?.role})
            </p>
          </div>
        </div>

        {/* 상세 프로필 정보 리스트: 메일 정보와 OTP 설정 유무를 확인합니다 */}
        <div className="space-y-6 mb-12">
          {/* 이메일 정보 가로 배치 영역 */}
          <div className="flex items-center gap-6 p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">연락처 식별자</p>
              <p className="text-lg font-bold text-slate-700">{user?.email ?? 'agent@agora.com'}</p>
            </div>
          </div>
          
          {/* OTP 보안 정보 가로 배치 영역 */}
          <div className="flex items-center gap-6 p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
              <Key size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">다중 인증 체계 (MFA)</p>
              <p className="text-lg font-bold text-slate-700">
                {user?.otp_enabled ? '활성화 상태 (보안 등급 최고)' : '비활성 (설정 권장)'}
              </p>
            </div>
          </div>
        </div>

        {/* 하단 제어 버튼: 로그아웃 로직 트리거 */}
        <div className="flex justify-end pt-6 border-t border-slate-50">
          <button 
            onClick={logout} 
            className="flex items-center gap-2 px-6 py-3.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-rose-500/30"
          >
            <LogOut size={16} />
            보안 로그아웃 수행
          </button>
        </div>
        
      </div>
      
    </div>
  );
}
