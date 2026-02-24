// React 상태 관리 훅을 가져옵니다. (현재는 사용하지 않음)
import { Activity, ArrowUpRight, ArrowDownRight, DollarSign, BarChart2 } from 'lucide-react'; // 세련된 데이터 표현을 위한 아이콘들입니다.

// 금융 지표 카드의 데이터를 나타내는 인터페이스입니다.
interface FinanceItem {
  id: number; // 각 자산의 식별자입니다.
  symbol: string; // 티커 심볼(예: AAPL)입니다.
  name: string; // 풀네임(예: Apple Inc.)입니다.
  price: string; // 현재 가격 정보입니다.
  change: number; // 변동률을 숫자로 표기하여 양수/음수로 나눕니다.
}

// 목업 데이터 배열: 시장 분석 요약본을 시뮬레이션합니다.
const marketData: FinanceItem[] = [
  { id: 1, symbol: 'NASDAQ', name: '나스닥 종합지수', price: '16,248.52', change: 1.25 }, // 상승한 나스닥 지수
  { id: 2, symbol: 'NVDA', name: 'NVIDIA Corp.', price: '$850.12', change: 3.42 }, // 크게 상승한 엔비디아 주가
  { id: 3, symbol: 'BTC', name: 'Bitcoin', price: '$67,421.00', change: -0.85 }, // 하락세인 비트코인
  { id: 4, symbol: 'TSLA', name: 'Tesla, Inc.', price: '$175.22', change: -2.14 }, // 하락 중인 테슬라 주가
];

// 금융 분석 페이지 컴포넌트를 내보냅니다.
export default function Finance() {
  // 컴포넌트 렌더링 시작.
  return (
    // 최상위 컨테이너: 여백을 넉넉히 두고 부드럽게 등장하는 애니메이션 추가!
    <div className="p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-5 duration-700">
      
      {/* 헤더 부분: 다이내믹한 색상 조합과 아이콘으로 전문성을 보입니다. */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {/* 트렌디한 네온 느낌을 내는 원형 아이콘 배경 */}
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
              <Activity size={24} />
            </div>
            {/* 페이지의 대제목을 설정합니다. */}
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">금융 퀀트 분석</h1>
          </div>
          {/* 하위 설명 텍스트로 보조 정보를 줍니다. */}
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2 pl-14">
            실시간 글로벌 마켓 인덱스 및 자산 동향
          </p>
        </div>
        
        {/* 부수적인 버튼: 데이터 새로고침 액션을 연상시키는 스타일 */}
        <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all">
          리포트 추출
        </button>
      </div>

      {/* 상단의 핵심 지표 카드 4개를 그리드로 표현하여 나열합니다. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* 시장 데이터를 순회하며 금융 카드를 렌더링합니다. */}
        {marketData.map(item => (
          // 호버 시 살짝 떠오르며 테두리가 짙어지는 효과 부여.
          <div key={item.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:border-slate-300 transition-colors flex flex-col justify-between group cursor-default">
            
            {/* 심볼과 변동률 상단 나열 */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest mb-1">{item.name}</span>
                <span className="text-lg font-black text-slate-800">{item.symbol}</span>
              </div>
              
              {/* 변동률 값에 따라 초록색(상승) 혹은 붉은색(하락)으로 동적 적용합니다. */}
              <div className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg ${item.change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {/* 화살표 방향도 값에 따라 분기 처리합니다. */}
                {item.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(item.change)}%
              </div>
            </div>
            
            {/* 현재 가격 정보: 크고 굵게 표시하여 가시성을 극대화합니다. */}
            <div>
              <div className="text-3xl font-black tracking-tighter text-slate-900 group-hover:scale-[1.02] transition-transform origin-left">
                {item.price}
              </div>
            </div>
            
          </div>
        ))}
      </div>

      {/* 하단 넓은 차트 영역 공간 (실제 차트 라이브러리 연동 시 이곳에 구현) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 메인 차트 플레이스홀더: 유려한 그라데이션과 함께 넓은 캔버스 제공 */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-2xl shadow-slate-200/30 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-800">종합 시장 퍼포먼스</h2>
            {/* 차트 필터 등 임시 버튼들 */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button className="px-4 py-1.5 text-xs font-black text-blue-600 bg-white rounded-lg shadow-sm">1D</button>
              <button className="px-4 py-1.5 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors">1W</button>
              <button className="px-4 py-1.5 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors">1M</button>
            </div>
          </div>
          
          {/* 가이드 비주얼: 데이터 시각화를 위한 영역임을 나타내는 점선 박스로 처리 */}
          <div className="flex-1 min-h-[300px] border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            {/* 미려한 차트 아이콘을 배치합니다. */}
            <BarChart2 size={48} className="text-slate-200 mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Interactive Chart Rendering Zone</p>
          </div>
        </div>

        {/* 우측 사이드 패널: 주요 환율이나 추가적인 부가 정보 표시용 */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col">
          <h2 className="text-xl font-black mb-8 flex items-center gap-2">
            <DollarSign className="text-emerald-400" />
            통화 및 환율
          </h2>
          
          {/* 리스트 형태의 환율 데이터들 */}
          <div className="space-y-6 flex-1">
            {/* 개별 아이템: 환율을 보여줍니다. 하단 테두리로 섹션을 구분하여 정돈성을 확보합니다. */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-sm font-bold text-slate-300">USD / KRW</span>
              <span className="text-lg font-black text-emerald-400">1,352.40</span>
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-sm font-bold text-slate-300">EUR / KRW</span>
              <span className="text-lg font-black text-rose-400">1,465.11</span>
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-sm font-bold text-slate-300">JPY (100) / KRW</span>
              <span className="text-lg font-black text-emerald-400">892.35</span>
            </div>
          </div>
          
          <button className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-colors">
            전체 통화 보기
          </button>
        </div>
      </div>
      
    </div>
  );
}
