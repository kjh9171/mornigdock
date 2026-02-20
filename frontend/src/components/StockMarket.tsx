import { useEffect, useState } from 'react';
import { getStocksAPI, getPostsAPI, StockInfo, Post } from '../lib/api';
import { TrendingUp, TrendingDown, Minus, Clock, Bot, RefreshCw, AlertCircle, ExternalLink, Activity, ShieldCheck, FileText, Newspaper, ChevronRight } from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useActivityLog } from '../utils/activityLogger';

export function StockMarket() {
  const { setView, setSelectedNewsId } = useNavigationStore();
  const { logActivity } = useActivityLog();
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [researchNews, setResearchNews] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. 증시 요약 데이터 (symbol: MARKET_SUMMARY)
      const stockRes = await getStocksAPI();
      if (stockRes.success) {
        setStocks(stockRes.stocks);
      }

      // 2. 뉴스/리서치 데이터 (category: 리서치)
      const newsRes = await getPostsAPI({ type: 'news', category: '리서치', limit: 20 });
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
    const interval = setInterval(fetchData, 1000 * 60 * 10); // 10분마다 갱신
    return () => clearInterval(interval);
  }, []);

  const marketSummary = stocks.find(s => s.symbol === 'MARKET_SUMMARY');

  const handlePostClick = (post: Post) => {
    logActivity(`Read Market Research: ${post.title}`);
    setSelectedNewsId(post.id);
    setView('news-detail');
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-20">
      {/* 📡 사령부 통합 지휘 헤더 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <h2 className="text-4xl font-black text-primary-950 uppercase tracking-tighter flex items-center gap-4">
            <Activity className="w-10 h-10 text-amber-600 animate-pulse" />
            증시 통합 관제소
          </h2>
          <p className="text-sm text-stone-400 font-bold mt-2 uppercase tracking-[0.3em] ml-1">실시간 시장 분석 및 리서치 피드</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono font-black bg-white px-5 py-2.5 rounded-2xl border border-stone-100 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            동기화 상태: {lastUpdated || '데이터 수신 중...'}
          </div>
          <button onClick={fetchData} className="p-3 bg-white hover:bg-stone-50 rounded-2xl transition-all border border-stone-100 shadow-sm active:scale-95 group">
            <RefreshCw className={`w-5 h-5 text-stone-400 group-hover:text-amber-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 📈 실시간 주요 지표 (Indices Board) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
        {stocks.filter(s => s.symbol !== 'MARKET_SUMMARY').map(stock => (
          <div key={stock.symbol} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-soft hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{stock.name}</span>
              {stock.change_val > 0 ? <TrendingUp size={14} className="text-red-500" /> : <TrendingDown size={14} className="text-blue-500" />}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-primary-950">{stock.price.toLocaleString()}</span>
              <span className={`text-[10px] font-bold ${stock.change_val > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {stock.change_val > 0 ? '+' : ''}{stock.change_val.toLocaleString()}
              </span>
            </div>
            <div className={`text-[9px] font-black mt-2 px-2 py-0.5 rounded-full inline-block ${stock.change_val > 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              {stock.change_rate.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      {/* 📝 1. 이시각 증시요약 (Market Summary) */}
      <div className="bg-stone-900 rounded-[3.5rem] p-12 text-white border border-stone-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-10 rotate-12 transition-transform duration-1000 group-hover:rotate-0">
          <Bot className="w-64 h-64 text-white" />
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-600 rounded-[1.5rem] shadow-xl shadow-amber-600/20">
              <Newspaper className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">이시각 증시요약</h3>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mt-1">Source: Naver Finance Intelligence</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-[2.5rem] p-10 border border-white/10 relative backdrop-blur-sm">
            <div className="absolute -top-3 left-10 px-4 py-1 bg-white text-stone-900 text-[10px] font-black rounded-full uppercase tracking-widest">Neural Summary</div>
            <p className="text-xl text-stone-100 leading-relaxed font-bold italic">
              "{marketSummary?.ai_summary || '증시 요약 데이터를 분석 중입니다...'}"
            </p>
            <div className="mt-8 flex items-center justify-between text-[11px] font-black text-stone-500 uppercase tracking-widest border-t border-white/5 pt-6">
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 기준 시각: {marketSummary?.name.split('(')[1]?.split(')')[0] || '최근'}</span>
              <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/20">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live Analysis Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 2. 뉴스/리서치 섹션 (News/Research) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-amber-600" />
            <h3 className="text-xl font-black text-primary-950 uppercase tracking-widest">통합 리서치 인텔리전스</h3>
          </div>
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Strategic Feed v4.0</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center p-20"><RefreshCw className="w-10 h-10 animate-spin text-stone-200" /></div>
          ) : researchNews.length === 0 ? (
            <div className="col-span-full bg-white p-20 rounded-[3rem] text-center border border-stone-100">
              <p className="text-stone-400 font-black uppercase tracking-[0.2em]">수집된 리서치 첩보가 없습니다.</p>
            </div>
          ) : (
            researchNews.map((news) => (
              <div 
                key={news.id} 
                onClick={() => handlePostClick(news)}
                className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-soft hover:shadow-xl hover:border-amber-200 transition-all duration-300 cursor-pointer group flex items-start gap-4"
              >
                <div className="p-4 bg-stone-50 rounded-2xl group-hover:bg-amber-600 transition-all shrink-0">
                  <Activity className="w-5 h-5 text-stone-300 group-hover:text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">{news.source || 'REPORT'}</span>
                    <span className="w-1 h-1 bg-stone-200 rounded-full" />
                    <span className="text-[9px] font-bold text-stone-300 font-mono uppercase">{new Date(news.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-base font-black text-primary-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-tight">
                    {news.title}
                  </h4>
                  <p className="text-xs text-stone-400 mt-2 line-clamp-1 font-medium opacity-70">
                    {news.content.substring(0, 60)}...
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 시스템 최하단 안내 */}
      <div className="pt-10 border-t border-stone-100 text-center">
        <p className="text-[10px] text-stone-300 font-black uppercase tracking-[0.4em]">Integrated Research Hub Monitoring Active</p>
      </div>
    </div>
  );
}
