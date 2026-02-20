import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { getPostsAPI, Post } from '../lib/api';
import { MessageSquare, User, Clock, Eye, Search, PenSquare, ChevronLeft, ChevronRight, FileText, Loader2, Sparkles, MessageCircle } from 'lucide-react';

const BOARD_CATEGORIES = ['all', 'tech', 'economy', 'environment', 'general', 'news_analysis'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '방금';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  if (d.getFullYear() === now.getFullYear()) return `${mm}.${dd}`;
  return `${d.getFullYear()}.${mm}.${dd}`;
}

const CAT_COLORS: Record<string, string> = {
  'general': 'text-stone-500', 
  'economy': 'text-blue-400', 
  'tech': 'text-amber-400',
  'environment': 'text-emerald-400',
  'news_analysis': 'text-purple-400'
};

export default function Board() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    setIsLoading(true);
    const params: Record<string, string | number> = { page, limit: 15 };
    
    if (category === 'news_analysis') {
      params.type = 'news';
    } else if (category === 'all') {
      params.type = ''; 
    } else {
      params.type = 'board';
      params.category = category;
    }

    getPostsAPI(params).then(res => {
      if (res.success) {
        setPosts(res.posts);
        setPagination(res.pagination);
      }
    }).finally(() => setIsLoading(false));
  }, [category, page]);

  const filteredPosts = searchQuery
    ? posts.filter(p => p.title.includes(searchQuery) || (p.author_name ?? '').includes(searchQuery))
    : posts;

  const changePage = (p: number) => { setPage(p); window.scrollTo(0, 0); };
  const changeCategory = (cat: string) => { setCategory(cat); setPage(1); };

  const handlePostClick = (post: Post) => {
    navigate(`/board/${post.id}`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      {/* ── 헤더 ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-agora-gold">
            <MessageCircle size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Communication Protocol</span>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
            {t('discussion_room')}
          </h2>
          <p className="text-xs text-white/30 font-bold uppercase tracking-widest">{t('discussion_subtitle')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-agora-gold transition-colors" />
            <form onSubmit={e => { e.preventDefault(); setSearchQuery(searchInput); }}>
              <input 
                value={searchInput} 
                onChange={e => setSearchInput(e.target.value)} 
                placeholder={t('search_placeholder')} 
                className="pl-12 pr-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest outline-none focus:bg-white/[0.08] focus:border-agora-gold/30 w-full sm:w-64 transition-all shadow-xl" 
              />
            </form>
          </div>
          <button onClick={() => navigate('/board/write')} className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-900/20 active:scale-95">
            <PenSquare className="w-4 h-4" /> {t('new_post')}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2 pb-2">
            {BOARD_CATEGORIES.map(cat => (
              <button 
                key={cat} 
                onClick={() => changeCategory(cat)} 
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 rounded-xl border ${
                  category === cat 
                    ? 'bg-white text-agora-bg border-white shadow-xl scale-[1.05]' 
                    : 'bg-white/5 text-white/30 hover:text-white/60 border-white/5'
                }`}
              >
                {t(cat)}
              </button>
            ))}
        </div>

        {/* 게시글 리스트 */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 text-white/20 animate-pulse">
                <Loader2 size={40} className="animate-spin mb-4 text-agora-gold" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">{t('loading')}</span>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-40 text-center bg-white/5 border border-white/5 rounded-[2.5rem]">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">{t('no_intel')}</p>
            </div>
          ) : (
            filteredPosts.map((post, idx) => {
              const categoryColor = CAT_COLORS[post.category ?? 'general'] || 'text-white/30';
              return (
                <div 
                  key={post.id} 
                  onClick={() => handlePostClick(post)}
                  className={`group relative glass-container p-6 sm:px-10 sm:py-8 rounded-[2rem] border border-white/5 hover:bg-white/[0.05] transition-all duration-500 cursor-pointer overflow-hidden ${post.type === 'news' ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : ''}`}
                >
                  <div className="flex items-center gap-6 sm:gap-10">
                    <div className="hidden sm:flex flex-col items-center justify-center w-12 text-[10px] font-mono font-black text-white/10 uppercase tracking-tighter">
                      <span className="opacity-40">Entry</span>
                      <span className="text-lg opacity-100">{pagination.total - ((page - 1) * 15) - idx}</span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-3">
                        {post.type === 'news' ? (
                          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-widest">
                            <Sparkles className="w-3 h-3" /> INTEL
                          </span>
                        ) : (
                          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full bg-white/5 border border-white/5 tracking-widest ${categoryColor}`}>
                            {t(post.category ?? 'general')}
                          </span>
                        )}
                        <div className="flex items-center gap-3 text-[9px] font-black text-white/20 uppercase tracking-widest">
                            <span className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> {post.author_name ?? 'Unknown'}</span>
                            <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {formatDate(post.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <h3 className={`text-lg sm:text-xl font-black text-white group-hover:text-agora-accent transition-colors duration-300 leading-tight tracking-tight uppercase line-clamp-1`}>
                            {post.title}
                        </h3>
                        {(post.comment_count ?? 0) > 0 && (
                            <div className="flex items-center gap-1 text-agora-gold">
                                <MessageSquare size={14} />
                                <span className="text-xs font-black">{post.comment_count}</span>
                            </div>
                        )}
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                       <div className="flex flex-col items-center gap-1">
                          <Eye size={12} className="text-white/20" />
                          <span className="text-[10px] font-black text-white/40">{post.view_count ?? 0}</span>
                       </div>
                       <ChevronRight size={20} className="text-white/10 group-hover:text-agora-gold group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 pt-10">
          <button 
            onClick={() => changePage(page - 1)} 
            disabled={page === 1} 
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all flex items-center justify-center shadow-xl"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-[10px] font-black text-white uppercase tracking-[0.4em]">
            Sector {page} / {pagination.totalPages}
          </div>
          <button 
            onClick={() => changePage(page + 1)} 
            disabled={page === pagination.totalPages} 
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all flex items-center justify-center shadow-xl"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
