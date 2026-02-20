import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { ExternalLink, Pin, Brain, MessageSquare, RefreshCw, Loader2, ChevronDown, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
  ai_report: { summary: string; impact: string; advice: string } | null;
}

const CATEGORIES = ['all', 'business', 'technology', 'general'];
const CAT_LABEL: Record<string, string> = {
  all: '전체', business: '비즈니스', technology: '테크', general: '일반',
};

export default function NewsPage() {
  const { user } = useAuthStore();
  const [news,          setNews]          = useState<News[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [fetching,      setFetching]      = useState(false);
  const [category,      setCategory]      = useState('all');
  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [expandedId,    setExpandedId]    = useState<number | null>(null);
  const [aiLoading,     setAiLoading]     = useState<number | null>(null);
  const [showComments,  setShowComments]  = useState<number | null>(null);

  const loadNews = useCallback(async (p = 1, cat = category, q = search) => {
    setLoading(true);
    try {
      const { data } = await api.get('/news', { params: { page: p, limit: 20, category: cat, search: q } });
      setNews(data.data.items);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      console.error('뉴스 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNews(1, category, search); }, [category]);

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
      alert(err.response?.data?.message ?? '수집 실패');
    } finally {
      setFetching(false);
    }
  };

  const handleAiReport = async (id: number) => {
    setAiLoading(id);
    try {
      await new Promise(r => setTimeout(r, 1500)); // UX 딜레이
      const { data } = await api.post(`/news/${id}/ai-report`);
      setNews(prev => prev.map(n => n.id === id ? { ...n, ai_report: data.data } : n));
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'AI 분석 실패');
    } finally {
      setAiLoading(null);
    }
  };

  const handlePin = async (id: number, current: boolean) => {
    await api.put(`/news/${id}/pin`, { isPinned: !current });
    setNews(prev => prev.map(n => n.id === id ? { ...n, is_pinned: !current } : n));
  };

  const canModerate = user?.role === 'admin' || user?.role === 'editor';

  return (
    <div className="space-y-6">
      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">최신 뉴스</h1>
          <p className="text-agora-muted text-sm mt-0.5">실시간으로 수집된 주요 뉴스 정보</p>
        </div>
        {canModerate && (
          <button onClick={handleFetch} disabled={fetching}
            className="btn-primary flex items-center gap-2 text-sm">
            {fetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            뉴스 수집하기
          </button>
        )}
      </div>

      {/* ── 필터 & 검색 ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-agora-surface border border-agora-border rounded-lg p-1">
          {CATEGORIES.map(cat => (
            <button key={cat}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                category === cat ? 'bg-agora-accent text-white' : 'text-agora-muted hover:text-agora-text'
              }`}
              onClick={() => { setCategory(cat); setPage(1); }}>
              {CAT_LABEL[cat]}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-agora-muted" />
            <input className="input pl-9" placeholder="뉴스 검색..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary px-4 text-sm">검색</button>
        </form>
      </div>

      {/* ── 뉴스 목록 ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-agora-muted">
          <Loader2 size={24} className="animate-spin mr-2" />
          로딩 중...
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-20 text-agora-muted">
          <p>뉴스가 없습니다.</p>
          {canModerate && <p className="text-sm mt-1">상단의 &quot;최신 수집&quot; 버튼을 눌러 뉴스를 가져오세요.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {news.map(item => (
            <article key={item.id}
              className={`card card-hover ${item.is_pinned ? 'border-agora-gold/30 bg-agora-gold/5' : ''}`}>
              <div className="flex gap-4">
                {item.image_url && (
                  <img src={item.image_url} alt="" className="w-20 h-16 object-cover rounded-lg flex-shrink-0 hidden sm:block"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1.5">
                    {item.is_pinned && <Pin size={13} className="text-agora-gold flex-shrink-0 mt-0.5" />}
                    <span className={`badge flex-shrink-0 ${
                      item.category === 'business' ? 'bg-green-500/10 text-green-400' :
                      item.category === 'technology' ? 'bg-agora-accent/10 text-agora-accent' :
                      'bg-agora-border text-agora-muted'
                    }`}>{CAT_LABEL[item.category]}</span>
                    <span className="text-xs text-agora-muted">{item.source_name}</span>
                  </div>

                  <h2 className="font-semibold text-sm leading-snug mb-2 line-clamp-2">
                    {item.title}
                  </h2>

                  {expandedId === item.id && item.description && (
                    <p className="text-agora-muted text-sm mb-3 animate-fade-in">{item.description}</p>
                  )}

                  {/* AI 보고서 */}
                  {item.ai_report && expandedId === item.id && (
                    <div className="bg-agora-accent/5 border border-agora-accent/20 rounded-lg p-3 mb-3 space-y-2 animate-fade-in">
                      <p className="text-xs font-semibold text-agora-accent flex items-center gap-1">
                        <Brain size={12} /> AI 전략 분석
                      </p>
                      <div className="space-y-1.5 text-xs text-agora-muted">
                        <p><span className="text-agora-text font-medium">핵심 요약</span> {item.ai_report.summary}</p>
                        <p><span className="text-agora-text font-medium">시장 파급</span> {item.ai_report.impact}</p>
                        <p><span className="text-agora-text font-medium">전략 조언</span> {item.ai_report.advice}</p>
                      </div>
                    </div>
                  )}

                  {/* AI 로딩 바 */}
                  {aiLoading === item.id && (
                    <div className="mb-3">
                      <div className="h-1 bg-agora-border rounded-full overflow-hidden">
                        <div className="h-full bg-agora-accent rounded-full animate-pulse" style={{ width: '70%' }} />
                      </div>
                      <p className="text-xs text-agora-muted mt-1">AI 분석 중...</p>
                    </div>
                  )}

                  {/* 액션 바 */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-agora-muted">
                      {item.published_at && !isNaN(new Date(item.published_at).getTime())
                        ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: ko })
                        : '최근'}
                    </span>
                    <button className="text-xs text-agora-muted hover:text-agora-text flex items-center gap-1 transition-colors"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                      <ChevronDown size={12} className={`transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} />
                      {expandedId === item.id ? '접기' : '자세히'}
                    </button>
                    {!item.ai_report && (
                      <button className="text-xs text-agora-accent hover:text-blue-400 flex items-center gap-1 transition-colors"
                        onClick={() => handleAiReport(item.id)} disabled={aiLoading === item.id}>
                        <Brain size={12} /> AI 분석
                      </button>
                    )}
                    <button className="text-xs text-agora-muted hover:text-agora-text flex items-center gap-1 transition-colors"
                      onClick={() => setShowComments(showComments === item.id ? null : item.id)}>
                      <MessageSquare size={12} /> {item.comment_count}
                    </button>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-agora-muted hover:text-agora-text flex items-center gap-1 transition-colors">
                        <ExternalLink size={12} /> 원문
                      </a>
                    )}
                    {canModerate && (
                      <button className={`text-xs flex items-center gap-1 transition-colors ${item.is_pinned ? 'text-agora-gold' : 'text-agora-muted hover:text-agora-gold'}`}
                        onClick={() => handlePin(item.id, item.is_pinned)}>
                        <Pin size={12} /> {item.is_pinned ? '핀 해제' : '핀'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 댓글 섹션 */}
              {showComments === item.id && (
                <div className="mt-4 pt-4 border-t border-agora-border animate-fade-in">
                  <CommentSection newsId={item.id} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                page === p ? 'bg-agora-accent text-white' : 'bg-agora-surface border border-agora-border text-agora-muted hover:text-agora-text'
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
