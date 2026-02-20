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
      const newsRes = await getPostsAPI({ type: 'news', category: '리서치', limit: 5 });
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

      {/* 📝 1. 이시각 증시요약 (Market Summary) */}
      <div className="bg-white rounded-[3.5rem] p-12 border-2 border-stone-100 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12 transition-transform duration-1000 group-hover:rotate-0">
          <Bot className="w-64 h-64 text-stone-900" />
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-stone-900 rounded-[1.5rem] shadow-xl">
              <Newspaper className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-primary-950 uppercase tracking-tight">이시각 증시요약</h3>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Source: Naver Finance HQ</p>
            </div>
          </div>

          <div className="bg-stone-50 rounded-[2.5rem] p-10 border border-stone-100 relative">
            <div className="absolute -top-3 left-10 px-4 py-1 bg-amber-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">Command Intelligence</div>
            <p className="text-xl text-stone-800 leading-relaxed font-bold italic">
              "{marketSummary?.ai_summary || '증시 요약 데이터를 분석 중입니다...'}"
            </p>
            <div className="mt-8 flex items-center justify-between text-[11px] font-black text-stone-400 uppercase tracking-widest border-t border-stone-200 pt-6">
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 기준 시각: {marketSummary?.name.split('(')[1]?.split(')')[0] || '최근'}</span>
              <a href="https://stock.naver.com/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-amber-600 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> NAVER_STOCK_WEB
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 2. 뉴스/리서치 섹션 (News/Research) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <FileText className="w-6 h-6 text-amber-600" />
          <h3 className="text-xl font-black text-primary-950 uppercase tracking-widest">실시간 증시 리서치 뉴스</h3>
          <div className="flex-1 h-[2px] bg-gradient-to-r from-stone-100 to-transparent ml-4"></div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="flex justify-center p-20"><RefreshCw className="w-10 h-10 animate-spin text-stone-200" /></div>
          ) : researchNews.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] text-center border border-stone-100">
              <p className="text-stone-400 font-black uppercase tracking-[0.2em]">수집된 리서치 첩보가 없습니다.</p>
            </div>
          ) : (
            researchNews.map((news) => (
              <div 
                key={news.id} 
                onClick={() => handlePostClick(news)}
                className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-soft hover:shadow-2xl hover:border-amber-200 transition-all duration-300 cursor-pointer group flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full uppercase tracking-tighter border border-amber-100">RESEARCH</span>
                    <span className="text-[10px] font-bold text-stone-300 font-mono uppercase">{new Date(news.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-xl font-black text-primary-900 group-hover:text-amber-600 transition-colors truncate">
                    {news.title}
                  </h4>
                  <p className="text-sm text-stone-500 mt-2 line-clamp-1 font-medium italic opacity-80">
                    {news.content.substring(0, 100)}...
                  </p>
                </div>
                <div className="ml-8 p-4 bg-stone-50 rounded-2xl group-hover:bg-amber-600 transition-all">
                  <ChevronRight className="w-6 h-6 text-stone-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 🚀 전술 링크 센터 */}
      <div className="flex justify-center pt-8">
        <a 
          href="https://stock.naver.com/news" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-3 px-10 py-5 bg-stone-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-stone-200 hover:-translate-y-1"
        >
          <ExternalLink className="w-5 h-5" />
          네이버 증권 리서치 허브 직결
        </a>
      </div>
    </div>
  );
}
