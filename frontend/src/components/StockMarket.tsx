import { useEffect, useState } from 'react';
import { getStocksAPI, StockInfo } from '../lib/api';
import { TrendingUp, TrendingDown, Minus, Clock, Bot, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';

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
      case 'KOSPI': return 'https://m.stock.naver.com/domestic/index/KOSPI/total';
      case 'KOSDAQ': return 'https://m.stock.naver.com/domestic/index/KOSDAQ/total';
      case 'DJI': return 'https://m.stock.naver.com/world/index/.DJI';
      case 'NASDAQ': return 'https://m.stock.naver.com/world/index/.IXIC';
      default: return 'https://m.stock.naver.com/';
    }
  };

  return (
    <div className="w-full space-y-4 mb-8">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <h2 className="text-lg font-bold text-primary-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent-600" />
          Real-time Market Intelligence
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono">
            <Clock className="w-3 h-3" />
            SYNC: {lastUpdated || 'CONNECTING...'}
          </div>
          <button onClick={fetchStocks} className="p-1 hover:bg-stone-100 rounded-full transition-colors">
            <RefreshCw className={`w-3 h-3 text-stone-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Indices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stocks.map((stock) => (
          <a 
            key={stock.symbol} 
            href={getNaverStockUrl(stock.symbol)}
            target="_blank"
            rel="noreferrer"
            className="bg-white rounded-2xl p-5 border border-stone-100 shadow-soft hover:border-accent-400 hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3 h-3 text-accent-600" />
            </div>
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">{stock.symbol}</span>
                <h3 className="text-sm font-bold text-primary-800">{stock.name}</h3>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock.market_status === 'OPEN' ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-500'}`}>
                {stock.market_status}
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xl font-bold text-primary-900 tracking-tight">{Number(stock.price).toLocaleString()}</span>
              <div className={`flex items-center text-xs font-bold ${getChangeColor(stock.change_val)}`}>
                {getTrendIcon(stock.change_val)}
                {Math.abs(stock.change_val).toLocaleString()}
              </div>
            </div>
            <div className={`text-xs font-medium ${getChangeColor(stock.change_val)}`}>
              {stock.change_val > 0 ? '+' : ''}{stock.change_rate}%
            </div>
          </a>
        ))}
      </div>

      {/* AI Market Summary */}
      {stocks.length > 0 && (
        <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <Bot className="w-32 h-32" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-accent-600 rounded-lg">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">AI Market Strategist Briefing</h3>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-accent-500 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                INTELLIGENCE STREAM ACTIVE
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stocks.filter(s => s.symbol === 'KOSPI' || s.symbol === 'NASDAQ').map(s => (
                <div key={s.symbol} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent-500 rounded-full"></span>
                    <span className="text-[10px] font-bold text-stone-500 uppercase">{s.name} Outlook</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed font-light">
                    {s.ai_summary}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-stone-800 flex justify-between items-center">
              <p className="text-[10px] text-stone-500 italic">Analysis synchronized with latest Naver Finance vectors.</p>
              <div className="text-[10px] font-mono text-accent-600 font-bold">SECURITY CLEARANCE: LEVEL 4</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
