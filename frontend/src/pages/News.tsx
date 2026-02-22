import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Newspaper, RefreshCw, Loader2, Search, 
  ThumbsUp, ThumbsDown, MessageSquare, 
  ChevronRight, Brain, Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface News {
  id: number;
  title: string;
  description: string;
  url: string;
  image_url: string;
  source_name: string;
  category: string;
  is_pinned: boolean;
  published_at: string;
  comment_count: number;
  likes_count: number;
  dislikes_count: number;
  ai_report: { summary: string; impact: string; advice: string } | null;
}

const CATEGORIES = [
  { id: 'all', label: '전체 뉴스' },
  { id: 'general', label: '속보/일반' },
  { id: 'business', label: '경제/금융' },
  { id: 'technology', label: 'IT/기술' }
];

export default function NewsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNews = useCallback(async (p = 1, cat = category, q = search) => {
    setLoading(true);
    try {
      const { data } = await api.get('/news', { params: { page: p, limit: 12, category: cat, search: q } });
      setNews(data.data.items);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      console.error('뉴스 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => { loadNews(1, category, search); }, [category, loadNews, search]);

  const handleFetch = async () => {
    setFetching(true);
    try {
      await api.post('/news/fetch');
      await loadNews(1, category, search);
    } catch (err: any) {
      alert('데이터 동기화 실패');
    } finally {
      setFetching(false);
    }
  };

  const handleReaction = async (e: React.MouseEvent, id: number, reaction: 'like' | 'dislike') => {
    e.stopPropagation();
    if (!user) return alert('로그인이 필요합니다.');
    try {
      const { data } = await api.post(`/news/${id}/reaction`, { reaction });
      setNews(prev => prev.map(n => n.id === id ? { ...n, ...data.data } : n));
    } catch (err: any) {
      console.error('반응 처리 실패:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 min-h-screen bg-slate-50/30 rounded-[3rem]">
      {/* ── 헤더 섹션 ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Newspaper size={28} className="stroke-[2.5]" />
            <span className="text-sm font-black uppercase tracking-widest">Global Intelligence Feed</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">통합 뉴스 리포트</h1>
          <p className="text-slate-500 mt-2 font-medium">연합뉴스, 구글 뉴스 및 AI 분석 기반 실시간 지능 피드</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleFetch} 
            disabled={fetching}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {fetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            최신 데이터 동기화
          </button>
        </div>
      </div>

      {/* ── 필터 및 검색 ── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8 items-center px-4">
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-200/50 rounded-2xl shrink-0 w-full lg:w-auto">
          {CATEGORIES.map(cat => (
            <button key={cat.id}
              onClick={() => { setCategory(cat.id); setPage(1); }}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                category === cat.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        
        <div className="relative w-full">
          <input 
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm" 
            placeholder="뉴스 제목 또는 본문 내용을 검색하세요..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadNews(1, category, search)}
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* ── 뉴스 그리드 ── */}
      {loading ? (
        <div className="py-40 text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-600 opacity-20" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Intelligence Decrypting...</p>
        </div>
      ) : news.length === 0 ? (
        <div className="py-40 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 mx-4">
          <p className="text-slate-400 font-bold">수집된 뉴스 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
          {news.map(item => (
            <div 
              key={item.id} 
              onClick={() => navigate(`/news/${item.id}`)}
              className="group bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer overflow-hidden flex flex-col shadow-sm"
            >
              <div className="p-8 flex-1">
                <div className="flex items-center justify-between mb-5">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${
                    item.category === 'business' || item.category === 'finance' ? 'bg-emerald-50 text-emerald-600' :
                    item.category === 'technology' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                  }`}>
                    {item.category === 'business' || item.category === 'finance' ? 'Finance' : item.category === 'technology' ? 'Tech' : 'General'}
                  </span>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold">
                    <Clock size={12} />
                    {format(new Date(item.published_at), 'MM.dd HH:mm')}
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-slate-800 leading-tight mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {item.title}
                </h3>
                
                <p className="text-slate-500 text-[15px] leading-relaxed line-clamp-3 mb-8 font-medium">
                  {item.description || '본문 요약 정보가 없습니다.'}
                </p>

                <div className="flex items-center gap-3 text-slate-400">
                  <span className="text-xs font-bold italic">{item.source_name}</span>
                  {item.ai_report && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg animate-pulse">
                      <Brain size={14} />
                      <span className="text-[10px] font-black uppercase">AI Analyzed</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={(e) => handleReaction(e, item.id, 'like')}
                    className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <ThumbsUp size={18} className={item.likes_count > 0 ? 'fill-blue-600 text-blue-600' : ''} />
                    <span className="text-sm font-black">{item.likes_count || 0}</span>
                  </button>
                  <button 
                    onClick={(e) => handleReaction(e, item.id, 'dislike')}
                    className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <ThumbsDown size={18} className={item.dislikes_count > 0 ? 'fill-red-500 text-red-500' : ''} />
                    <span className="text-sm font-black">{item.dislikes_count || 0}</span>
                  </button>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MessageSquare size={18} />
                    <span className="text-sm font-black">{item.comment_count || 0}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:border-blue-100 transition-all shadow-sm">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-20 mb-12">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p}
              onClick={() => { setPage(p); loadNews(p, category, search); }}
              className={`w-12 h-12 rounded-2xl text-sm font-black transition-all ${
                page === p ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110' : 'bg-white border border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
