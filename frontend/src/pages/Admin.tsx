import { Shield, Users, Server, Activity, Database, Settings } from 'lucide-react'; // 관제실(어드민)에 어울리는 시스템 아이콘 채용!

// 관리자 대시보드 내 시스템 지표를 시뮬레이션하기 위한 목업 데이터 인터페이스.
interface SystemMetric {
  id: number; // 각 지표의 고유 식별자.
  label: string; // 지표 이름 (예: CPU 사용량).
  value: string; // 주요 수치.
  icon: any; // Lucide 아이콘 컴포넌트 참조.
  color: string; // Tailwind 색상 클래스를 동적 할당하기 위함.
}

// 4개의 지표 데이터를 배열로 정의하여 화면에 뿌려줍니다.
const metrics: SystemMetric[] = [
  { id: 1, label: '활성 세션', value: '1,248', icon: Users, color: 'text-blue-500 bg-blue-50' },
  { id: 2, label: '서버 응답률', value: '99.9%', icon: Activity, color: 'text-emerald-500 bg-emerald-50' },
  { id: 3, label: '데이터베이스 부하', value: '42%', icon: Database, color: 'text-amber-500 bg-amber-50' },
  { id: 4, label: '보안 차단 건수', value: '87', icon: Shield, color: 'text-rose-500 bg-rose-50' },
];

// 통합 관제실(관리자 전용) 컴포넌트를 정의하고 내보냅니다.
export default function Admin() {
  return (
    // 메인 레이아웃: 넓은 가로폭을 활용하고 살짝 위로 올라오는 페이드인 세팅!
    <div className="p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-5 duration-700">
      
      {/* 상단 타이틀 영역: 관제실의 권위와 위엄을 나타내는 어두운 톤의 장식 가미 */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-slate-900/30">
            <Server className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">통합 관제 센터</h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-[0.3em]">
              System Operations & Security Control
            </p>
          </div>
        </div>
        
        {/* 시스템 설정 버튼: 톱니바퀴 아이콘을 돌어가는 느낌으로 구성했습니다. */}
        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-black text-xs uppercase tracking-widest group">
          <Settings size={16} className="group-hover:rotate-90 transition-transform duration-500" />
          서버 설정
        </button>
      </div>

      {/* 시스템 주요 지표 대시보드 그리드: 4열로 화면을 가득 채웁니다. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {metrics.map((metric) => (
          // 개별 지표 박스: 하얀색 배경에 둥근 라운딩 처리를 해 세련됨을 어필.
          <div key={metric.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
            {/* 동적으로 할당된 색상 유틸리티를 통한 아이콘 박스 */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${metric.color}`}>
              <metric.icon size={24} />
            </div>
            {/* 레이블 및 중요 수치를 강조하는 텍스트 영역 */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{metric.label}</p>
              <h3 className="text-2xl font-black text-slate-800">{metric.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* 모의 터미널/로그 뷰: 해커영화 같은 터미널 창을 모방한 미려한 UI 창입니다. */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        
        {/* 배경에 연한 점무늬 패턴으로 디테일을 살립니다 (CSS 대신 간단히 클래스로 모방) */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            {/* 창 컨트롤 버튼들 (MacOS 스타일 레드/옐로우/그린 도트) */}
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">system_log_stream.sh</span>
          </div>
          
          {/* 가상 로그 텍스트들이 뿌려지는 영역입니다. */}
          <div className="font-mono text-sm leading-8 text-emerald-400 tracking-tight">
            <p><span className="text-slate-500">[2026-02-24 13:45:01]</span> <span className="text-blue-400">INFO</span> - Nginx 1.25 instance started successfully.</p>
            <p><span className="text-slate-500">[2026-02-24 13:45:12]</span> <span className="text-amber-400">WARN</span> - High memory usage detected in container: db_postgres_1 (82%).</p>
            <p><span className="text-slate-500">[2026-02-24 13:46:05]</span> <span className="text-emerald-400">OK</span> - JWT Refresh Token Rotation protocol verified for User#1024.</p>
            <p><span className="text-slate-500">[2026-02-24 13:47:22]</span> <span className="text-rose-400">CRIT</span> - Blocked malformed SQL injection payload from IP 192.168.1.105.</p>
            {/* 깜빡이는 커서 이펙트로 생동감을 불어넣습니다. */}
            <p className="mt-4"><span className="animate-pulse inline-block w-2.5 h-4 bg-emerald-400"></span></p>
          </div>
        </div>
      </div>
      
    </div>
  );
}
