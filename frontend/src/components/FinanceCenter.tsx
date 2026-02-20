import { useEffect, useState } from 'react';
import { getStocksAPI, StockInfo } from '../lib/api';
import { Globe, TrendingUp, MessageSquare, BarChart3, Coins, Info, ExternalLink, ShieldCheck, Activity, Clock } from 'lucide-react';

const FINANCE_SECTIONS = [
  { id: 'domestic', name: '국내증시', icon: TrendingUp, url: 'https://stock.naver.com/domestic', color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'overseas', name: '해외증시', icon: Globe, url: 'https://stock.naver.com/world', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'discussion', name: '종목토론', icon: MessageSquare, url: 'https://stock.naver.com/investment/discussion/global', color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'indices', name: '시장지표', icon: BarChart3, url: 'https://stock.naver.com/marketindex', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'crypto', name: '가상자산', icon: Coins, url: 'https://stock.naver.com/crypto', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'info', name: '투자정보', icon: Info, url: 'https://stock.naver.com/investment/news/main', color: 'text-stone-600', bg: 'bg-stone-50' },
];

export function FinanceCenter() {
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStocksAPI().then(res => {
      if (res.success) setStocks(res.stocks);
      setLoading(false);
    });
  }, []);

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. 사령부 증시 지휘소 헤더 */}
      <div className="bg-stone-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-stone-800">
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
          <ShieldCheck className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-accent-600 rounded-2xl shadow-lg shadow-accent-600/20">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">NPay Strategic Center</h1>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mt-2">Real-time Market Intelligence Node</p>
            </div>
          </div>
          <p className="text-stone-300 font-medium max-w-2xl leading-relaxed text-lg">
            네이버 NPay 증권의 실시간 전황 데이터를 통합 지휘합니다. <br />
            글로벌 시장 지표와 가상자산 첩보를 바탕으로 최적의 투자 작전을 수립하십시오.
          </p>
        </div>
      </div>

      {/* 2. 실전 데이터 브리핑 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stocks.filter(s => s.symbol === 'KOSPI' || s.symbol === 'NASDAQ').map(stock => (
          <div key={stock.symbol} className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-soft relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{stock.symbol} Analysis</span>
                <h3 className="text-2xl font-black text-primary-950 mt-1">{stock.name} 리포트</h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-full border border-stone-100">
                <Clock className="w-3 h-3 text-stone-400" />
                <span className="text-[10px] font-bold text-stone-500 font-mono">LATEST</span>
              </div>
            </div>
            <p className="text-stone-600 font-medium leading-relaxed italic mb-4">
              "{stock.ai_summary}"
            </p>
            <div className="flex items-center gap-4 pt-4 border-t border-stone-100">
              <span className="text-3xl font-black text-primary-900 tracking-tighter">{Number(stock.price).toLocaleString()}</span>
              <span className={`text-sm font-bold ${stock.change_val >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {stock.change_val >= 0 ? '▲' : '▼'} {Math.abs(stock.change_val).toLocaleString()} ({stock.change_rate}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. 전술 섹션 그리드 - NPay 항목별 직결 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {FINANCE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={section.url}
            target="_blank"
            rel="noreferrer"
            className="group bg-white p-6 rounded-3xl border border-stone-200 shadow-soft hover:shadow-xl hover:border-accent-400 transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center"
          >
            <div className={`p-4 rounded-2xl ${section.bg} ${section.color} group-hover:scale-110 transition-transform mb-4`}>
              <section.icon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-primary-900">{section.name}</h3>
            <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest mt-1">Deploy</p>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3 h-3 text-accent-600" />
            </div>
          </a>
        ))}
      </div>

      {/* 4. 시스템 가동 현황 */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-inner flex justify-center items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">NPay API Bridge: Connected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-accent-500 rounded-full animate-pulse delay-75" />
          <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">AI Analyst: Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150" />
          <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Security: Level 4</span>
        </div>
      </div>
    </div>
  );
}
