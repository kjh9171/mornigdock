import { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, ChevronRight, Newspaper, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface NewsArticle {
  id: number;
  title: string;
  category: string;
  published_at: string;
  description: string;
  urlToImage: string;
  source: string;
  ai_report?: any;
}

export default function News() {
  const [searchQuery, setSearchQuery] = useState('');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  const fetchNews = async () => {
    try {
      const res = await api.get('/news', { params: { search: searchQuery } });
      if (res.data.success && res.data.data.items) {
        setNews(res.data.data.items);
      }
    } catch (err) {
      console.error('Failed to fetch news', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [searchQuery]);

  const handleArticleClick = async (article: NewsArticle) => {
    try {
      const res = await api.get(`/news/${article.id}`);
      if (res.data.success) {
        setSelectedArticle(res.data.data);
      } else {
        setSelectedArticle(article);
      }
    } catch (e) {
      setSelectedArticle(article);
    }
  };

  const generateAIReport = async () => {
    if (!selectedArticle) return;
    setGeneratingAI(true);
    try {
      const res = await api.post(`/news/${selectedArticle.id}/ai-report`);
      if (res.data.success) {
        setSelectedArticle({ ...selectedArticle, ai_report: res.data.data });
        fetchNews();
      }
    } catch (e) {
      alert('AI 리포트 생성에 실패했습니다. (API 연동을 확인하세요)');
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in zoom-in duration-500 relative">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 p-10 text-white mb-12 shadow-2xl shadow-blue-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <Newspaper size={200} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-white/20">
            <TrendingUp size={14} className="text-blue-300" />
            <span>실시간 글로벌 테크 동향</span>
          </div>
          <h1 className="text-5xl font-black mb-4 tracking-tighter shadow-sm">뉴스 모니터링 허브</h1>
          <p className="text-lg text-blue-100 font-medium tracking-tight mb-8">
            최신 보안, 인공지능, 그리고 IT 시장의 핵심 지수를 실시간으로 분석하고 큐레이션하여 제공합니다.
          </p>
          <div className="relative max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="관심 키워드로 인텔리전스 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all font-bold"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.map(article => (
            <div key={article.id} onClick={() => handleArticleClick(article)} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer">
              <div className="aspect-[4/3] overflow-hidden relative">
                <img src={article.urlToImage || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600">
                  {article.category}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                    <span>{article.source || 'AGORA HUB'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(article.published_at || new Date()).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 leading-tight mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 line-clamp-3 mb-4">
                    {article.description}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                  <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${article.ai_report ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    {article.ai_report ? 'AI 리포트 준비완료' : 'AI 리포트 미분석'}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setSelectedArticle(null)} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10 text-slate-600">
              <X size={20} />
            </button>
            <div className="p-10 border-b border-slate-100">
              <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-widest mb-4">
                {selectedArticle.category}
              </div>
              <h2 className="text-3xl font-black text-slate-900 leading-snug mb-4">{selectedArticle.title}</h2>
              <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
                <span className="flex items-center gap-1"><Newspaper size={16} /> {selectedArticle.source || 'AGORA'}</span>
                <span className="flex items-center gap-1"><Clock size={16} /> {new Date(selectedArticle.published_at || new Date()).toLocaleString()}</span>
              </div>
            </div>
            <div className="p-10 bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 mb-4">기사 요약문</h3>
              <p className="text-slate-700 leading-loose mb-8 font-medium">
                {selectedArticle.description || '본문 요약이 존재하지 않습니다.'}
              </p>
              
              <div className="bg-white p-8 rounded-[2rem] border border-blue-100 shadow-xl shadow-blue-500/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-blue-600 flex items-center gap-2">
                    <TrendingUp size={24} /> AGORA Intelligence Report
                  </h3>
                  {!selectedArticle.ai_report && (
                    <button 
                      onClick={generateAIReport} 
                      disabled={generatingAI}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {generatingAI ? <><Loader2 size={14} className="animate-spin" /> 분석 진행중</> : 'AI 정밀 분석 요청'}
                    </button>
                  )}
                </div>
                
                {selectedArticle.ai_report ? (
                  <div className="space-y-6">
                    <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <h4 className="font-black text-blue-800 mb-2 uppercase text-xs tracking-widest">Summary</h4>
                      <p className="text-sm text-blue-900 leading-relaxed font-medium">{selectedArticle.ai_report.summary}</p>
                    </div>
                    <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <h4 className="font-black text-emerald-800 mb-2 uppercase text-xs tracking-widest">Impact</h4>
                      <p className="text-sm text-emerald-900 leading-relaxed font-medium">{selectedArticle.ai_report.impact}</p>
                    </div>
                    <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <h4 className="font-black text-indigo-800 mb-2 uppercase text-xs tracking-widest">Actionable Advice</h4>
                      <p className="text-sm text-indigo-900 leading-relaxed font-medium">{selectedArticle.ai_report.advice}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <p className="text-sm font-bold text-slate-400">아직 AI 분석이 수행되지 않았습니다. 우측 상단의 버튼을 눌러 분석을 시작하세요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
