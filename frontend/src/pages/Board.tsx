import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getPostsAPI, Post } from '../lib/api';
import { 
  MessageSquare, Search, PenSquare, 
  ChevronLeft, ChevronRight, Eye, 
  ThumbsUp, Users, Filter, Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const BOARD_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'general', label: '자유토론' },
  { id: 'news_analysis', label: '뉴스분석' },
  { id: 'economy', label: '경제/금융' },
  { id: 'tech', label: '기술/IT' }
];

export default function Board() {
  const { user } = useAuthStore();
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
    const params: any = { page, limit: 15 };
    if (category !== 'all') {
      if (category === 'news_analysis') params.type = 'news';
      else params.category = category;
    }
    if (searchQuery) params.search = searchQuery;

    getPostsAPI(params).then(res => {
      if (res.success) {
        setPosts(res.posts);
        setPagination(res.pagination);
      }
    }).finally(() => setIsLoading(false));
  }, [category, page, searchQuery]);

  const changePage = (p: number) => { setPage(p); window.scrollTo(0, 0); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 min-h-screen">
      {/* ── 헤더 섹션 ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Users size={28} className="stroke-[2.5]" />
            <span className="text-sm font-black uppercase tracking-widest">Agora Community</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">아고라 광장</h1>
          <p className="text-slate-500 mt-2 font-medium">요원들의 자유로운 지능 공유 및 끝장 토론의 장</p>
        </div>
        
        <button 
          onClick={() => navigate('/board/write')} 
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
        >
          <PenSquare size={18} />
          새로운 아젠다 발제
        </button>
      </div>

      {/* ── 필터 및 검색 ── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-10 items-center px-4">
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-200/50 rounded-2xl shrink-0 w-full lg:w-auto">
          {BOARD_CATEGORIES.map(cat => (
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
        
        <div className="relative w-full flex gap-3">
          <div className="relative flex-1">
            <input 
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm" 
              placeholder="토론 주제 또는 요원 이름을 검색하세요..." 
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setSearchQuery(searchInput)}
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button 
            onClick={() => setSearchQuery(searchInput)}
            className="px-8 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-900 transition-all shadow-lg"
          >
            검색
          </button>
        </div>
      </div>

      {/* ── 게시글 리스트 (카드 그리드) ── */}
      {isLoading ? (
        <div className="py-40 text-center">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Agora Decrypting...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 mx-4">
          <p className="text-slate-400 font-bold">아직 발제된 아젠다가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-4">
          {posts.map(post => (
            <div 
              key={post.id} 
              onClick={() => navigate(`/board/${post.id}`)}
              className="group bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm"
            >
              <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                <span className="text-xs font-black text-slate-400 group-hover:text-blue-600">Views</span>
                <span className="text-lg font-black text-slate-700 group-hover:text-blue-700">{post.view_count}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-wider group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    {post.category || 'GENERAL'}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-300 text-[11px] font-bold">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {post.title}
                </h3>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                      {post.author_name?.[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-slate-500">{post.author_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-300 ml-auto md:ml-0">
                    <div className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                      <MessageSquare size={16} />
                      <span className="text-xs font-black">{post.comment_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
                      <ThumbsUp size={16} className={(post.likes_count || 0) > 0 ? 'text-red-500 fill-red-500' : ''} />
                      <span className="text-xs font-black">{post.likes_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <ChevronRight size={24} className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 페이지네이션 ── */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-16 mb-12">
          <button 
            onClick={() => changePage(page - 1)} 
            disabled={page === 1}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-20"
          >
            <ChevronLeft size={20} />
          </button>
          
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p}
              onClick={() => changePage(p)}
              className={`w-12 h-12 rounded-2xl text-sm font-black transition-all ${
                page === p ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110' : 'bg-white border border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {p}
            </button>
          ))}

          <button 
            onClick={() => changePage(page + 1)} 
            disabled={page === pagination.totalPages}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-20"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
