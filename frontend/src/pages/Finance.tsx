import { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, DollarSign, BarChart2, TrendingUp, Newspaper, Brain, RefreshCcw, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';

interface StockData {
  id: number;
  symbol: string;
  name: string;
  price: string | number;
  change_val: string | number;
  change_rate: string | number;
  change_amount?: string;
  market_status: string;
  ai_summary: string;
  updated_at: string;
}

interface FinanceNews {
  id: number;
  title: string;
  description: string;
  source: string;
  source_name: string;
  published_at: string;
  url: string;
  ai_report?: {
    summary: string;
    impact: string;
    advice: string;
  };
}

export default function Finance() {
  const [stocks, setStocks]           = useState<StockData[]>([]);
  const [financeNews, setFinanceNews] = useState<FinanceNews[]>([]);
  const [loading, setLoading]         = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [activeView, setActiveView]   = useState<'summary' | 'news'>('summary');
  const [refreshing, setRefreshing]   = useState(false);

  // ── 주식 지수 데이터 로딩 ────────────────────────────────
  const fetchStocks = async () => {
    try {
      const res = await api.get('/stocks');
      if (res.data.success && res.data.stocks) {
        setStocks(res.data.stocks);
        // 첫 번째 지수 자동 선택
        if (res.data.stocks.length > 0 && !selectedStock) {
          setSelectedStock(res.data.stocks[0]);
        }
      }
    } catch (err) {
      console.error('주식 데이터 로딩 실패', err);
    } finally {
      setLoading(false);
    }
  };

  // ── 금융 뉴스 로딩 ────────────────────────────────────────
  const fetchFinanceNews = async () => {
    setNewsLoading(true);
    try {
      // category=finance로 필터링
      const res = await api.get('/news', { params: { category: 'finance', limit: 10 } });
      if (res.data.success && res.data.data?.items) {
        setFinanceNews(res.data.data.items);
      } else {
        // 금융 뉴스가 없으면 일반 뉴스도 같이 표시
        const fallback = await api.get('/news', { params: { limit: 6 } });
        if (fallback.data.success) setFinanceNews(fallback.data.data.items || []);
      }
    } catch (err) {
      console.error('금융 뉴스 로딩 실패', err);
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    fetchFinanceNews();
  }, []);

  // ── 수동 새로고침 ──────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStocks(), fetchFinanceNews()]);
    setRefreshing(false);
  };

  // 지수를 일반 지수와 요약 정보로 분리
  const mainStocks = stocks.filter(s => s.symbol !== 'MARKET_SUMMARY');
  const marketSummary = stocks.find(s => s.symbol === 'MARKET_SUMMARY');

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-5 duration-700">

      {/* 헤더 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-3 mb-1">
            <Activity className="text-blue-600" size={34} /> 금융 인텔리전스
          </h1>
          <p className="text-sm font-bold text-slate-400">글로벌 마켓 지수 및 AI 퀀트 분석 대시보드</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 새로고침 버튼 */}
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black hover:bg-slate-50 transition-all disabled:opacity-50">
            <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> 새로고침
          </button>
          {/* 뷰 전환 */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveView('summary')}
              className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${activeView === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              지수 뷰
            </button>
            <button onClick={() => setActiveView('news')}
              className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${activeView === 'news' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              뉴스 뷰
            </button>
          </div>
        </div>
      </div>

      {/* ── 지수 카드 (항상 상단에 표시) ─────────────────── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {mainStocks.map(stock => {
            const rate      = Number(stock.change_rate);
            const isUp      = rate >= 0;
            const isSelected = selectedStock?.id === stock.id;

            return (
              <div key={stock.id}
                onClick={() => setSelectedStock(stock)}
                className={`p-5 bg-white rounded-2xl border-2 cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-md
                  ${isSelected ? 'border-blue-400 shadow-blue-100 shadow-xl' : 'border-slate-100 hover:border-slate-300'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-black text-slate-400 mb-0.5">{stock.symbol}</p>
                    <h3 className="text-sm font-black text-slate-700">{stock.name}</h3>
                    <p className="text-xl font-black text-slate-900 tracking-tight mt-1">
                      {Number(stock.price).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className={`p-2 rounded-xl ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isUp ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black
                  ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {isUp ? '+' : ''}{rate.toFixed(2)}%
                  {stock.change_val !== 0 && (
                    <span className="opacity-60 ml-1">
                      ({isUp ? '+' : ''}{Number(stock.change_val).toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {mainStocks.length === 0 && (
            <div className="col-span-4 text-center py-16 text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
              지수 데이터를 로딩 중이거나 아직 수집되지 않았습니다.<br />
              <span className="text-xs mt-2 block">서버가 데이터를 자동으로 수집합니다 (1시간 주기).</span>
            </div>
          )}
        </div>
      )}

      {/* ── 지수 뷰 ────────────────────────────────────────── */}
      {activeView === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI 지수 분석 패널 */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/30">
            <div className="flex items-center gap-3 mb-6">
              <Brain size={22} className="text-blue-500" />
              <h3 className="text-xl font-black text-slate-800">
                AI 시황 분석
                {selectedStock && <span className="text-blue-500 ml-2">— {selectedStock.name}</span>}
              </h3>
            </div>
            {selectedStock?.ai_summary ? (
              <div className="space-y-4">
                <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100">
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">AI 분석 요약</p>
                  <p className="text-sm text-slate-700 leading-loose font-medium">{selectedStock.ai_summary}</p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <Activity size={10} />
                  마지막 업데이트: {new Date(selectedStock.updated_at).toLocaleString('ko-KR')}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="text-center">
                  <BarChart2 size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-black text-slate-400">AI 분석 데이터 로딩 대기 중...</p>
                  <p className="text-[10px] text-slate-300 mt-1">지수 카드를 클릭하여 분석을 확인하세요</p>
                </div>
              </div>
            )}

            {/* AI 종합 시황 요약 */}
            {marketSummary && (
              <div className="mt-6 p-5 bg-slate-900 rounded-2xl text-white">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <TrendingUp size={10} /> 종합 시황 AI 브리핑
                </p>
                <p className="text-sm text-slate-200 leading-loose">{marketSummary.ai_summary}</p>
              </div>
            )}
          </div>

          {/* 환율 정보 */}
          <div className="bg-slate-900 rounded-[2rem] p-7 text-white shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <DollarSign size={140} />
            </div>
            <h3 className="text-lg font-black mb-6 relative z-10 flex items-center gap-2">
              <DollarSign size={18} /> 환율 데일리 브리핑
            </h3>
            {[
              { pair: 'USD / KRW', rate: '1,335.20', change: '+2.40 (0.18%)', up: true },
              { pair: 'EUR / KRW', rate: '1,452.80', change: '-5.10 (0.35%)', up: false },
              { pair: 'JPY / KRW', rate: '889.50',   change: '+1.20 (0.13%)', up: true },
              { pair: 'CNY / KRW', rate: '183.20',   change: '-0.80 (0.44%)', up: false },
            ].map(item => (
              <div key={item.pair} className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{item.pair}</p>
                <div className="flex justify-between items-end">
                  <span className="text-xl font-black text-white">{item.rate}</span>
                  <span className={`text-xs font-black ${item.up ? 'text-emerald-400' : 'text-rose-400'}`}>{item.change}</span>
                </div>
              </div>
            ))}
            <p className="text-[9px] text-slate-600 font-bold mt-3">* 환율 데이터는 참고용이며 실시간 반영 대기 중입니다.</p>
          </div>
        </div>
      )}

      {/* ── 뉴스 뷰 ────────────────────────────────────────── */}
      {activeView === 'news' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Newspaper size={20} className="text-blue-500" />
            <h2 className="text-xl font-black text-slate-800">금융 &amp; 경제 뉴스</h2>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black">{financeNews.length}건</span>
          </div>

          {newsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {financeNews.map(news => (
                <div key={news.id}
                  className="bg-white rounded-2xl border border-slate-100 p-6 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  {/* AI 분석 완료 배지 */}
                  {news.ai_report && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg inline-flex mb-3">
                      <Brain size={10} /> AI 분석 완료
                    </div>
                  )}
                  <h3 className="text-base font-black text-slate-800 leading-snug mb-2 line-clamp-2">{news.title}</h3>
                  {news.description && (
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4">{news.description}</p>
                  )}

                  {/* AI 리포트 미리보기 */}
                  {news.ai_report && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-1">AI 요약</p>
                      <p className="text-xs text-blue-900 font-medium line-clamp-2">{news.ai_report.summary}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">
                      {news.source_name || news.source || 'Finance'} · {new Date(news.published_at).toLocaleDateString('ko-KR')}
                    </span>
                    <a href={news.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors">
                      원문 보기 <ChevronRight size={10} />
                    </a>
                  </div>
                </div>
              ))}
              {financeNews.length === 0 && (
                <div className="col-span-2 text-center py-16 text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Newspaper size={40} className="mx-auto mb-3 opacity-20" />
                  금융 뉴스를 자동 수집 중입니다.<br />
                  <span className="text-xs mt-2 block">뉴스는 1시간마다 자동으로 업데이트됩니다.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
