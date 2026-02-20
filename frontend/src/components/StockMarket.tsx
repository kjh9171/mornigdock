import { useEffect, useState } from 'react';
import { getStocksAPI, StockInfo } from '../lib/api';
import { TrendingUp, TrendingDown, Minus, Clock, Bot, RefreshCw, AlertCircle, ExternalLink, Activity } from 'lucide-react';

export function StockMarket() {
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const res = await getStocksAPI();
      if (res.success) {
        setStocks(res.stocks);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to fetch stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 1000 * 60 * 10); // 10분마다 갱신
    return () => clearInterval(interval);
  }, []);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-blue-500" />;
    return <Minus className="w-4 h-4 text-stone-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-red-500';
    if (change < 0) return 'text-blue-500';
    return 'text-stone-500';
  };

  const getNaverStockUrl = (symbol: string) => {
    switch (symbol) {
      case 'KOSPI': return 'https://stock.naver.com/domestic';
      case 'KOSDAQ': return 'https://stock.naver.com/domestic';
      case 'DJI': return 'https://stock.naver.com/world';
      case 'NASDAQ': return 'https://stock.naver.com/world';
      default: return 'https://stock.naver.com/';
    }
  };

  // 🔥 [4대 천왕 고정 작전] 무조건 4개의 카드를 보여주기 위한 정렬 및 매칭
  const targetSymbols = ['KOSPI', 'KOSDAQ', 'DJI', 'NASDAQ'];
  const displayStocks = targetSymbols.map(symbol => {
    const found = stocks.find(s => s.symbol === symbol);
    return found || { symbol, name: symbol, price: 0, change_val: 0, change_rate: 0, market_status: 'WAITING', ai_summary: '데이터 수신 대기 중...' };
  });

  return (
    <div className="w-full space-y-4 mb-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <h2 className="text-lg font-black text-primary-800 flex items-center gap-2 uppercase tracking-tighter">
          <Activity className="w-5 h-5 text-accent-600" />
          Real-time Market Pulse
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono font-bold">
            <Clock className="w-3 h-3" />
            LIVE_SYNC: {lastUpdated || 'CONNECTING...'}
          </div>
          <button onClick={fetchStocks} className="p-1.5 hover:bg-stone-100 rounded-full transition-all border border-stone-100">
            <RefreshCw className={`w-3.5 h-3.5 text-stone-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Indices Grid - Always 4 items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStocks.map((stock) => (
          <a 
            key={stock.symbol} 
            href={getNaverStockUrl(stock.symbol)}
            target="_blank"
            rel="noreferrer"
            className="bg-white rounded-[2rem] p-6 border border-stone-200 shadow-soft hover:border-accent-400 hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-4 h-4 text-accent-600" />
            </div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{stock.symbol}</span>
                <h3 className="text-base font-black text-primary-900">{stock.name}</h3>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${stock.market_status === 'OPEN' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-stone-50 text-stone-400 border-stone-100'}`}>
                {stock.market_status}
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-black text-primary-950 tracking-tighter">
                {stock.price > 0 ? Number(stock.price).toLocaleString() : '---'}
              </span>
              <div className={`flex items-center text-xs font-black ${getChangeColor(stock.change_val)}`}>
                {getTrendIcon(stock.change_val)}
                {stock.change_val !== 0 ? Math.abs(stock.change_val).toLocaleString() : ''}
              </div>
            </div>
            <div className={`text-xs font-bold ${getChangeColor(stock.change_val)}`}>
              {stock.change_val > 0 ? '+' : ''}{stock.change_rate}%
            </div>
          </a>
        ))}
      </div>

      {/* AI Market Summary */}
      {stocks.length > 0 && (
        <div className="bg-stone-900 rounded-[2.5rem] p-8 border border-stone-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <Bot className="w-40 h-40 text-white" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-accent-600 rounded-xl shadow-lg shadow-accent-600/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Market Strategist Briefing</h3>
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">Live NPay Intelligence Stream</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-black text-accent-500 animate-pulse bg-accent-500/5 px-3 py-1 rounded-full border border-accent-500/20">
                <AlertCircle className="w-3 h-3" />
                ANALYSIS_SYNC_OK
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {displayStocks.filter(s => s.symbol === 'KOSPI' || s.symbol === 'NASDAQ').map(s => (
                <div key={s.symbol} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                    <span className="text-[11px] font-black text-stone-400 uppercase tracking-tight">{s.name} Outlook</span>
                  </div>
                  <p className="text-sm text-stone-200 leading-relaxed font-medium italic">
                    "{s.ai_summary}"
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-stone-800/50 flex justify-between items-center">
              <p className="text-[10px] text-stone-600 font-bold italic uppercase tracking-tighter">Data sourced from real-time Naver Finance polling.</p>
              <div className="text-[10px] font-mono text-accent-600 font-black tracking-widest bg-accent-600/5 px-3 py-1 rounded-md border border-accent-600/10">SECURITY CLEARANCE: LEVEL 4</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
