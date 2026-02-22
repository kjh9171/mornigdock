import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStocksAPI, getPostsAPI, StockInfo, Post } from '../lib/api';
import { 
  TrendingUp, TrendingDown, Clock, Bot, 
  RefreshCw, ShieldCheck, FileText, Newspaper, 
  Activity, ChevronRight, Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useActivityLog } from '../utils/activityLogger';

export function StockMarket() {
  const navigate = useNavigate();
  const { logActivity } = useActivityLog();
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [researchNews, setResearchNews] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const stockRes = await getStocksAPI();
      if (stockRes.success) {
        setStocks(stockRes.stocks);
      }

      const newsRes = await getPostsAPI({ type: 'news', limit: 20 });
      if (newsRes.success) {
        setResearchNews(newsRes.posts);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch market intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000 * 60 * 10);
    return () => clearInterval(interval);
  }, []);

  const marketSummary = stocks.find(s => s.symbol === 'MARKET_SUMMARY');

  const handlePostClick = (post: Post) => {
    logActivity(`Read Market Research: ${post.title}`);
    navigate(`/news/${post.id}`);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-20 px-4">
      {/* ── 헤더 섹션 ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Activity size={28} className="animate-pulse" />
            <span className="text-sm font-black uppercase tracking-widest text-blue-600/60">Real-time Market Watch</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">증시 통합 관제소</h2>
          <p className="text-slate-500 mt-2 font-medium">실시간 시장 지표 및 지능형 리서치 리포트</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
            <ShieldCheck size={14} className="text-emerald-500" />
            동기화: {lastUpdated || '데이터 수신 중...'}
          </div>
          <button onClick={fetchData} className="p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-blue-600 rounded-2xl transition-all border border-slate-100 shadow-sm active:scale-95">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 주요 지수 보드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stocks.filter(s => s.symbol !== 'MARKET_SUMMARY').map(stock => (
          <div key={stock.symbol} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{stock.name}</span>
              <div className={`p-1.5 rounded-lg ${stock.change_val > 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                {stock.change_val > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900 tracking-tighter">
                {stock.price.toLocaleString()}
              </div>
              <div className={`text-sm font-black flex items-center gap-1.5 ${stock.change_val > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {stock.change_val > 0 ? '+' : ''}{stock.change_val.toLocaleString()}
                <span className="text-xs opacity-60">({stock.change_rate.toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── AI 증시 요약 ── */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
          <Bot size={200} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Newspaper size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">이시각 통합 시황 요약</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Intelligence Summary by Gemini AI</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-8 md:p-12 border border-white/10 shadow-inner">
            <p className="text-xl md:text-2xl text-slate-100 leading-relaxed font-bold italic tracking-tight">
              "{marketSummary?.ai_summary || '증시 요약 데이터를 정밀 분석 중입니다...'}"
            </p>
            <div className="mt-10 flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest border-t border-white/5 pt-8">
              <span className="flex items-center gap-2"><Clock size={14} /> Analysis Time: {marketSummary?.name.split('(')[1]?.split(')')[0] || '최근'}</span>
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live Analysis Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 리서치 리포트 그리드 ── */}
      <div className="space-y-8 mt-16">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-blue-600 rounded-full" />
            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">통합 리서치 인텔리전스</h3>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Feed v4.0</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center"><Loader2 size={40} className="animate-spin mx-auto text-slate-200" /></div>
          ) : researchNews.length === 0 ? (
            <div className="col-span-full bg-white py-24 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
              <p className="text-slate-300 font-black uppercase tracking-widest text-sm">기록된 리서치 첩보가 없습니다.</p>
            </div>
          ) : (
            researchNews.map((news) => (
              <div 
                key={news.id} 
                onClick={() => handlePostClick(news)}
                className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all cursor-pointer flex items-start gap-6"
              >
                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all text-slate-300">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg">{news.source_name || 'RESEARCH'}</span>
                    <span className="text-[11px] font-bold text-slate-400 font-mono uppercase">{formatDistanceToNow(new Date(news.created_at), { addSuffix: true, locale: ko })}</span>
                  </div>
                  <h4 className="text-xl font-black text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                    {news.title}
                  </h4>
                  <p className="text-sm text-slate-500 mt-3 line-clamp-2 font-medium opacity-80 leading-relaxed">
                    {news.content.substring(0, 100)}...
                  </p>
                  <div className="mt-6 flex items-center text-blue-600 text-[11px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                    상세 리포트 읽기 <ChevronRight size={14} className="ml-1" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
