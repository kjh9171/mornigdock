import { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, ChevronRight, Newspaper, Bookmark } from 'lucide-react';
import { api } from '../lib/api';

interface NewsArticle {
  id: number;
  title: string;
  category: string;
  published_at: string;
  description: string;
  urlToImage: string;
  source: string;
}

export default function News() {
  const [searchQuery, setSearchQuery] = useState('');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await api.get('/news');
        if (res.data.success && res.data.data.items) {
          setNews(res.data.data.items);
        }
      } catch (err) {
        console.error('Failed to fetch news', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const filteredNews = news.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    article.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in zoom-in duration-500">
      
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

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">오늘의 최상위 분석 기사</h2>
        <button className="flex items-center gap-1 text-sm font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors group">
          모아보기 <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredNews.map(article => (
            <div key={article.id} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer">
              <div className="aspect-[4/3] overflow-hidden relative">
                <img src={article.urlToImage || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600">
                  {article.category}
                </div>
                <button className="absolute top-4 right-4 w-8 h-8 bg-white/50 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center text-slate-700 transition-all opacity-0 group-hover:opacity-100">
                  <Bookmark size={14} />
                </button>
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
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">
                    AI 리포트 대기중
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
    </div>
  );
}
