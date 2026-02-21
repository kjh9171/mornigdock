import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { getPostsAPI, Post } from '../lib/api';
import { MessageSquare, Search, PenSquare, ChevronLeft, ChevronRight, Eye, ThumbsUp } from 'lucide-react';

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
    const params: Record<string, string | number> = { page, limit: 20 };
    
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
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
      {/* ── 상단 헤더 ── */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">커뮤니티</h2>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {BOARD_CATEGORIES.map(cat => (
              <button 
                key={cat} 
                onClick={() => changeCategory(cat)} 
                className={`px-3 py-1 text-[12px] font-medium rounded-full transition-all whitespace-nowrap ${
                  category === cat 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                {t(cat)}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => navigate('/board/write')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[12px] font-bold transition-all shadow-sm">
          <PenSquare size={14} /> 글쓰기
        </button>
      </div>

      {/* ── 검색바 ── */}
      <div className="p-3 border-b border-slate-100 flex justify-end bg-white">
        <form onSubmit={e => { e.preventDefault(); setSearchQuery(searchInput); }} className="flex gap-1">
          <div className="relative">
            <input 
              value={searchInput} 
              onChange={e => setSearchInput(e.target.value)} 
              placeholder="검색어 입력" 
              className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-[13px] outline-none focus:border-blue-400 w-64" 
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button type="submit" className="px-4 bg-slate-600 text-white rounded text-[12px] font-bold hover:bg-slate-700 transition-all">검색</button>
        </form>
      </div>

      {/* ── 게시판 리스트 ── */}
      <div className="min-h-[500px]">
        {/* 헤더 행 */}
        <div className="hidden md:flex bg-slate-50 text-[11px] font-bold text-slate-500 py-2 border-b border-slate-200 px-4">
          <div className="w-16 text-center">번호</div>
          <div className="w-20 text-center">분류</div>
          <div className="flex-1 text-center">제목</div>
          <div className="w-24 text-center">작성자</div>
          <div className="w-20 text-center">날짜</div>
          <div className="w-16 text-center">조회</div>
          <div className="w-12 text-center">공감</div>
        </div>

        {isLoading ? (
          <div className="py-40 text-center text-slate-400 text-[13px]">데이터를 불러오는 중입니다...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-40 text-center text-slate-400 text-[13px]">등록된 게시글이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPosts.map((post, idx) => (
              <div 
                key={post.id} 
                onClick={() => handlePostClick(post)}
                className="group flex flex-col md:flex-row items-start md:items-center px-4 py-3 hover:bg-blue-50/30 cursor-pointer transition-colors"
              >
                {/* 번호 (모바일 숨김) */}
                <div className="hidden md:block w-16 text-center text-[11px] text-slate-400">
                  {pagination.total - ((page - 1) * 20) - idx}
                </div>

                {/* 분류 */}
                <div className="hidden md:block w-20 text-center">
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{t(post.category ?? 'general')}</span>
                </div>

                {/* 제목 */}
                <div className="flex-1 min-w-0 pr-4 w-full">
                  <div className="flex items-center gap-1.5">
                    {/* 모바일 분류 표시 */}
                    <span className="md:hidden text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mr-1">{t(post.category ?? 'general')}</span>
                    
                    <h3 className="text-[14px] font-medium text-slate-800 truncate group-hover:text-blue-600 group-hover:underline">
                      {post.title}
                    </h3>
                    {(post.comment_count ?? 0) > 0 && (
                      <span className="text-[11px] font-bold text-orange-500 flex items-center gap-0.5">
                        <MessageSquare size={10} fill="currentColor" /> {post.comment_count}
                      </span>
                    )}
                    {post.type === 'news' && <span className="text-[10px] text-blue-600 border border-blue-200 px-1 rounded">NEWS</span>}
                    {/* 모바일 작성자/날짜 */}
                    <div className="md:hidden ml-auto text-[11px] text-slate-400 flex gap-2">
                       <span>{post.author_name}</span>
                       <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* 데스크톱 정보 */}
                <div className="hidden md:block w-24 text-center text-[12px] text-slate-600 truncate px-2">{post.author_name}</div>
                <div className="hidden md:block w-20 text-center text-[11px] text-slate-400">{formatDate(post.created_at)}</div>
                <div className="hidden md:block w-16 text-center text-[11px] text-slate-400">{post.view_count ?? 0}</div>
                <div className="hidden md:block w-12 text-center text-[11px] text-slate-400">0</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 페이지네이션 ── */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 py-8 bg-white border-t border-slate-100">
          <button 
            onClick={() => changePage(page - 1)} 
            disabled={page === 1} 
            className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
            <button 
              key={p} 
              onClick={() => changePage(p)}
              className={`min-w-[32px] h-8 px-2 rounded text-[12px] font-medium border transition-all ${
                page === p 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {p}
            </button>
          ))}

          <button 
            onClick={() => changePage(page + 1)} 
            disabled={page === pagination.totalPages} 
            className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
