import { useEffect, useState } from 'react';
import { getStocksAPI, StockInfo } from '../lib/api';
import { TrendingUp, TrendingDown, Minus, Clock, Bot, RefreshCw, AlertCircle, ExternalLink, Activity, ShieldCheck } from 'lucide-react';

export function StockMarket() {
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const res = await getStocksAPI();
      if (res.success && res.stocks && res.stocks.length > 0) {
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
    const interval = setInterval(fetchStocks, 1000 * 60 * 5); // 5분마다 갱신
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

  // 🔥 [4대 천왕 고정 작전] 데이터가 없더라도 틀은 유지하며 정밀 매칭
  const targetSymbols = ['KOSPI', 'KOSDAQ', 'DJI', 'NASDAQ'];
  const displayStocks = targetSymbols.map(symbol => {
    const found = stocks.find(s => s.symbol === symbol || s.symbol.includes(symbol));
    return found ? {
      ...found,
      price: Number(found.price),
      change_val: Number(found.change_val),
      change_rate: Number(found.change_rate)
    } : { symbol, name: symbol, price: 0, change_val: 0, change_rate: 0, market_status: 'WAITING', ai_summary: '데이터 동기화 대기 중...' };
  });

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 bg-white rounded-3xl border border-stone-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl">
            <Activity className="w-6 h-6 text-emerald-600 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-primary-800 uppercase tracking-tighter leading-none">Global Market Pulse</h2>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Real-time Intelligence Feed</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono font-black bg-stone-50 px-4 py-2 rounded-full border border-stone-100">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            SECURE_SYNC: {lastUpdated || 'FETCHING...'}
          </div>
          <button onClick={fetchStocks} className="p-2.5 hover:bg-stone-50 rounded-full transition-all border border-stone-100 shadow-sm active:scale-95">
            <RefreshCw className={`w-4 h-4 text-stone-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Indices Grid - Always 4 items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStocks.map((stock) => (
          <a 
            key={stock.symbol} 
            href={getNaverStockUrl(stock.symbol)}
            target="_blank"
            rel="noreferrer"
            className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-soft hover:border-accent-400 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
          >
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              <ExternalLink className="w-5 h-5 text-accent-600" />
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-1 block">{stock.symbol}</span>
                <h3 className="text-xl font-black text-primary-900 tracking-tight">{stock.name}</h3>
              </div>
              <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${stock.market_status === 'OPEN' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-stone-50 text-stone-400 border-stone-100'}`}>
                {stock.market_status}
              </span>
            </div>
            
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-black text-primary-950 tracking-tighter">
                {stock.price > 0 ? stock.price.toLocaleString() : '---'}
              </span>
              <div className={`flex items-center text-sm font-black ${getChangeColor(stock.change_val)}`}>
                {getTrendIcon(stock.change_val)}
                {stock.change_val !== 0 ? Math.abs(stock.change_val).toLocaleString() : ''}
              </div>
            </div>
            <div className={`text-sm font-black ${getChangeColor(stock.change_val)}`}>
              {stock.change_val > 0 ? '+' : ''}{stock.change_rate}%
            </div>
          </a>
        ))}
      </div>

      {/* AI Market Summary */}
      {stocks.length > 0 && (
        <div className="bg-stone-900 rounded-[3rem] p-10 border border-stone-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-1000">
            <Bot className="w-48 h-48 text-white" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-accent-600 rounded-2xl shadow-xl shadow-accent-600/20">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-widest leading-none">Market Strategist Outlook</h3>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.3em] mt-2">Vector Intelligence Active</p>
              </div>
              <span className="ml-auto flex items-center gap-2 text-[10px] font-black text-accent-500 animate-pulse bg-accent-500/5 px-4 py-2 rounded-full border border-accent-500/20">
                <AlertCircle className="w-4 h-4" />
                VECTORS_STABLE
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {displayStocks.filter(s => s.symbol === 'KOSPI' || s.symbol === 'NASDAQ').map(s => (
                <div key={s.symbol} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-accent-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)]"></div>
                    <span className="text-xs font-black text-stone-400 uppercase tracking-widest">{s.name} Analysis</span>
                  </div>
                  <p className="text-base text-stone-200 leading-relaxed font-medium italic opacity-90">
                    "{s.ai_summary}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
