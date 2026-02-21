import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Pin, Brain, MessageSquare, RefreshCw, Loader2, Search, Sparkles, Eye, User } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import CommentSection from '../components/CommentSection';

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
  view_count?: number;
  ai_report: { summary: string; impact: string; advice: string } | null;
}

const CATEGORIES = ['all', 'business', 'technology', 'general'];

export default function NewsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [news,          setNews]          = useState<News[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [fetching,      setFetching]      = useState(false);
  const [category,      setCategory]      = useState('all');
  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [expandedId,    setExpandedId]    = useState<number | null>(null);

  const loadNews = useCallback(async (p = 1, cat = category, q = search) => {
    setLoading(true);
    try {
      const { data } = await api.get('/news', { params: { page: p, limit: 30, category: cat, search: q } });
      setNews(data.data.items);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      console.error('뉴스 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => { loadNews(1, category, search); }, [category, loadNews, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadNews(1, category, search);
  };

  const handleFetch = async () => {
    setFetching(true);
    try {
      await api.post('/news/fetch');
      await loadNews(1, category, search);
    } catch (err: any) {
      alert('수집 실패');
    } finally {
      setFetching(false);
    }
  };

  const handleAIReport = async (item: News) => {
    try {
      setLoading(true);
      const { data } = await api.post(`/news/${item.id}/ai-report`);
      setNews(prev => prev.map(n => n.id === item.id ? { ...n, ai_report: data.data } : n));
      alert('AI 분석이 완료되었습니다!');
    } catch (err: any) {
      alert('분석 실패: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const canModerate = user?.role === 'admin' || user?.role === 'editor';

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
      {/* ── 상단 타이틀 & 카테고리 ── */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-slate-800">모두의 뉴스</h1>
          <div className="flex gap-1">
            {CATEGORIES.map(cat => (
              <button key={cat}
                className={`px-3 py-1 text-[12px] font-medium rounded-full transition-all ${
                  category === cat ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'
                }`}
                onClick={() => { setCategory(cat); setPage(1); }}>
                {cat === 'all' ? '전체' : cat === 'business' ? '비즈니스' : cat === 'technology' ? '테크' : '일반'}
              </button>
            ))}
          </div>
        </div>
        {canModerate && (
          <button onClick={handleFetch} disabled={fetching}
            className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline">
            {fetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            새 뉴스 수집
          </button>
        )}
      </div>

      {/* ── 검색바 ── */}
      <div className="p-3 border-b border-slate-100 flex justify-end bg-white">
        <form onSubmit={handleSearch} className="flex gap-1">
          <div className="relative">
            <input className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-[13px] outline-none focus:border-blue-400 w-64" 
              placeholder="제목, 내용 검색" value={search}
              onChange={e => setSearch(e.target.value)} />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button type="submit" className="px-4 bg-slate-600 text-white rounded text-[12px] font-bold hover:bg-slate-700 transition-all">검색</button>
        </form>
      </div>

      {/* ── 뉴스 리스트 ── */}
      {loading ? (
        <div className="py-40 text-center">
          <Loader2 size={30} className="animate-spin mx-auto mb-4 text-blue-600" />
          <span className="text-[12px] text-slate-400">첩보 분석 중...</span>
        </div>
      ) : news.length === 0 ? (
        <div className="py-40 text-center text-slate-400 text-[13px]">
          표시할 뉴스가 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {/* 헤더 행 (데스크톱 전용) */}
          <div className="hidden md:flex bg-slate-50 text-[11px] font-bold text-slate-400 py-2 border-b border-slate-200 px-4">
            <div className="w-16">분류</div>
            <div className="flex-1">제목</div>
            <div className="w-24 text-center">출처</div>
            <div className="w-24 text-center">날짜</div>
            <div className="w-16 text-center">조회</div>
          </div>

          {news.map(item => (
            <div key={item.id} className="group">
              <div className={`flex flex-col md:flex-row items-start md:items-center px-4 py-3 hover:bg-blue-50/30 cursor-pointer transition-colors ${item.is_pinned ? 'bg-blue-50/50' : ''}`}
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                
                {/* 분류 */}
                <div className="hidden md:block w-16">
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                     item.category === 'business' ? 'text-emerald-600 bg-emerald-50' :
                     item.category === 'technology' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'
                   }`}>{item.category.toUpperCase()}</span>
                </div>

                {/* 제목 */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    {item.is_pinned && <Pin size={12} className="text-orange-500 shrink-0" fill="currentColor" />}
                    <h2 className="text-[14px] font-medium text-slate-800 truncate group-hover:text-blue-600 group-hover:underline">
                      {item.title}
                    </h2>
                    {item.comment_count > 0 && (
                      <span className="text-[11px] font-bold text-orange-500">[{item.comment_count}]</span>
                    )}
                  </div>
                </div>

                {/* 출처 & 날짜 (모바일) */}
                <div className="md:hidden flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                  <span>{item.source_name}</span>
                  <span>{format(new Date(item.published_at), 'HH:mm')}</span>
                </div>

                {/* 정보 (데스크톱) */}
                <div className="hidden md:block w-24 text-center text-[12px] text-slate-500 truncate">{item.source_name}</div>
                <div className="hidden md:block w-24 text-center text-[12px] text-slate-400">
                  {format(new Date(item.published_at), 'MM-dd')}
                </div>
                <div className="hidden md:block w-16 text-center text-[12px] text-slate-400">{item.view_count || 0}</div>
              </div>

              {/* 확장된 내용 */}
              {expandedId === item.id && (
                <div className="p-6 bg-[#fcfcfc] border-y border-slate-100 animate-fade-in">
                  {item.image_url && (
                    <div className="mb-6 max-w-lg mx-auto border border-slate-100 rounded overflow-hidden">
                       <img src={item.image_url} alt="" className="w-full h-auto" />
                    </div>
                  )}
                  <p className="text-[14px] leading-relaxed text-slate-700 mb-8 whitespace-pre-wrap">{item.description || '내용이 없습니다.'}</p>
                  
                  {/* AI 분석 요약 (클리앙 느낌의 박스) */}
                  {item.ai_report && (
                    <div className="mb-8 border border-blue-100 bg-blue-50/30 rounded p-5">
                      <div className="flex items-center gap-2 mb-3 text-blue-700">
                        <Brain size={16} />
                        <span className="text-[13px] font-bold">CERT AI 통합 분석 리포트</span>
                      </div>
                      <div className="space-y-4 text-[13px]">
                        <div>
                          <p className="font-bold text-slate-600 mb-1">핵심 요약</p>
                          <p className="text-slate-700 leading-relaxed">{item.ai_report.summary}</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                             <p className="font-bold text-emerald-600 mb-1">시장 영향력</p>
                             <p className="text-slate-700">{item.ai_report.impact}</p>
                          </div>
                          <div>
                             <p className="font-bold text-orange-600 mb-1">대응 전략</p>
                             <p className="text-slate-700 font-bold">{item.ai_report.advice}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-4">
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:underline">
                          <ExternalLink size={14} /> 원문 기사 보기
                        </a>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAIReport(item); }}
                        className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-blue-600 transition-colors">
                        <Sparkles size={14} /> AI 분석 요청
                      </button>
                    </div>
                    <div className="text-[12px] text-slate-400">
                       발행일: {format(new Date(item.published_at), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                    </div>
                  </div>

                  <div className="mt-8">
                     <CommentSection newsId={item.id} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 py-10 bg-white">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p}
              className={`min-w-[32px] h-8 px-2 rounded text-[12px] font-medium border transition-all ${
                page === p ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
              }`}
              onClick={() => { setPage(p); loadNews(p, category, search); }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
