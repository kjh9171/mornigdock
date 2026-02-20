import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Pin, Brain, MessageSquare, RefreshCw, Loader2, ChevronDown, Search, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
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

export default function NewsPage() {
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();
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
      alert(err.response?.data?.message ?? '수집 실패');
    } finally {
      setFetching(false);
    }
  };

  const handleAiReport = async (id: number) => {
    setAiLoading(id);
    try {
      await new Promise(r => setTimeout(r, 1500)); 
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
  const dateLocale  = i18n.language === 'ko' ? ko : enUS;

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end justify-between border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 text-agora-accent mb-2">
            <Sparkles size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Intelligence Stream</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">{t('news')}</h1>
          <p className="text-white/30 text-xs font-bold mt-2 uppercase tracking-wider">{t('subtitle')}</p>
        </div>
        {canModerate && (
          <button onClick={handleFetch} disabled={fetching}
            className="group px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl active:scale-95">
            {fetching ? <Loader2 size={16} className="animate-spin text-agora-accent" /> : <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
            {fetching ? 'Fetching...' : 'Force Intelligence Update'}
          </button>
        )}
      </div>

      {/* ── 필터 & 검색 ── */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex gap-1 bg-white/5 border border-white/5 rounded-2xl p-1.5 backdrop-blur-xl">
          {CATEGORIES.map(cat => (
            <button key={cat}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                category === cat ? 'bg-white text-agora-bg shadow-xl scale-[1.05]' : 'text-white/30 hover:text-white/60'
              }`}
              onClick={() => { setCategory(cat); setPage(1); }}>
              {t(cat)}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex-1 flex gap-3">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-agora-accent transition-colors" />
            <input className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 focus:border-primary-500/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/10 text-sm" 
              placeholder={t('search')} value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="px-8 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">{t('submit')}</button>
        </form>
      </div>

      {/* ── 뉴스 목록 ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 text-white/20 animate-pulse">
          <Loader2 size={40} className="animate-spin mb-4 text-agora-accent" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">{t('loading')}</span>
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-40 bg-white/5 rounded-[2.5rem] border border-white/5">
          <p className="text-white/20 text-xs font-black uppercase tracking-widest">No Intelligence Found</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {news.map(item => (
            <article key={item.id}
              className={`group glass-container p-6 rounded-[2rem] transition-all duration-500 hover:bg-white/[0.05] border border-white/5 ${item.is_pinned ? 'border-agora-gold/20 bg-agora-gold/[0.02]' : ''}`}>
              <div className="flex flex-col md:flex-row gap-8">
                {item.image_url && (
                  <div className="md:w-48 h-32 flex-shrink-0 overflow-hidden rounded-2xl border border-white/5">
                    <img src={item.image_url} alt="" className="w-full h-full object-cover grayscale brightness-75 transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110 group-hover:brightness-100"
                      onError={e => { (e.target as HTMLDivElement).parentElement!.style.display = 'none'; }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    {item.is_pinned && <div className="p-1.5 bg-agora-gold/10 rounded-lg text-agora-gold"><Pin size={12} fill="currentColor" /></div>}
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      item.category === 'business' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      item.category === 'technology' ? 'bg-agora-accent/10 text-agora-accent border border-agora-accent/20' :
                      'bg-white/5 text-white/40 border border-white/10'
                    }`}>{t(item.category)}</span>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{item.source_name}</span>
                  </div>

                  <h2 className="text-xl font-black text-white hover:text-agora-accent transition-colors duration-300 leading-tight mb-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                    {item.title}
                  </h2>

                  {expandedId === item.id && item.description && (
                    <p className="text-white/50 text-sm leading-relaxed mb-6 animate-in fade-in slide-in-from-top-2 duration-500 border-l-2 border-white/5 pl-4">{item.description}</p>
                  )}

                  {/* AI 보고서 */}
                  {item.ai_report && expandedId === item.id && (
                    <div className="bg-gradient-to-br from-primary-900/40 to-black/40 border border-primary-500/20 rounded-[1.5rem] p-6 mb-6 space-y-4 animate-in zoom-in-95 duration-500">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-agora-accent">
                          <Brain size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('analyze')}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center">
                           <Sparkles size={14} className="text-agora-gold" />
                        </div>
                      </div>
                      <div className="grid gap-4 text-xs">
                        <div className="space-y-1">
                           <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{t('key_points')}</p>
                           <p className="text-white/80 leading-relaxed">{item.ai_report.summary}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{t('market_impact')}</p>
                              <p className="text-emerald-400/80 leading-relaxed">{item.ai_report.impact}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{t('strategic_advice')}</p>
                              <p className="text-agora-gold/80 leading-relaxed font-bold">{item.ai_report.advice}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI 로딩 바 */}
                  {aiLoading === item.id && (
                    <div className="mb-6 p-6 bg-white/5 rounded-2xl border border-white/5 animate-pulse">
                      <div className="flex items-center justify-between mb-3 text-[10px] font-black text-agora-accent uppercase tracking-widest">
                         <span>Generating AI Intelligence...</span>
                         <Brain size={14} className="animate-bounce" />
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-agora-accent rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
                      </div>
                    </div>
                  )}

                  {/* 액션 바 */}
                  <div className="flex items-center gap-6 border-t border-white/5 pt-6">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                      {item.published_at && !isNaN(new Date(item.published_at).getTime())
                        ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: dateLocale })
                        : 'REC.'}
                    </span>
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                      <ChevronDown size={14} className={`transition-transform duration-500 ${expandedId === item.id ? 'rotate-180 text-agora-accent' : ''}`} />
                      {expandedId === item.id ? 'Close' : 'Observe'}
                    </button>
                    {!item.ai_report && (
                      <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-agora-accent hover:text-white transition-all group/ai"
                        onClick={() => handleAiReport(item.id)} disabled={aiLoading === item.id}>
                        <Brain size={14} className="group-hover/ai:rotate-12 transition-transform" />
                        Analyze
                      </button>
                    )}
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                      onClick={() => setShowComments(showComments === item.id ? null : item.id)}>
                      <MessageSquare size={14} className={showComments === item.id ? 'text-agora-accent' : ''} />
                      {item.comment_count}
                    </button>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-agora-accent transition-all">
                        <ExternalLink size={14} /> Source
                      </a>
                    )}
                    {canModerate && (
                      <button className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${item.is_pinned ? 'text-agora-gold' : 'text-white/20 hover:text-agora-gold'}`}
                        onClick={() => handlePin(item.id, item.is_pinned)}>
                        <Pin size={14} fill={item.is_pinned ? 'currentColor' : 'none'} /> {item.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 댓글 섹션 */}
              {showComments === item.id && (
                <div className="mt-8 pt-8 border-t border-white/5 animate-in slide-in-from-top-4 duration-500">
                  <CommentSection newsId={item.id} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-10 border-t border-white/5 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p}
              className={`w-12 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all transform hover:scale-110 active:scale-90 ${
                page === p ? 'bg-white text-agora-bg shadow-2xl scale-125' : 'bg-white/5 border border-white/5 text-white/30 hover:text-white/60'
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
