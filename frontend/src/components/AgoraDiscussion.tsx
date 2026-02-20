import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLog } from '../utils/activityLogger';
import { useNavigationStore } from '../store/useNavigationStore';
import { getPostsAPI, createPostAPI, Post } from '../lib/api';
import { Loader2, MessageSquare, PenSquare, ArrowLeft, Send, User, Clock, Link as LinkIcon, ChevronRight, Eye, Search, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const BOARD_CATEGORIES = ['전체', '자유', '정보', '질문', '유머', '기타', '뉴스 분석'];

export function AgoraDiscussion() {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const { setView, setSelectedNewsId } = useNavigationStore();
  
  const [internalView, setInternalView] = useState<'list' | 'write'>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [category, setCategory] = useState('전체');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [writeCategory, setWriteCategory] = useState('자유');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      
      if (category === '뉴스 분석') {
        params.type = 'news';
      } else if (category === '전체') {
        params.type = ''; 
      } else {
        params.type = 'board';
        params.category = category;
      }

      const res = await getPostsAPI(params);
      if (res.success) {
        setPosts(res.posts);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('CERT BOARD FETCH ERROR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (internalView === 'list') fetchPosts();
  }, [internalView, category, page]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const res = await createPostAPI({ 
        title, 
        content, 
        type: writeCategory === '뉴스 분석' ? 'news' : 'board', 
        category: writeCategory
      });
      
      if (res.success) {
        logActivity(`Create Agora Post: ${title} (${writeCategory})`);
        setTitle('');
        setContent('');
        setWriteCategory('자유');
        setInternalView('list');
        setPage(1);
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostClick = (post: Post) => {
    logActivity(`Enter Strategic Discussion: ${post.id}`);
    setSelectedNewsId(post.id);
    setView('news-detail'); 
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-primary-950 uppercase tracking-tighter flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-amber-600" />
            Agora Strategic Discussion
          </h2>
          <p className="text-sm text-stone-400 font-bold mt-1 uppercase tracking-widest">Unified Knowledge & Intelligence Exchange</p>
        </div>
        
        {internalView === 'list' && (
          <button 
            onClick={() => setInternalView('write')}
            className="flex items-center gap-2 px-8 py-3.5 bg-stone-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
          >
            <PenSquare className="w-4 h-4" />
            New Insight
          </button>
        )}
        {internalView !== 'list' && (
          <button 
            onClick={() => setInternalView('list')}
            className="flex items-center gap-2 px-8 py-3.5 bg-white text-stone-600 border-2 border-stone-100 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-stone-50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Plaza
          </button>
        )}
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-stone-100 overflow-hidden min-h-[600px]">
        {internalView === 'list' && (
          <>
            <div className="flex border-b border-stone-50 bg-stone-50/30 overflow-x-auto no-scrollbar">
              {BOARD_CATEGORIES.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => { setCategory(cat); setPage(1); }} 
                  className={`px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-4 whitespace-nowrap ${category === cat ? 'border-amber-600 text-amber-600 bg-white' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="divide-y divide-stone-50">
              {loading ? (
                <div className="flex justify-center p-40"><Loader2 className="w-12 h-12 animate-spin text-amber-600" /></div>
              ) : posts.length === 0 ? (
                <div className="text-center p-40">
                  <MessageSquare className="w-20 h-20 text-stone-100 mx-auto mb-6" />
                  <p className="text-stone-400 font-black uppercase tracking-widest">The Plaza is currently silent. Awaiting your insight.</p>
                </div>
              ) : (
                posts.map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => handlePostClick(post)}
                    className="p-8 hover:bg-stone-50/50 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${post.type === 'news' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                          {post.type === 'news' ? 'INTEL' : post.category}
                        </span>
                        <h3 className="font-black text-xl text-primary-900 group-hover:text-amber-600 transition-colors truncate">
                          {post.title}
                        </h3>
                        {(post.comment_count ?? 0) > 0 && (
                          <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {post.comment_count}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-8 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                        <span className="flex items-center gap-2"><User className="w-4 h-4 text-stone-300" /> {post.author_name ?? 'Unknown'}</span>
                        <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-stone-300" /> {new Date(post.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-stone-300" /> {post.view_count ?? 0} Views</span>
                      </div>
                    </div>
                    <ChevronRight className="w-8 h-8 text-stone-200 group-hover:text-amber-600 group-hover:translate-x-2 transition-all ml-8" />
                  </div>
                ))
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="p-8 bg-stone-50/30 border-t border-stone-50 flex justify-center items-center gap-4">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="p-3 rounded-xl bg-white border border-stone-200 text-stone-400 hover:text-amber-600 disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-black text-stone-500 uppercase tracking-widest">
                  Page {page} of {pagination.totalPages}
                </span>
                <button 
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} 
                  disabled={page === pagination.totalPages}
                  className="p-3 rounded-xl bg-white border border-stone-200 text-stone-400 hover:text-amber-600 disabled:opacity-30 transition-all shadow-sm"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}

        {internalView === 'write' && (
          <form onSubmit={handleCreatePost} className="p-12 space-y-10 animate-in slide-in-from-bottom-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] ml-1">Classification</label>
                <select 
                  value={writeCategory} 
                  onChange={e => setWriteCategory(e.target.value)}
                  className="w-full p-6 bg-stone-50 border-2 border-transparent focus:border-amber-600/20 rounded-[1.5rem] outline-none transition-all font-black text-primary-950 text-lg appearance-none"
                >
                  {BOARD_CATEGORIES.filter(c => c !== '전체').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] ml-1">Strategic Topic</label>
                <input 
                  required
                  value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full p-6 bg-stone-50 border-2 border-transparent focus:border-amber-600/20 rounded-[1.5rem] outline-none transition-all font-black text-primary-950 text-lg"
                  placeholder="Define your mission objective..."
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] ml-1">Intelligence Content</label>
              <textarea 
                required
                rows={12}
                value={content} onChange={e => setContent(e.target.value)}
                className="w-full p-10 bg-stone-50 border-2 border-transparent focus:border-amber-600/20 rounded-[2.5rem] outline-none transition-all font-medium text-primary-900 leading-relaxed text-lg resize-none"
                placeholder="Share your detailed tactical analysis..."
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-6 bg-amber-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-2xl shadow-amber-600/30 text-lg"
            >
              Publish Strategic Insight
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
