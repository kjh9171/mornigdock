import { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, DollarSign, BarChart2 } from 'lucide-react';
import { api } from '../lib/api';

interface StockData {
  id: number;
  symbol: string;
  name: string;
  price: string;
  change_amount: string;
  change_rate: string;
  updated_at: string;
}

export default function Finance() {
  const [metrics, setMetrics] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await api.get('/stocks');
        if (res.data.success && res.data.stocks) {
          setMetrics(res.data.stocks);
        }
      } catch (err) {
        console.error('Failed to fetch stocks', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStocks();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-5 duration-700">
      
      <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2 flex items-center gap-3">
            <Activity className="text-blue-600" size={36} /> 금융 인텔리전스
          </h1>
          <p className="text-sm font-bold text-slate-400 tracking-wider">글로벌 마켓 인덱스 및 AI 퀀트 분석 대시보드</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button className="px-6 py-2.5 rounded-lg bg-white text-blue-600 font-bold shadow-sm text-sm transition-all">요약 뷰</button>
          <button className="px-6 py-2.5 rounded-lg text-slate-500 font-bold hover:text-slate-800 text-sm transition-all">차트 뷰</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {metrics.map((metric) => {
            const isPositive = Number(metric.change_rate) >= 0;
            return (
              <div key={metric.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 hover:-translate-y-1 transition-transform duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-500 mb-1">{metric.name}</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">{metric.price}</p>
                  </div>
                  <div className={`p-2.5 rounded-2xl ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isPositive ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-widest ${isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                  {isPositive ? '+' : ''}{metric.change_rate}% 
                  <span className="opacity-50 mx-1">|</span> 
                  {metric.change_amount}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-2xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">마켓 트렌드 애널리틱스</h3>
            <button className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">상세 보고서</button>
          </div>
          <div className="w-full h-80 rounded-2xl bg-gradient-to-tr from-slate-50 to-slate-100/50 border border-slate-100 border-dashed flex items-center justify-center">
            <div className="text-center">
              <BarChart2 size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-black text-slate-400 tracking-widest uppercase mb-1">Live Charting System</p>
              <p className="text-xs font-medium text-slate-400">데이터 연동 대기중...</p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <DollarSign size={150} />
          </div>
          <h3 className="text-xl font-black tracking-tight mb-8 relative z-10">환율 데일리 브리핑</h3>
          <div className="space-y-6 relative z-10">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                <span>USD / KRW</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-2xl font-black tracking-tight text-white">1,335.20</span>
                <span className="text-sm font-black text-emerald-400">+2.40 (0.18%)</span>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                <span>EUR / KRW</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-2xl font-black tracking-tight text-white">1,452.80</span>
                <span className="text-sm font-black text-rose-400">-5.10 (0.35%)</span>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                <span>JPY / KRW</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-2xl font-black tracking-tight text-white">889.50</span>
                <span className="text-sm font-black text-emerald-400">+1.20 (0.13%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
